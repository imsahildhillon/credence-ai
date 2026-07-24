import 'server-only';

import { GithubError, markGithubCredentialRevoked, readGithubAccessToken } from '@/features/github';

import {
  claimNextQueuedAnalysis,
  finishAnalysis,
  getAnalysis,
  getGithubAccountIdForProfile,
  listAnalysisSnapshotRows,
  markAnalysisProcessing,
  recordAnalysisError,
  upsertEvidence,
} from './queries';
import { ingestRepositoryEvidence } from './service';
import type { AnalysisRunSummary, IngestionFailure } from './types';

/**
 * The analysis worker: turns a queued job into normalized evidence.
 *
 * Lifecycle — `queued → processing → completed | partial | failed`, with
 * `started_at` / `completed_at` persisted at each transition so a stalled job
 * is detectable (CLAUDE.md §19.6: a job never sits in `processing` limbo
 * silently, and every terminal state is user-visible).
 *
 * Isolation — one repository failing (deleted, renamed, private, rate-limited)
 * records an `analysis_errors` row and the run continues with the rest. The
 * job then finishes `partial`, so the product can say exactly what was
 * excluded and why rather than pretending the report is complete
 * (CLAUDE.md §19.5).
 *
 * This is a plain async processor, invoked today by the trigger route. When
 * the BullMQ spine (CLAUDE.md §14) lands, the queue calls `processAnalysis`
 * unchanged — only the invocation moves.
 */

async function recordFailure(
  analysisId: string,
  repositoryId: string | null,
  failure: IngestionFailure,
): Promise<void> {
  try {
    await recordAnalysisError(analysisId, repositoryId, failure);
  } catch {
    // Losing the error record must not lose the run; the terminal status
    // still reflects that something failed.
    console.error('[evidence] could not persist analysis error record');
  }
}

export async function processAnalysis(analysisId: string): Promise<AnalysisRunSummary> {
  const analysis = await getAnalysis(analysisId);

  if (!analysis) {
    throw new Error(`Analysis ${analysisId} not found`);
  }
  if (analysis.status === 'queued') {
    await markAnalysisProcessing(analysisId);
  }

  const snapshot = await listAnalysisSnapshotRows(analysisId);

  if (snapshot.length === 0) {
    // A job without a snapshot cannot define any work — terminal, not a retry.
    await recordFailure(analysisId, null, {
      stage: 'repository',
      kind: 'empty_snapshot',
      message: 'Analysis has no repository snapshot.',
      retryable: false,
    });
    await finishAnalysis(analysisId, 'failed', 'No repositories were snapshotted for this run.');
    return {
      analysisId,
      status: 'failed',
      repositoriesProcessed: 0,
      evidenceUpserted: 0,
      failures: 1,
    };
  }

  // Resolve the student's stored GitHub token. The worker has no session, so
  // this reads the encrypted credential directly by account (ADR-004).
  const githubAccountId = await getGithubAccountIdForProfile(analysis.profile_id);
  const token = githubAccountId ? await readGithubAccessToken(githubAccountId) : null;

  if (!token) {
    await recordFailure(analysisId, null, {
      stage: 'credentials',
      kind: 'token_unavailable',
      message: 'No usable GitHub credential; the student needs to reconnect GitHub.',
      retryable: true,
    });
    await finishAnalysis(
      analysisId,
      'failed',
      'We could not reach GitHub on your behalf. Reconnect GitHub and start the analysis again.',
    );
    return {
      analysisId,
      status: 'failed',
      repositoriesProcessed: 0,
      evidenceUpserted: 0,
      failures: 1,
    };
  }

  let repositoriesProcessed = 0;
  let evidenceUpserted = 0;
  let failureCount = 0;
  let credentialRevoked = false;

  for (const repository of snapshot) {
    if (credentialRevoked) {
      // The token died mid-run; every remaining repository would fail the
      // same way. Record it once per repository so the gap is explicit,
      // without hammering GitHub.
      failureCount += 1;
      await recordFailure(analysisId, repository.repository_id, {
        stage: 'credentials',
        kind: 'unauthorized',
        message: 'Skipped — GitHub authorization was revoked during this run.',
        retryable: true,
      });
      continue;
    }

    try {
      const { evidence, failures } = await ingestRepositoryEvidence(token, repository);

      for (const failure of failures) {
        failureCount += 1;
        await recordFailure(analysisId, repository.repository_id, failure);
      }

      if (evidence.length > 0) {
        evidenceUpserted += await upsertEvidence(
          analysis.profile_id,
          repository.repository_id,
          evidence,
        );
      }
      repositoriesProcessed += 1;
    } catch (error) {
      failureCount += 1;

      if (error instanceof GithubError && error.kind === 'unauthorized') {
        credentialRevoked = true;
        try {
          if (githubAccountId) {
            await markGithubCredentialRevoked(githubAccountId);
          }
        } catch {
          // Best effort — the run's terminal state already reflects failure.
        }
        await recordFailure(analysisId, repository.repository_id, {
          stage: 'credentials',
          kind: 'unauthorized',
          message: 'GitHub rejected the stored credential; authorization was revoked.',
          retryable: true,
        });
        continue;
      }

      await recordFailure(analysisId, repository.repository_id, {
        stage: 'persistence',
        kind: 'unknown',
        message: error instanceof Error ? error.message : 'Repository ingestion failed.',
        retryable: true,
      });
    }
  }

  // Honest terminal state: complete only when nothing failed; partial when we
  // produced evidence but not all of it; failed when we produced none.
  const status = failureCount === 0 ? 'completed' : evidenceUpserted > 0 ? 'partial' : 'failed';

  const summaryMessage =
    failureCount === 0
      ? null
      : `Analyzed ${repositoriesProcessed} of ${snapshot.length} repositories; ${failureCount} issue(s) recorded.`;

  await finishAnalysis(analysisId, status, summaryMessage);

  return {
    analysisId,
    status,
    repositoriesProcessed,
    evidenceUpserted,
    failures: failureCount,
  };
}

/**
 * Claims the oldest queued job (atomically, via `FOR UPDATE SKIP LOCKED`) and
 * processes it. Returns null when the queue is empty. Safe to run from
 * several workers concurrently — two can never claim the same job.
 */
export async function processNextQueuedAnalysis(): Promise<AnalysisRunSummary | null> {
  const analysisId = await claimNextQueuedAnalysis();
  if (!analysisId) {
    return null;
  }

  try {
    return await processAnalysis(analysisId);
  } catch (error) {
    // The job was already moved to `processing` by the claim; make sure it
    // reaches a terminal state instead of being stranded there.
    await finishAnalysis(
      analysisId,
      'failed',
      error instanceof Error ? error.message : 'Analysis failed unexpectedly.',
    );
    throw error;
  }
}
