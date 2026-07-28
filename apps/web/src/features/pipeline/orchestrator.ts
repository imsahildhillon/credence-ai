import 'server-only';

import { runSkillAssessment } from '@/features/analysis';
import { ingestAnalysisEvidence } from '@/features/evidence';

import { logStageFailure } from './diagnostics';
import {
  claimNextAnalysis,
  isCancellationRequested,
  recordEvent,
  touchHeartbeat,
  transitionStatus,
  writeCancelled,
  writeTerminalFailure,
  writeTerminalSuccess,
} from './queries';
import type { LifecycleSummary } from './types';

/**
 * The one orchestrator, owning the entire lifecycle end to end:
 *
 *   ingesting → assessing → finalizing → completed | partial | failed | cancelled
 *
 * Neither stage function (`ingestAnalysisEvidence`, `runSkillAssessment`)
 * writes `analyses.status` — each returns a result, and this is the only
 * place that decides and writes lifecycle state (ADR-009). Both stages are
 * imported through their feature's public interface only (CLAUDE.md §4);
 * neither of them imports the other or this module.
 */

const DEFAULT_STALE_AFTER_MS = 5 * 60 * 1000;

function makeCheckpoint(analysisId: string, isWorkerStopping: () => boolean) {
  return async (): Promise<'continue' | 'stop'> => {
    await touchHeartbeat(analysisId);
    if (isWorkerStopping()) {
      return 'stop';
    }
    return (await isCancellationRequested(analysisId)) ? 'stop' : 'continue';
  };
}

export interface RunOptions {
  /** Polled at every checkpoint — lets the worker request a clean stop instead of being killed mid-write. */
  readonly isWorkerStopping?: () => boolean;
}

export async function runAnalysisLifecycle(
  analysisId: string,
  options: RunOptions = {},
): Promise<LifecycleSummary> {
  const isWorkerStopping = options.isWorkerStopping ?? (() => false);
  const checkpoint = makeCheckpoint(analysisId, isWorkerStopping);

  await recordEvent(analysisId, 'ingestion_started');
  let ingestion;
  try {
    ingestion = await ingestAnalysisEvidence(analysisId, checkpoint);
  } catch (error) {
    logStageFailure('ingest', analysisId, 'ingesting', error);
    throw error;
  }

  if (ingestion.outcome === 'cancelled') {
    await writeCancelled(analysisId);
    await recordEvent(analysisId, 'cancelled', { stage: 'ingestion' });
    return { analysisId, outcome: 'cancelled' };
  }
  if (ingestion.outcome === 'failure') {
    await writeTerminalFailure(analysisId, ingestion.failure);
    await recordEvent(analysisId, 'failed', { stage: 'ingestion', kind: ingestion.failure.kind });
    return { analysisId, outcome: 'failed' };
  }
  await recordEvent(analysisId, 'ingestion_completed', {
    repositoriesProcessed: ingestion.repositoriesProcessed,
    evidenceUpserted: ingestion.evidenceUpserted,
    failureCount: ingestion.failureCount,
  });

  if ((await checkpoint()) === 'stop') {
    await writeCancelled(analysisId);
    await recordEvent(analysisId, 'cancelled', { stage: 'pre_assessment' });
    return { analysisId, outcome: 'cancelled' };
  }

  // TEMPORARY — see features/analysis/service.ts's `logAssessStep` for the
  // matching per-operation trace inside runSkillAssessment itself. This pair
  // brackets the whole assessment stage from the orchestrator's side.
  console.warn('[assess-trace]', { analysisId, step: 'orchestrator:transition_to_assessing:before' });
  await transitionStatus(analysisId, 'assessing');
  console.warn('[assess-trace]', { analysisId, step: 'orchestrator:transition_to_assessing:after' });
  await recordEvent(analysisId, 'assessment_started');
  let assessment;
  try {
    console.warn('[assess-trace]', { analysisId, step: 'orchestrator:run_skill_assessment:before' });
    assessment = await runSkillAssessment(analysisId, checkpoint);
    console.warn('[assess-trace]', {
      analysisId,
      step: 'orchestrator:run_skill_assessment:after',
      outcome: assessment.outcome,
    });
  } catch (error) {
    logStageFailure('assess', analysisId, 'assessing', error);
    throw error;
  }

  if (assessment.outcome === 'cancelled') {
    await writeCancelled(analysisId);
    await recordEvent(analysisId, 'cancelled', { stage: 'assessment' });
    return { analysisId, outcome: 'cancelled' };
  }
  if (assessment.outcome === 'failure') {
    await writeTerminalFailure(analysisId, assessment.failure);
    await recordEvent(analysisId, 'failed', { stage: 'assessment', kind: assessment.failure.kind });
    return { analysisId, outcome: 'failed' };
  }
  await recordEvent(analysisId, 'assessment_completed', {
    skillsAssessed: assessment.skillsAssessed,
    evidenceConsidered: assessment.evidenceConsidered,
  });

  try {
    await transitionStatus(analysisId, 'finalizing');

    if ((await checkpoint()) === 'stop') {
      await writeCancelled(analysisId);
      await recordEvent(analysisId, 'cancelled', { stage: 'finalizing' });
      return { analysisId, outcome: 'cancelled' };
    }

    await writeTerminalSuccess(analysisId, assessment);
    await recordEvent(analysisId, 'finalized', { status: assessment.status });
    return { analysisId, outcome: assessment.status };
  } catch (error) {
    logStageFailure('finalize', analysisId, 'finalizing', error);
    throw error;
  }
}

/** Claims one run (fresh or stale-reclaimed) and drives it to a terminal state. Returns `null` when the queue is empty. */
export async function runNextAnalysis(
  workerId: string,
  options: RunOptions & { readonly staleAfterMs?: number } = {},
): Promise<LifecycleSummary | null> {
  const analysisId = await claimNextAnalysis(workerId, options.staleAfterMs ?? DEFAULT_STALE_AFTER_MS);
  if (!analysisId) {
    return null;
  }
  await recordEvent(analysisId, 'claimed', { workerId });
  return runAnalysisLifecycle(analysisId, options);
}
