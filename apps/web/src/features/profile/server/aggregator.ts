import type { Json } from '@/lib/supabase/types';

import type {
  CollaborationSection,
  EngineeringTimelineSection,
  EvidenceEntry,
  EvidenceSourceType,
  InterviewSuggestion,
  LanguageAdoptionEvent,
  ReleaseEvent,
  RepositoryHighlight,
  RepositoryOwnership,
  SkillCard,
  TechnologyMapEntry,
  TimelineMonth,
} from '../types';

import type { EvidenceItemRow, RepositoryRow } from './queries';

/**
 * Pure aggregation over already-ingested evidence — Sections 3–7 of the
 * profile (Technology Map, Timeline, Collaboration, Code Ownership,
 * Repository Highlights). No network calls, no Claude, no randomness:
 * every function here is a straight reduction over rows `queries.ts`
 * already fetched, which is what "No AI, only evidence" (the spec's own
 * words for these sections) actually requires in code — there is no
 * code path here that could hallucinate, because nothing here generates
 * anything; it only counts and groups what the pipeline already recorded.
 */

const MAX_HIGHLIGHTED_REPOSITORIES = 6;
const MAX_TECHNOLOGY_ENTRIES = 20;

function asRecord(payload: Json): Readonly<Record<string, Json | undefined>> {
  return payload !== null && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
}

function asString(value: Json | undefined): string | null {
  return typeof value === 'string' ? value : null;
}

function asNumber(value: Json | undefined): number | null {
  return typeof value === 'number' ? value : null;
}

function asBoolean(value: Json | undefined): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function asStringArray(value: Json | undefined): readonly string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

/** A short, factual, non-generated descriptor — never a summary of the evidence, only its recorded structure. */
function detailFor(row: EvidenceItemRow): string | null {
  const payload = asRecord(row.payload);
  const parts: string[] = [];

  switch (row.source_type) {
    case 'commit': {
      const additions = asNumber(payload['additions']);
      const deletions = asNumber(payload['deletions']);
      const files = asNumber(payload['filesChanged']);
      if (additions !== null && deletions !== null) {
        parts.push(`+${additions}/-${deletions}`);
      }
      if (files !== null) {
        parts.push(`${files} file(s)`);
      }
      break;
    }
    case 'pull_request': {
      if (payload['merged'] === true) {
        parts.push('merged');
      }
      const reviewCount = asNumber(payload['reviewCount']);
      if (reviewCount !== null) {
        parts.push(`${reviewCount} review(s)`);
      }
      break;
    }
    case 'review': {
      const state = asString(payload['state']);
      if (state) {
        parts.push(state.toLowerCase().replace(/_/g, ' '));
      }
      break;
    }
    case 'issue': {
      const state = asString(payload['state']);
      if (state) {
        parts.push(state);
      }
      break;
    }
    case 'release': {
      const tag = asString(payload['tag']);
      if (tag) {
        parts.push(tag);
      }
      break;
    }
    case 'repository': {
      const language = asString(payload['primaryLanguage']);
      if (language) {
        parts.push(language);
      }
      break;
    }
    case 'contributor': {
      const commits = asNumber(payload['commits']);
      if (commits !== null) {
        parts.push(`${commits} commit(s)`);
      }
      break;
    }
    case null:
      break;
  }

  return parts.length > 0 ? parts.join(' · ') : null;
}

export function toEvidenceEntry(
  row: EvidenceItemRow,
  repositoriesById: ReadonlyMap<string, RepositoryRow>,
): EvidenceEntry {
  const repository = row.repository_id ? (repositoriesById.get(row.repository_id) ?? null) : null;
  return {
    id: row.id,
    sourceType: row.source_type,
    title: row.title,
    occurredAt: row.occurred_at,
    authorLogin: row.author_login,
    externalUrl: row.external_url,
    repositoryId: row.repository_id,
    repositoryFullName: repository?.full_name ?? null,
    detail: detailFor(row),
    linkDead: row.link_dead_at !== null,
  };
}

/** Section 3 — Technology Map: languages from repository evidence, topics/tools from repository GitHub tags. Pure frequency/recency counting, no inference. */
export function buildTechnologyMap(
  evidence: readonly EvidenceItemRow[],
): readonly TechnologyMapEntry[] {
  interface Accumulator {
    kind: 'language' | 'topic';
    repositoryIds: Set<string>;
    evidenceCount: number;
    lastActivityAt: string | null;
  }
  const byName = new Map<string, Accumulator>();

  function record(
    name: string,
    kind: 'language' | 'topic',
    repositoryId: string | null,
    occurredAt: string | null,
  ) {
    const existing = byName.get(name);
    const lastActivityAt =
      existing?.lastActivityAt && (!occurredAt || existing.lastActivityAt > occurredAt)
        ? existing.lastActivityAt
        : occurredAt;
    const repositoryIds = existing?.repositoryIds ?? new Set<string>();
    if (repositoryId) {
      repositoryIds.add(repositoryId);
    }
    byName.set(name, {
      kind,
      repositoryIds,
      evidenceCount: (existing?.evidenceCount ?? 0) + 1,
      lastActivityAt,
    });
  }

  for (const row of evidence) {
    if (row.source_type !== 'repository') {
      continue;
    }
    const payload = asRecord(row.payload);
    const language = asString(payload['primaryLanguage']);
    if (language) {
      record(language, 'language', row.repository_id, row.occurred_at);
    }
    for (const topic of asStringArray(payload['topics'])) {
      record(topic, 'topic', row.repository_id, row.occurred_at);
    }
  }

  return [...byName.entries()]
    .map(([name, acc]) => ({
      name,
      kind: acc.kind,
      repositoryCount: acc.repositoryIds.size,
      evidenceCount: acc.evidenceCount,
      lastActivityAt: acc.lastActivityAt,
    }))
    .sort((a, b) => b.evidenceCount - a.evidenceCount)
    .slice(0, MAX_TECHNOLOGY_ENTRIES);
}

/** Section 4 — Engineering Timeline: monthly activity buckets plus language-adoption and release milestones. */
export function buildTimeline(
  evidence: readonly EvidenceItemRow[],
  repositoriesById: ReadonlyMap<string, RepositoryRow>,
): EngineeringTimelineSection {
  const monthsByKey = new Map<
    string,
    {
      commit: number;
      pr: number;
      review: number;
      issue: number;
      release: number;
      repos: Set<string>;
    }
  >();
  const languageFirstSeen = new Map<string, LanguageAdoptionEvent>();
  const releases: ReleaseEvent[] = [];

  const dated = [...evidence]
    .filter((row): row is EvidenceItemRow & { occurred_at: string } => row.occurred_at !== null)
    .sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));

  for (const row of dated) {
    const month = row.occurred_at.slice(0, 7);
    const bucket = monthsByKey.get(month) ?? {
      commit: 0,
      pr: 0,
      review: 0,
      issue: 0,
      release: 0,
      repos: new Set<string>(),
    };
    if (row.repository_id) {
      bucket.repos.add(row.repository_id);
    }
    switch (row.source_type) {
      case 'commit':
        bucket.commit += 1;
        break;
      case 'pull_request':
        bucket.pr += 1;
        break;
      case 'review':
        bucket.review += 1;
        break;
      case 'issue':
        bucket.issue += 1;
        break;
      case 'release': {
        bucket.release += 1;
        const repository = row.repository_id ? repositoriesById.get(row.repository_id) : null;
        const tag = asString(asRecord(row.payload)['tag']) ?? row.title;
        releases.push({
          repositoryFullName: repository?.full_name ?? 'unknown repository',
          tag,
          occurredAt: row.occurred_at,
          externalUrl: row.external_url,
        });
        break;
      }
      default:
        break;
    }
    monthsByKey.set(month, bucket);

    if (row.source_type === 'repository') {
      const language = asString(asRecord(row.payload)['primaryLanguage']);
      const repository = row.repository_id ? repositoriesById.get(row.repository_id) : null;
      if (language && !languageFirstSeen.has(language)) {
        languageFirstSeen.set(language, {
          language,
          repositoryFullName: repository?.full_name ?? 'unknown repository',
          firstObservedAt: row.occurred_at,
        });
      }
    }
  }

  const months: TimelineMonth[] = [...monthsByKey.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, bucket]) => ({
      month,
      commitCount: bucket.commit,
      pullRequestCount: bucket.pr,
      reviewCount: bucket.review,
      issueCount: bucket.issue,
      releaseCount: bucket.release,
      activeRepositories: [...bucket.repos],
    }));

  return {
    months,
    languageAdoption: [...languageFirstSeen.values()].sort((a, b) =>
      a.firstObservedAt.localeCompare(b.firstObservedAt),
    ),
    releases: releases.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
  };
}

/** Section 5 — Collaboration: reviews, PR participation, and issue activity, all read directly off evidence authorship. */
export function buildCollaboration(
  evidence: readonly EvidenceItemRow[],
  candidateLogin: string | null,
): CollaborationSection {
  const login = candidateLogin?.toLowerCase() ?? null;
  const isCandidate = (authorLogin: string | null) =>
    login !== null && authorLogin?.toLowerCase() === login;

  let reviewsGiven = 0;
  let pullRequestsOpened = 0;
  let pullRequestsWithReview = 0;
  let issuesOpened = 0;
  let issuesParticipated = 0;
  const repositoriesCollaboratedIn = new Set<string>();

  for (const row of evidence) {
    if (row.source_type === 'review' && isCandidate(row.author_login)) {
      reviewsGiven += 1;
      if (row.repository_id) {
        repositoriesCollaboratedIn.add(row.repository_id);
      }
    }
    if (row.source_type === 'pull_request') {
      const reviewCount = asNumber(asRecord(row.payload)['reviewCount']);
      if (isCandidate(row.author_login)) {
        pullRequestsOpened += 1;
        if (reviewCount !== null && reviewCount > 0) {
          pullRequestsWithReview += 1;
        }
      }
    }
    if (row.source_type === 'issue') {
      if (isCandidate(row.author_login)) {
        issuesOpened += 1;
      }
      issuesParticipated += 1;
    }
  }

  return {
    reviewsGiven,
    pullRequestsOpened,
    pullRequestsWithReview,
    issuesOpened,
    issuesParticipated,
    repositoriesCollaboratedIn: repositoriesCollaboratedIn.size,
  };
}

/**
 * Section 6 — Code Ownership: built from `contributor` evidence (GitHub's
 * own per-repository contribution tally), never from the `commit` evidence
 * sample. Commit evidence is capped by the ingestion pipeline
 * (`MAX_COMMITS`), so computing "share" from it would understate true
 * contribution on active repositories — `contributor` rows carry the whole-
 * repository count directly from GitHub.
 */
export function buildOwnership(
  evidence: readonly EvidenceItemRow[],
  repositoriesById: ReadonlyMap<string, RepositoryRow>,
  candidateLogin: string | null,
): readonly RepositoryOwnership[] {
  const login = candidateLogin?.toLowerCase() ?? null;
  const byRepository = new Map<
    string,
    { candidateCommits: number | null; totalCommits: number; isOwner: boolean; reviews: number }
  >();

  for (const row of evidence) {
    if (row.source_type !== 'contributor' || !row.repository_id) {
      continue;
    }
    const payload = asRecord(row.payload);
    const commits = asNumber(payload['commits']) ?? 0;
    const isRepositoryOwner = asBoolean(payload['isRepositoryOwner']) ?? false;
    const entry = byRepository.get(row.repository_id) ?? {
      candidateCommits: null,
      totalCommits: 0,
      isOwner: false,
      reviews: 0,
    };
    entry.totalCommits += commits;
    entry.isOwner = entry.isOwner || isRepositoryOwner;
    if (login !== null && row.author_login?.toLowerCase() === login) {
      entry.candidateCommits = commits;
    }
    byRepository.set(row.repository_id, entry);
  }

  for (const row of evidence) {
    if (
      row.source_type === 'review' &&
      row.repository_id &&
      login !== null &&
      row.author_login?.toLowerCase() === login
    ) {
      const entry = byRepository.get(row.repository_id);
      if (entry) {
        entry.reviews += 1;
      }
    }
  }

  return [...byRepository.entries()]
    .map(([repositoryId, entry]) => ({
      repositoryId,
      repositoryFullName: repositoriesById.get(repositoryId)?.full_name ?? 'unknown repository',
      isRepositoryOwner: entry.isOwner,
      candidateCommitCount: entry.candidateCommits,
      totalCommitCount: entry.totalCommits > 0 ? entry.totalCommits : null,
      commitShare:
        entry.candidateCommits !== null && entry.totalCommits > 0
          ? entry.candidateCommits / entry.totalCommits
          : null,
      reviewsGiven: entry.reviews,
    }))
    .sort((a, b) => (b.commitShare ?? 0) - (a.commitShare ?? 0));
}

/** Section 7 — Repository Highlights: the most evidenced repositories, with only structurally-sourced description text. */
export function buildRepositoryHighlights(
  evidence: readonly EvidenceItemRow[],
  repositoriesById: ReadonlyMap<string, RepositoryRow>,
): readonly RepositoryHighlight[] {
  interface Accumulator {
    total: number;
    bySourceType: Partial<Record<EvidenceSourceType, number>>;
    topics: Set<string>;
    readmeExcerpt: string | null;
  }
  const byRepository = new Map<string, Accumulator>();

  for (const row of evidence) {
    if (!row.repository_id) {
      continue;
    }
    const acc = byRepository.get(row.repository_id) ?? {
      total: 0,
      bySourceType: {},
      topics: new Set(),
      readmeExcerpt: null,
    };
    acc.total += 1;
    if (row.source_type) {
      acc.bySourceType[row.source_type] = (acc.bySourceType[row.source_type] ?? 0) + 1;
    }
    if (row.source_type === 'repository') {
      const payload = asRecord(row.payload);
      for (const topic of asStringArray(payload['topics'])) {
        acc.topics.add(topic);
      }
      const readme = asRecord(payload['readme'] ?? null);
      acc.readmeExcerpt = asString(readme['excerpt']);
    }
    byRepository.set(row.repository_id, acc);
  }

  return [...byRepository.entries()]
    .map(([repositoryId, acc]) => {
      const repository = repositoriesById.get(repositoryId);
      return {
        repositoryId,
        fullName: repository?.full_name ?? 'unknown repository',
        description: repository?.description ?? null,
        readmeExcerpt: acc.readmeExcerpt,
        primaryLanguage: repository?.primary_language ?? null,
        topics: [...acc.topics],
        externalUrl: repository?.html_url ?? null,
        evidenceCount: acc.total,
        evidenceCountBySourceType: acc.bySourceType,
      };
    })
    .sort((a, b) => b.evidenceCount - a.evidenceCount)
    .slice(0, MAX_HIGHLIGHTED_REPOSITORIES);
}

/** The repository named by the most evidence in a set, or null when the evidence spans no named repository. */
function dominantRepositoryFullName(evidence: readonly EvidenceEntry[]): string | null {
  const counts = new Map<string, number>();
  for (const item of evidence) {
    if (item.repositoryFullName) {
      counts.set(item.repositoryFullName, (counts.get(item.repositoryFullName) ?? 0) + 1);
    }
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [name, count] of counts) {
    if (count > bestCount) {
      best = name;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Interview Guide — one suggestion per (skill, growth area) pair, each
 * carrying the evidence that grounds it. `topic` is exactly the growth-area
 * text `features/analysis` already persisted for that skill — never
 * re-generated or rephrased here, so a suggestion can never exist without
 * the same evidence backing the skill assessment itself.
 */
export function buildInterviewGuide(
  skillCards: readonly SkillCard[],
): readonly InterviewSuggestion[] {
  const suggestions: InterviewSuggestion[] = [];

  for (const card of skillCards) {
    if (card.evidence.length === 0) {
      continue;
    }
    const groundedEvidence = card.evidence as readonly [EvidenceEntry, ...EvidenceEntry[]];
    for (const growthArea of card.growthAreas) {
      suggestions.push({
        skillName: card.skillName,
        topic: growthArea,
        evidence: groundedEvidence,
        repositoryFullName: dominantRepositoryFullName(card.evidence),
      });
    }
  }

  return suggestions.sort((a, b) => b.evidence.length - a.evidence.length);
}
