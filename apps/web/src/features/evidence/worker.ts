import 'server-only';

import { GithubError, markGithubCredentialRevoked, readGithubAccessToken } from '@/features/github';

import {
  getAnalysis,
  getGithubAccountIdForProfile,
  listAnalysisSnapshotRows,
  recordAnalysisError,
  upsertEvidence,
} from './queries';
import { ingestRepositoryEvidence } from './service';
import type { IngestionFailure, IngestionResult } from './types';

/**
 * The ingestion stage: turns a claimed analysis into normalized evidence.
 * Returns an outcome; it never writes `analyses.status` itself — the
 * pipeline orchestrator (`features/pipeline`) is the only writer of
 * lifecycle state (ADR-009). Claiming (queued/stale → `ingesting`) already
 * happened before this is called, via `claim_next_analysis()`.
 *
 * Isolation — one repository failing (deleted, renamed, private, rate-limited)
 * records an `analysis_errors` row and the run continues with the rest.
 *
 * `checkpoint` is called between repositories so a long-running ingestion
 * can observe worker shutdown or (future) cancellation. It's a plain
 * function type, not imported from `features/pipeline` — this feature
 * depends on nothing there (CLAUDE.md §4).
 */

async function recordFailure(
  analysisId: string,
  repositoryId: string | null,
  ingestionFailure: IngestionFailure,
): Promise<void> {
  try {
    await recordAnalysisError(analysisId, repositoryId, ingestionFailure);
  } catch {
    // Losing the error record must not lose the run; the terminal status
    // still reflects that something failed.
    console.error('[evidence] could not persist analysis error record');
  }
}

/**
 * Diagnostic-only: logs everything known about the ingestion stage at the
 * moment it terminates with `{outcome: 'failure'}`. This stage never touches
 * `features/analysis`'s `failRun` (a different feature, CLAUDE.md §4) and has
 * no logging of its own before this — the orchestrator's own log
 * (`[worker …] analysis <id> → failed`) doesn't distinguish which of these
 * three kinds fired, or why.
 */
function logIngestionFailure(params: {
  readonly analysisId: string;
  readonly failureKind: 'empty_snapshot' | 'token_unavailable' | 'no_evidence_collected';
  readonly githubAccountId: string | null;
  readonly repositoryCount: number;
  readonly tokenSource: 'not_yet_resolved' | 'stored' | 'unavailable';
  readonly error?: unknown;
}): void {
  const { analysisId, failureKind, githubAccountId, repositoryCount, tokenSource, error } = params;
  const asError = error instanceof Error ? error : undefined;
  console.error(
    [
      '[ingestion-failed]',
      `analysisId: ${analysisId}`,
      `failureKind: ${failureKind}`,
      `githubAccountId: ${githubAccountId ?? 'unknown'}`,
      `repositoryCount: ${repositoryCount}`,
      `tokenSource: ${tokenSource}`,
      `error: ${
        error === undefined
          ? 'none'
          : (asError ? `${asError.name}: ${asError.message}\n${asError.stack ?? ''}` : JSON.stringify(error))
      }`,
    ].join('\n'),
  );
}

export async function ingestAnalysisEvidence(
  analysisId: string,
  checkpoint: () => Promise<'continue' | 'stop'>,
): Promise<IngestionResult> {
  const analysis = await getAnalysis(analysisId);
  if (!analysis) {
    throw new Error(`Analysis ${analysisId} not found`);
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
    logIngestionFailure({
      analysisId,
      failureKind: 'empty_snapshot',
      githubAccountId: null, // not resolved yet at this point in the function
      repositoryCount: snapshot.length,
      tokenSource: 'not_yet_resolved',
    });
    return {
      outcome: 'failure',
      failure: {
        kind: 'empty_snapshot',
        message: 'No repositories were snapshotted for this run.',
        retryable: false,
      },
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
    logIngestionFailure({
      analysisId,
      failureKind: 'token_unavailable',
      githubAccountId,
      repositoryCount: snapshot.length,
      tokenSource: 'unavailable',
    });
    return {
      outcome: 'failure',
      failure: {
        kind: 'token_unavailable',
        message: 'We could not reach GitHub on your behalf. Reconnect GitHub and start the analysis again.',
        retryable: true,
      },
    };
  }

  let repositoriesProcessed = 0;
  let evidenceUpserted = 0;
  let failureCount = 0;
  let credentialRevoked = false;

  for (const repository of snapshot) {
    if ((await checkpoint()) === 'stop') {
      return { outcome: 'cancelled' };
    }

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

      for (const ingestionFailure of failures) {
        failureCount += 1;
        await recordFailure(analysisId, repository.repository_id, ingestionFailure);
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

  if (evidenceUpserted === 0) {
    const message =
      failureCount === 0
        ? 'We could not find any analyzable activity in the repositories you selected.'
        : `Analyzed ${repositoriesProcessed} of ${snapshot.length} repositories; ${failureCount} issue(s) recorded, and no evidence could be collected.`;
    logIngestionFailure({
      analysisId,
      failureKind: 'no_evidence_collected',
      githubAccountId,
      repositoryCount: snapshot.length,
      tokenSource: 'stored',
    });
    return {
      outcome: 'failure',
      failure: { kind: 'no_evidence_collected', message, retryable: true },
    };
  }

  return { outcome: 'success', repositoriesProcessed, evidenceUpserted, failureCount };
}
