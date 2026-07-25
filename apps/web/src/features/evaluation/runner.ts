import 'server-only';

import { aggregateEvidence, toSkillBriefs } from '@/features/analysis/aggregator';
import type { SkillRow } from '@/features/analysis/aggregator';
import { PIPELINE_VERSION } from '@/features/analysis/index';
import { mapAssessments } from '@/features/analysis/mapper';
import {
  PROMPT_VERSION,
  SKILL_ASSESSMENT_SYSTEM_PROMPT,
  buildAssessmentUserContent,
} from '@/features/analysis/prompt';
import { buildAssessmentOutputSchema } from '@/features/analysis/types';
import { completeStructured } from '@/lib/ai/client';
import { AiError } from '@/lib/ai/errors';
import { AI_TASKS } from '@/lib/ai/models';

import type {
  CalibrationOutcome,
  CaseResult,
  GoldenCase,
  HallucinatedCitation,
  SkillCitationOutcome,
} from './types';

/**
 * Runs the real assessment pipeline — the same aggregation, prompt, and
 * citation-validation code the production worker calls — against fixture
 * data instead of live database rows.
 *
 * This is the one place in `features/evaluation` that reaches into
 * `features/analysis`'s internal modules rather than its public `index.ts`
 * (CLAUDE.md §4 normally requires the latter). That is deliberate: this
 * feature's entire job is to measure `features/analysis`'s real logic, and
 * testing a reimplementation would defeat the purpose and risk silent drift
 * from production behavior. See the feature README for the full rationale.
 * Nothing in `features/analysis` is modified.
 */

export type CompleteStructuredFn = typeof completeStructured;

export interface RunCaseOptions {
  /** Defaults to the real `completeStructured` — override only for local, non-production self-tests. */
  readonly client?: CompleteStructuredFn;
}

const CONFIDENCE_ORDER = ['preliminary', 'moderate', 'high'] as const;

function calibrationOutcome(
  actual: (typeof CONFIDENCE_ORDER)[number],
  expected: (typeof CONFIDENCE_ORDER)[number],
): CalibrationOutcome {
  const actualRank = CONFIDENCE_ORDER.indexOf(actual);
  const expectedRank = CONFIDENCE_ORDER.indexOf(expected);
  if (actualRank === expectedRank) {
    return 'calibrated';
  }
  return actualRank > expectedRank ? 'overconfident' : 'underconfident';
}

function toFailedResult(goldenCase: GoldenCase, reason: string): CaseResult {
  return {
    caseId: goldenCase.id,
    archetype: goldenCase.archetype,
    passed: false,
    failureReason: reason,
    latencyMs: null,
    usage: null,
    assessedSkillSlugs: [],
    expectedSkillSlugs: goldenCase.expectedSkills.map((s) => s.skillSlug),
    missingSkillSlugs: goldenCase.expectedSkills.map((s) => s.skillSlug),
    extraSkillSlugs: [],
    forbiddenSkillSlugs: [],
    hallucinatedCitations: [],
    skillCitationOutcomes: [],
  };
}

/**
 * Runs one golden case end-to-end: aggregation → prompt → model →
 * hallucination check (on the *raw*, pre-validation output) → the real
 * mapper's citation validation.
 *
 * Hallucination is checked on the raw output specifically because the
 * mapper already strips invalid citations before returning — measuring
 * after that point would always read zero and would tell us nothing about
 * how often the *model* tries to fabricate a source (CLAUDE.md §17.9: this
 * is a property of the model/prompt under test, not of the mapper's
 * guarantee, which is verified separately in `features/analysis`'s own
 * database-level tests).
 */
export async function runCase(
  goldenCase: GoldenCase,
  taxonomy: readonly SkillRow[],
  options: RunCaseOptions = {},
): Promise<CaseResult> {
  const client = options.client ?? completeStructured;

  const input = aggregateEvidence({
    evidence: goldenCase.evidence,
    repositories: goldenCase.repositories,
    skills: toSkillBriefs(taxonomy),
    candidateLogin: goldenCase.candidateLogin,
    repositoriesWithErrors: goldenCase.repositoriesWithErrors ?? 0,
  });

  if (input.skills.length === 0) {
    return toFailedResult(
      goldenCase,
      'Evidence mapped to no assessable skill — nothing was sent to the model.',
    );
  }

  const startedAt = Date.now();
  let completion;
  try {
    completion = await client({
      task: 'skillAssessment',
      systemPrompt: SKILL_ASSESSMENT_SYSTEM_PROMPT,
      userContent: buildAssessmentUserContent(input),
      schema: buildAssessmentOutputSchema(input.skills.map((skill) => skill.slug)),
    });
  } catch (error) {
    const message = error instanceof AiError ? `${error.kind}: ${error.message}` : String(error);
    return toFailedResult(goldenCase, `Model call failed — ${message}`);
  }
  const latencyMs = Date.now() - startedAt;

  // Hallucination check against the FULL citable set, before the mapper
  // strips anything — this is what "fail evaluation otherwise" measures.
  const hallucinatedCitations: HallucinatedCitation[] = [];
  for (const rawAssessment of completion.output.assessments) {
    for (const evidenceId of rawAssessment.evidenceIds) {
      if (!input.citableEvidenceIds.has(evidenceId)) {
        hallucinatedCitations.push({ skillSlug: rawAssessment.skillSlug, evidenceId });
      }
    }
  }

  const { assessments } = mapAssessments(completion.output, input.citableEvidenceIds);

  const assessedSkillSlugs = completion.output.assessments.map((a) => a.skillSlug);
  const expectedSkillSlugs = goldenCase.expectedSkills.map((s) => s.skillSlug);
  const expectedSet = new Set(expectedSkillSlugs);
  const assessedSet = new Set(assessedSkillSlugs);
  const forbiddenSet = new Set(goldenCase.unsupportedSkills ?? []);

  const missingSkillSlugs = expectedSkillSlugs.filter((slug) => !assessedSet.has(slug));
  const extraSkillSlugs = assessedSkillSlugs.filter((slug) => !expectedSet.has(slug));
  const forbiddenSkillSlugs = extraSkillSlugs.filter((slug) => forbiddenSet.has(slug));

  const expectedBySlug = new Map(goldenCase.expectedSkills.map((s) => [s.skillSlug, s]));
  const persistedBySlug = new Map(assessments.map((a) => [a.skillSlug, a]));

  const skillCitationOutcomes: SkillCitationOutcome[] = completion.output.assessments.map((raw) => {
    const expected = expectedBySlug.get(raw.skillSlug) ?? null;
    const persisted = persistedBySlug.get(raw.skillSlug) ?? null;
    const citedIds = [...new Set(raw.evidenceIds)];
    const expectedIds = expected?.expectedEvidenceIds ?? [];
    const expectedIdSet = new Set(expectedIds);

    const truePositives = citedIds.filter((id) => expectedIdSet.has(id)).length;
    const falsePositives = citedIds.length - truePositives;
    const falseNegatives = expectedIds.filter((id) => !citedIds.includes(id)).length;

    const actualConfidence = persisted?.confidence ?? null;
    const expectedConfidence = expected?.expectedConfidenceBand ?? null;

    return {
      skillSlug: raw.skillSlug,
      matchedExpected: expected !== null,
      citedEvidenceIds: citedIds,
      expectedEvidenceIds: expectedIds,
      truePositives,
      falsePositives,
      falseNegatives,
      actualConfidence,
      expectedConfidence,
      calibration:
        actualConfidence !== null && expectedConfidence !== null
          ? calibrationOutcome(actualConfidence, expectedConfidence)
          : null,
    };
  });

  return {
    caseId: goldenCase.id,
    archetype: goldenCase.archetype,
    // The hard gate: a case fails on any raw hallucination, independent of
    // the composite score (CLAUDE.md §17.9 — grounding is a release gate).
    passed: hallucinatedCitations.length === 0,
    failureReason:
      hallucinatedCitations.length === 0
        ? null
        : `${hallucinatedCitations.length} hallucinated citation(s) in raw model output.`,
    latencyMs,
    usage: completion.usage,
    assessedSkillSlugs,
    expectedSkillSlugs,
    missingSkillSlugs,
    extraSkillSlugs,
    forbiddenSkillSlugs,
    hallucinatedCitations,
    skillCitationOutcomes,
  };
}

export interface RunDatasetOptions extends RunCaseOptions {
  /** Restrict the run to specific case ids — useful for local iteration. */
  readonly caseIds?: readonly string[];
}

export interface DatasetRunResult {
  readonly model: string;
  readonly promptVersion: string;
  readonly pipelineVersion: string;
  readonly caseResults: readonly CaseResult[];
}

/** Runs every (or a filtered subset of) golden case sequentially. */
export async function runDataset(
  cases: readonly GoldenCase[],
  taxonomy: readonly SkillRow[],
  options: RunDatasetOptions = {},
): Promise<DatasetRunResult> {
  const selected = options.caseIds
    ? cases.filter((goldenCase) => options.caseIds!.includes(goldenCase.id))
    : cases;

  const caseResults: CaseResult[] = [];
  for (const goldenCase of selected) {
    // Sequential, not `Promise.all`: keeps API concurrency (and cost burst)
    // bounded, and keeps per-case console progress readable.
    caseResults.push(await runCase(goldenCase, taxonomy, options));
  }

  return {
    model: AI_TASKS.skillAssessment.model,
    promptVersion: PROMPT_VERSION,
    pipelineVersion: PIPELINE_VERSION,
    caseResults,
  };
}
