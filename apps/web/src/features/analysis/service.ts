import 'server-only';

import { completeStructured } from '@/lib/ai/client';
import { AiError } from '@/lib/ai/errors';

import { aggregateEvidence, toSkillBriefs } from './aggregator';
import { lowestConfidence, mapAssessments } from './mapper';
import {
  PROMPT_VERSION,
  SKILL_ASSESSMENT_SYSTEM_PROMPT,
  buildAssessmentUserContent,
} from './prompt';
import {
  countRepositoriesWithErrors,
  getAnalysisContext,
  getCandidateGithubLogin,
  listEvidenceForRepositories,
  listSkills,
  listSnapshotRepositories,
  persistAssessment,
  recordAssessmentError,
} from './queries';
import { buildAssessmentOutputSchema } from './types';
import type { AssessmentResult, ConfidenceLevel } from './types';

/**
 * The Evidence-Based Skill Assessment Engine.
 *
 * The pipeline is: stored evidence → aggregation → LLM interpretation →
 * citation validation → versioned assessments. The ordering is the point.
 *
 * **The model never consumes GitHub, and never consumes database rows.** It
 * receives the aggregator's structured summary and nothing else. That is not
 * a performance choice — it is what makes an assessment explainable months
 * later. GitHub is mutable and eventually unreachable: a repository can be
 * renamed, made private, or deleted, and a re-fetch would then produce a
 * different answer or no answer at all. Normalized evidence is stored,
 * immutable in practice, and addressable by id, so every claim can be traced
 * to the exact row that produced it long after the source has moved on. It
 * also collapses the trust boundary: candidate-supplied text reaches the
 * model only after normalization, in a fixed shape we control.
 *
 * **Failure never destroys evidence.** If the model refuses, times out, or
 * returns something that does not validate, the analysis is marked `failed`
 * and the ingested evidence stays exactly where it is. Re-running assessment
 * is then cheap and safe — it re-reads the same evidence and appends a new
 * assessment version rather than mutating the old one.
 */

export const PIPELINE_VERSION = 'assessment-v1';

function isRetryable(error: unknown): boolean {
  return error instanceof AiError ? error.retryable : false;
}

function kindOf(error: unknown): string {
  return error instanceof AiError ? error.kind : 'unknown';
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'The assessment failed unexpectedly.';
}

async function failRun(
  analysisId: string,
  kind: string,
  operatorMessage: string,
  userMessage: string,
  retryable: boolean,
): Promise<AssessmentResult> {
  try {
    await recordAssessmentError(analysisId, kind, operatorMessage, retryable);
  } catch {
    // Losing the diagnostic record must not lose the terminal state.
    console.error('[analysis] could not persist assessment error record');
  }

  return {
    outcome: 'failure',
    failure: {
      kind,
      message: userMessage,
      retryable,
      pipelineVersion: PIPELINE_VERSION,
      promptVersion: PROMPT_VERSION,
    },
  };
}

/**
 * `checkpoint` is called once, before the paid Claude call — a plain
 * function type, not imported from `features/pipeline` (this feature
 * depends on nothing there, CLAUDE.md §4). Returning `{outcome:
 * 'cancelled'}` here is deliberately the *only* checkpoint in this stage:
 * once the model call starts, letting it run to completion and persisting
 * normally is cheaper and safer than trying to abort mid-persist.
 */
export async function runSkillAssessment(
  analysisId: string,
  checkpoint: () => Promise<'continue' | 'stop'>,
): Promise<AssessmentResult> {
  const analysis = await getAnalysisContext(analysisId);

  if (!analysis) {
    throw new Error(`Analysis ${analysisId} not found`);
  }
  if (analysis.status === 'queued') {
    // Nothing has been ingested yet; assessing now would assess an empty
    // portfolio and record that as a finding.
    throw new Error(`Analysis ${analysisId} has not completed evidence ingestion`);
  }

  const repositories = await listSnapshotRepositories(analysisId);
  const evidence = await listEvidenceForRepositories(
    repositories.map((repository) => repository.repositoryId),
  );

  if (evidence.length === 0) {
    return failRun(
      analysisId,
      'no_evidence',
      'No normalized evidence exists for this analysis; nothing to assess.',
      'We could not find enough of your work to assess. Try running the analysis again once your repositories are reachable.',
      true,
    );
  }

  const [skills, candidateLogin, repositoriesWithErrors] = await Promise.all([
    listSkills(),
    getCandidateGithubLogin(analysis.profile_id),
    countRepositoriesWithErrors(analysisId),
  ]);

  const input = aggregateEvidence({
    evidence,
    repositories,
    skills: toSkillBriefs(skills),
    candidateLogin,
    repositoriesWithErrors,
  });

  if (input.skills.length === 0) {
    return failRun(
      analysisId,
      'no_assessable_skills',
      'Evidence exists but maps to no assessable skill in the taxonomy.',
      'We could not match your work to any of the skills we assess yet.',
      false,
    );
  }

  if ((await checkpoint()) === 'stop') {
    return { outcome: 'cancelled' };
  }

  let completion;
  try {
    completion = await completeStructured({
      task: 'skillAssessment',
      systemPrompt: SKILL_ASSESSMENT_SYSTEM_PROMPT,
      userContent: buildAssessmentUserContent(input),
      schema: buildAssessmentOutputSchema(input.skills.map((skill) => skill.slug)),
    });
  } catch (error) {
    // Evidence is untouched and remains available for a later attempt.
    return failRun(
      analysisId,
      kindOf(error),
      messageOf(error),
      'We could not finish assessing your work. Your analyzed evidence is saved — try again shortly.',
      isRetryable(error),
    );
  }

  const { assessments, rejected } = mapAssessments(completion.output, input.citableEvidenceIds);

  for (const rejection of rejected) {
    // Hallucinated or duplicated citations are a product-integrity event, not
    // a silent drop (CLAUDE.md §20.3 — `warn` covers integrity flags).
    await recordAssessmentError(
      analysisId,
      'unverifiable_citation',
      `Rejected assessment for "${rejection.skillSlug}": ${rejection.reason}`,
      false,
    ).catch(() => undefined);
  }

  if (assessments.length === 0) {
    return failRun(
      analysisId,
      'no_verifiable_assessments',
      'Every returned assessment failed citation validation.',
      'We could not produce an assessment we can stand behind. Your analyzed evidence is saved — try again shortly.',
      true,
    );
  }

  const persistedLevels: ConfidenceLevel[] = [];
  let persistFailures = 0;

  for (const assessment of assessments) {
    try {
      await persistAssessment(analysisId, assessment);
      persistedLevels.push(assessment.confidence);
    } catch (error) {
      persistFailures += 1;
      // The database is the last line of defense (CLAUDE.md §15.1); if it
      // refuses a row, that assessment is dropped, not forced through.
      await recordAssessmentError(
        analysisId,
        'assessment_rejected',
        `Database rejected assessment for "${assessment.skillSlug}": ${messageOf(error)}`,
        false,
      ).catch(() => undefined);
    }
  }

  if (persistedLevels.length === 0) {
    return failRun(
      analysisId,
      'assessment_persist_failed',
      'No assessment could be persisted.',
      'We could not save your assessment. Your analyzed evidence is saved — try again shortly.',
      true,
    );
  }

  // Honest terminal state: anything excluded — an unreadable repository, a
  // rejected citation, a refused row — makes this partial, and the product
  // says so rather than presenting an incomplete report as complete
  // (CLAUDE.md §19.5). This function only *reports* that decision — the
  // pipeline orchestrator is the one that writes it (ADR-009).
  const incomplete = rejected.length > 0 || persistFailures > 0 || repositoriesWithErrors > 0;

  return {
    outcome: 'success',
    status: incomplete ? 'partial' : 'completed',
    summary: completion.output.overallSummary,
    confidence: lowestConfidence(persistedLevels),
    model: completion.model,
    pipelineVersion: PIPELINE_VERSION,
    promptVersion: PROMPT_VERSION,
    skillsAssessed: persistedLevels.length,
    evidenceConsidered: input.citableEvidenceIds.size,
    partialMessage: incomplete
      ? `Assessed ${persistedLevels.length} skill(s); ${rejected.length + persistFailures} assessment(s) excluded and ${repositoriesWithErrors} repository/repositories were not fully analyzed.`
      : null,
    // Token usage is returned rather than logged: CLAUDE.md §17.13 wants
    // spend observed per task, and until Pino lands (§20.1 bans `console`
    // for business events) the caller is the only honest place to surface it.
    usage: completion.usage,
  };
}
