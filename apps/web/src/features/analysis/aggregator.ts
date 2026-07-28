import type { Json } from '@/lib/supabase/types';

import type {
  AssessmentInput,
  DimensionSummary,
  EngineeringDimension,
  EvidenceReference,
  EvidenceSourceType,
  PortfolioSummary,
  SkillBrief,
} from './types';
import { ENGINEERING_DIMENSIONS } from './types';

/**
 * Turns normalized evidence rows into the structured, PII-free summary the
 * model is allowed to see.
 *
 * This module is the reason the LLM never touches GitHub or the database
 * directly. Everything here is pure and synchronous: rows in, summary out.
 * That has three consequences worth stating, because they are the product
 * guarantees rather than implementation details.
 *
 * 1. **Routing is not judgement.** Deciding that a commit touching
 *    `src/foo.test.ts` belongs in the `testing` bucket is a filing decision.
 *    It changes which evidence the model reads under which heading; it never
 *    asserts that the candidate is good at testing. Every judgement is the
 *    model's, and every judgement must cite the underlying evidence id.
 *
 * 2. **Absence stays absent.** A dimension with no evidence is omitted, not
 *    reported as zero — and its skills are never sent for assessment at all,
 *    so the model is never asked to judge something it has nothing on.
 *
 * 3. **Identity is stripped.** Names, GitHub handles, avatars, institutions,
 *    and free-form bodies never enter the payload; authorship survives only
 *    as a boolean (CLAUDE.md §17.10 — the model cannot be biased by data it
 *    never receives).
 */

/** Evidence sample per dimension. Bounded so the prompt stays within budget. */
const MAX_EVIDENCE_PER_DIMENSION = 10;
const MAX_PRIMARY_LANGUAGES = 8;
const MILLISECONDS_PER_DAY = 86_400_000;

/**
 * Which dimensions inform each taxonomy skill.
 *
 * This is the bridge between the two vocabularies: dimensions organize
 * *evidence*, the taxonomy defines what may be *assessed*. Keyed by
 * `skills.slug`, which the database owns — a slug added to the taxonomy
 * without an entry here is simply never assessed, rather than silently
 * assessed against nothing.
 */
const SKILL_DIMENSIONS: Readonly<Record<string, readonly EngineeringDimension[]>> = {
  'api-design': ['architecture', 'documentation'],
  'data-modeling': ['architecture'],
  testing: ['testing'],
  'debugging-problem-solving': ['debugging', 'ownership'],
  'code-quality-readability': ['code_quality'],
  'system-reasoning': ['architecture', 'performance', 'security'],
  'deployment-operability': ['delivery', 'ownership'],
  'version-control-practice': ['code_quality', 'collaboration'],
  'communication-of-reasoning': ['documentation', 'collaboration', 'leadership'],
  'frontend-engineering': ['code_quality', 'architecture'],
  'backend-service-design': ['architecture', 'performance'],
  'database-design': ['architecture', 'performance'],
};

export interface SkillRow {
  readonly slug: string;
  readonly name: string;
  readonly description: string | null;
}

/** Attaches each taxonomy skill to the dimensions that inform it. */
export function toSkillBriefs(skills: readonly SkillRow[]): readonly SkillBrief[] {
  return skills.flatMap((skill) => {
    const dimensions = SKILL_DIMENSIONS[skill.slug];
    return dimensions === undefined
      ? []
      : [{ slug: skill.slug, name: skill.name, description: skill.description, dimensions }];
  });
}

export interface AggregatableEvidence {
  readonly id: string;
  readonly source_type: EvidenceSourceType | null;
  readonly title: string;
  readonly occurred_at: string | null;
  readonly author_login: string | null;
  readonly repository_id: string | null;
  readonly payload: Json;
}

export interface RepositoryContext {
  readonly repositoryId: string;
  readonly fullName: string;
  readonly primaryLanguage: string | null;
}

export interface AggregationContext {
  readonly evidence: readonly AggregatableEvidence[];
  readonly repositories: readonly RepositoryContext[];
  readonly skills: readonly SkillBrief[];
  /** GitHub login of the account being analyzed — used only to derive `authoredByCandidate`. */
  readonly candidateLogin: string | null;
  readonly repositoriesWithErrors: number;
}

/**
 * Which dimensions each evidence kind feeds by default, before any
 * content-based refinement. Structural and stable: a pull request is
 * collaboration and delivery because of what a pull request *is*.
 */
const BASE_DIMENSIONS: Readonly<Record<EvidenceSourceType, readonly EngineeringDimension[]>> = {
  repository: ['architecture', 'documentation', 'ownership'],
  commit: ['code_quality', 'delivery'],
  pull_request: ['collaboration', 'delivery', 'code_quality'],
  review: ['leadership', 'collaboration'],
  issue: ['debugging', 'ownership'],
  release: ['delivery', 'ownership'],
  contributor: ['ownership', 'collaboration'],
};

/**
 * Path- and label-based refinements. File paths are used in preference to
 * commit prose wherever the pipeline captured them: a path is a fact about
 * the change, whereas a commit message is the author's description of it.
 */
const PATH_SIGNALS: readonly {
  readonly pattern: RegExp;
  readonly dimension: EngineeringDimension;
}[] = [
  { pattern: /(^|\/)(tests?|__tests__|spec)\//i, dimension: 'testing' },
  { pattern: /\.(test|spec)\.[a-z]+$/i, dimension: 'testing' },
  { pattern: /(^|\/)docs?\//i, dimension: 'documentation' },
  { pattern: /(readme|contributing|changelog)[^/]*$/i, dimension: 'documentation' },
  { pattern: /(^|\/)(migrations?|schema)\//i, dimension: 'architecture' },
  { pattern: /(dockerfile|docker-compose|\.github\/workflows\/|\.ya?ml$)/i, dimension: 'delivery' },
  { pattern: /(auth|security|permission|crypto)/i, dimension: 'security' },
];

const TEXT_SIGNALS: readonly {
  readonly pattern: RegExp;
  readonly dimension: EngineeringDimension;
}[] = [
  { pattern: /\b(fix|bug|regression|crash|debug|hotfix)\b/i, dimension: 'debugging' },
  { pattern: /\b(perf|performance|optimi[sz]e|latency|cache|index)\b/i, dimension: 'performance' },
  { pattern: /\b(security|vulnerab|auth|xss|csrf|injection)\b/i, dimension: 'security' },
  { pattern: /\b(test|spec|coverage)\b/i, dimension: 'testing' },
  { pattern: /\b(refactor|cleanup|readab)\b/i, dimension: 'code_quality' },
  { pattern: /\b(doc|readme|document)\b/i, dimension: 'documentation' },
];

function asRecord(payload: Json): Readonly<Record<string, Json | undefined>> {
  return payload !== null && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
}

function asStringArray(value: Json | undefined): readonly string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

function asNumberOrNull(value: Json | undefined): number | null {
  return typeof value === 'number' ? value : null;
}

function filePaths(payload: Readonly<Record<string, Json | undefined>>): readonly string[] {
  const files = payload['files'];
  if (!Array.isArray(files)) {
    return [];
  }
  return files.flatMap((file) => {
    const path = asRecord(file as Json)['path'];
    return typeof path === 'string' ? [path] : [];
  });
}

function dimensionsFor(evidence: AggregatableEvidence): readonly EngineeringDimension[] {
  const sourceType = evidence.source_type;
  if (sourceType === null) {
    return [];
  }

  const payload = asRecord(evidence.payload);
  const dimensions = new Set<EngineeringDimension>(BASE_DIMENSIONS[sourceType]);

  for (const path of filePaths(payload)) {
    for (const signal of PATH_SIGNALS) {
      if (signal.pattern.test(path)) {
        dimensions.add(signal.dimension);
      }
    }
  }

  // Title plus labels only — never the free-form body, which is untrusted
  // candidate-supplied content and is not part of the evidence summary.
  const text = [evidence.title, ...asStringArray(payload['labels'])].join(' ');
  for (const signal of TEXT_SIGNALS) {
    if (signal.pattern.test(text)) {
      dimensions.add(signal.dimension);
    }
  }

  return [...dimensions];
}

/** A compact, factual descriptor. Never a measured zero for unfetched data. */
function detailFor(
  sourceType: EvidenceSourceType,
  payload: Readonly<Record<string, Json | undefined>>,
): string | null {
  const additions = asNumberOrNull(payload['additions']);
  const deletions = asNumberOrNull(payload['deletions']);
  const files = asNumberOrNull(payload['filesChanged']) ?? asNumberOrNull(payload['changedFiles']);

  const parts: string[] = [];

  if (additions !== null && deletions !== null) {
    parts.push(`+${additions}/-${deletions}`);
  }
  if (files !== null) {
    parts.push(`${files} file(s)`);
  }

  switch (sourceType) {
    case 'pull_request': {
      const reviews = asNumberOrNull(payload['reviewCount']);
      if (payload['merged'] === true) {
        parts.push('merged');
      }
      if (reviews !== null) {
        parts.push(`${reviews} review(s)`);
      }
      break;
    }
    case 'issue': {
      if (typeof payload['state'] === 'string') {
        parts.push(payload['state']);
      }
      break;
    }
    case 'review': {
      if (typeof payload['state'] === 'string') {
        parts.push(payload['state'].toLowerCase());
      }
      break;
    }
    case 'repository': {
      if (typeof payload['primaryLanguage'] === 'string') {
        parts.push(payload['primaryLanguage']);
      }
      parts.push(asRecord(payload['readme'] ?? null)['excerpt'] ? 'has README' : 'no README');
      break;
    }
    case 'contributor': {
      const commits = asNumberOrNull(payload['commits']);
      if (commits !== null) {
        parts.push(`${commits} commit(s)`);
      }
      break;
    }
    case 'release':
    case 'commit':
      break;
  }

  return parts.length > 0 ? parts.join(', ') : null;
}

function toReference(
  evidence: AggregatableEvidence,
  repositoryName: string,
  candidateLogin: string | null,
): EvidenceReference {
  const sourceType = evidence.source_type;
  return {
    id: evidence.id,
    kind: sourceType ?? 'repository',
    title: evidence.title,
    repository: repositoryName,
    occurredAt: evidence.occurred_at,
    // The handle itself is never forwarded; only whether it matches.
    authoredByCandidate:
      candidateLogin !== null &&
      evidence.author_login !== null &&
      evidence.author_login.toLowerCase() === candidateLogin.toLowerCase(),
    detail: sourceType === null ? null : detailFor(sourceType, asRecord(evidence.payload)),
  };
}

function spanDays(timestamps: readonly string[]): number | null {
  const times = timestamps
    .map((value) => Date.parse(value))
    .filter((value) => Number.isFinite(value));
  if (times.length < 2) {
    return null;
  }
  return Math.round((Math.max(...times) - Math.min(...times)) / MILLISECONDS_PER_DAY);
}

export function aggregateEvidence(context: AggregationContext): AssessmentInput {
  const repositoryNames = new Map(
    context.repositories.map((repository) => [repository.repositoryId, repository.fullName]),
  );

  const buckets = new Map<EngineeringDimension, AggregatableEvidence[]>();
  const citableEvidenceIds = new Set<string>();
  const allTimestamps: string[] = [];

  for (const evidence of context.evidence) {
    const dimensions = dimensionsFor(evidence);
    if (dimensions.length === 0) {
      continue;
    }
    citableEvidenceIds.add(evidence.id);
    if (evidence.occurred_at !== null) {
      allTimestamps.push(evidence.occurred_at);
    }
    for (const dimension of dimensions) {
      const bucket = buckets.get(dimension);
      if (bucket) {
        bucket.push(evidence);
      } else {
        buckets.set(dimension, [evidence]);
      }
    }
  }

  const dimensions: DimensionSummary[] = [];

  for (const dimension of ENGINEERING_DIMENSIONS) {
    const bucket = buckets.get(dimension);
    if (!bucket || bucket.length === 0) {
      continue;
    }

    // Most recent first: recency is the strongest available proxy for what
    // the candidate can do now, and the sample is capped.
    const ordered = [...bucket].sort(
      (left, right) => Date.parse(right.occurred_at ?? '') - Date.parse(left.occurred_at ?? ''),
    );

    const signalCounts: Partial<Record<EvidenceSourceType, number>> = {};
    for (const evidence of bucket) {
      if (evidence.source_type !== null) {
        signalCounts[evidence.source_type] = (signalCounts[evidence.source_type] ?? 0) + 1;
      }
    }

    dimensions.push({
      dimension,
      evidenceCount: bucket.length,
      repositoriesRepresented: new Set(bucket.map((item) => item.repository_id)).size,
      activitySpanDays: spanDays(
        bucket.flatMap((item) => (item.occurred_at === null ? [] : [item.occurred_at])),
      ),
      signalCounts,
      evidence: ordered
        .slice(0, MAX_EVIDENCE_PER_DIMENSION)
        .map((item) =>
          toReference(
            item,
            repositoryNames.get(item.repository_id ?? '') ?? 'unknown repository',
            context.candidateLogin,
          ),
        ),
    });
  }

  const representedDimensions = new Set(dimensions.map((summary) => summary.dimension));

  // A skill with no evidence in any of its dimensions is not sent for
  // assessment at all. Asking the model to judge nothing is exactly the
  // situation that produces invented findings.
  const skills = context.skills.filter((skill) =>
    skill.dimensions.some((dimension) => representedDimensions.has(dimension)),
  );

  const portfolio: PortfolioSummary = {
    repositoryCount: context.repositories.length,
    primaryLanguages: [
      ...new Set(
        context.repositories.flatMap((repository) =>
          repository.primaryLanguage === null ? [] : [repository.primaryLanguage],
        ),
      ),
    ].slice(0, MAX_PRIMARY_LANGUAGES),
    totalEvidenceCount: citableEvidenceIds.size,
    firstActivityAt: allTimestamps.length > 0 ? ([...allTimestamps].sort()[0] ?? null) : null,
    lastActivityAt: allTimestamps.length > 0 ? ([...allTimestamps].sort().at(-1) ?? null) : null,
    repositoriesWithErrors: context.repositoriesWithErrors,
  };

  return { portfolio, dimensions, skills, citableEvidenceIds };
}
