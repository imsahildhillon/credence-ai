import 'server-only';

import { GithubError, readGithubAccessToken } from '@/features/github';

import { hasRateLimitHeadroom } from './client';
import { checkEvidenceLiveness } from './link-liveness';
import {
  getGithubAccountIdForProfile,
  listEvidenceDueForLivenessCheck,
  markEvidenceLivenessChecked,
} from './queries';

const DEFAULT_BATCH_SIZE = 100;

export interface LinkLivenessRunSummary {
  readonly checked: number;
  readonly confirmedDead: number;
  readonly skipped: number;
}

/**
 * Re-checks a bounded batch of evidence links, oldest/never-checked first
 * (`listEvidenceDueForLivenessCheck`), writing `link_checked_at` and —
 * only on a genuine 404/410 — `link_dead_at`. Mirrors `worker.ts`'s shape:
 * a plain async processor invoked today by a trigger route
 * (`app/api/v1/evidence/verify-links/route.ts`); nothing here assumes a
 * queue.
 *
 * Grouped by profile so each candidate's token is read once, and stops
 * issuing GitHub calls the moment the shared rate-limit budget runs low
 * (`hasRateLimitHeadroom`) rather than exhausting it — the same pre-flight
 * guard `client.ts` uses for ingestion.
 */
export async function processLinkLivenessBatch(
  batchSize: number = DEFAULT_BATCH_SIZE,
): Promise<LinkLivenessRunSummary> {
  const candidates = await listEvidenceDueForLivenessCheck(batchSize);

  let checked = 0;
  let confirmedDead = 0;
  let skipped = 0;

  const tokensByProfile = new Map<string, string | null>();

  for (const candidate of candidates) {
    if (!hasRateLimitHeadroom()) {
      skipped += candidates.length - checked - skipped;
      break;
    }

    let token = tokensByProfile.get(candidate.profile_id);
    if (token === undefined) {
      const githubAccountId = await getGithubAccountIdForProfile(candidate.profile_id);
      token = githubAccountId ? await readGithubAccessToken(githubAccountId) : null;
      tokensByProfile.set(candidate.profile_id, token);
    }

    if (!token) {
      // No usable credential for this candidate (never connected, or
      // revoked) — nothing to check against; leave the row untouched so a
      // future run retries once the credential is available again.
      skipped += 1;
      continue;
    }

    try {
      const alive = await checkEvidenceLiveness(token, {
        sourceType: candidate.source_type,
        repositoryFullName: candidate.repository_full_name,
        authorLogin: candidate.author_login,
        payload: candidate.payload,
        githubId: candidate.github_id,
      });
      await markEvidenceLivenessChecked(candidate.id, alive);
      checked += 1;
      if (!alive) {
        confirmedDead += 1;
      }
    } catch (error) {
      if (error instanceof GithubError && error.kind === 'rate_limited') {
        skipped += candidates.length - checked - skipped;
        break;
      }
      // Any other failure (network blip, revoked token discovered mid-run)
      // is inconclusive, not proof of death — skip and let the next run
      // retry, exactly like a rate-limit stop.
      skipped += 1;
    }
  }

  return { checked, confirmedDead, skipped };
}
