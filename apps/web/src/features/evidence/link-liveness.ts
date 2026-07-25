import 'server-only';

import { GithubError } from '@/features/github';
import type { Json } from '@/lib/supabase/types';

import {
  fetchCommitDetail,
  fetchGithubUser,
  fetchIssue,
  fetchPullRequestDetail,
  fetchReleaseByTag,
  fetchRepository,
  listPullRequestReviews,
} from './client';
import type { EvidenceSourceType } from './types';

/**
 * Confirms whether one evidence item's underlying GitHub resource still
 * exists — the writer for `evidence_items.link_dead_at`, which the report
 * UI (`features/profile`) has read since Phase 1 but nothing has populated
 * until now. Every check hits the authoritative REST API (never the public
 * HTML page, which 404s for private repositories regardless of whether the
 * resource exists) using the candidate's own stored token, so results are
 * accurate for private repositories too.
 *
 * Returns `true` (alive) or `false` (confirmed dead via a genuine 404/410).
 * Every other failure — rate limiting, network errors, revoked
 * authorization — is a real exception, not evidence of death, and must
 * propagate so the caller never marks a link dead on an inconclusive check
 * (CLAUDE.md §19.1: expected domain outcomes and unexpected failures are
 * never conflated).
 */
export interface LivenessCheckInput {
  readonly sourceType: EvidenceSourceType | null;
  readonly repositoryFullName: string | null;
  readonly authorLogin: string | null;
  readonly payload: Json;
  /** The upstream review id, needed only for `review` evidence. */
  readonly githubId: string | null;
}

function asRecord(payload: Json): Readonly<Record<string, Json | undefined>> {
  return payload !== null && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
}

function asString(value: Json | undefined): string | null {
  return typeof value === 'string' ? value : null;
}

function asNumber(value: Json | undefined): number | null {
  return typeof value === 'number' ? value : null;
}

/** True when nothing here can even attempt a check — never a claim of liveness. */
function cannotCheck(): boolean {
  return true;
}

export async function checkEvidenceLiveness(
  token: string,
  input: LivenessCheckInput,
): Promise<boolean> {
  const fullName = input.repositoryFullName;
  const payload = asRecord(input.payload);

  try {
    if (!fullName) {
      return cannotCheck();
    }

    switch (input.sourceType) {
      case 'repository':
        await fetchRepository(token, fullName);
        return true;

      case 'commit': {
        const sha = asString(payload['sha']);
        if (!sha) {
          return cannotCheck();
        }
        await fetchCommitDetail(token, fullName, sha);
        return true;
      }

      case 'pull_request': {
        const number = asNumber(payload['number']);
        if (number === null) {
          return cannotCheck();
        }
        await fetchPullRequestDetail(token, fullName, number);
        return true;
      }

      case 'issue': {
        const number = asNumber(payload['number']);
        if (number === null) {
          return cannotCheck();
        }
        await fetchIssue(token, fullName, number);
        return true;
      }

      case 'release': {
        const tag = asString(payload['tag']);
        if (!tag) {
          return cannotCheck();
        }
        await fetchReleaseByTag(token, fullName, tag);
        return true;
      }

      case 'review': {
        const pullRequestNumber = asNumber(payload['pullRequestNumber']);
        if (pullRequestNumber === null || !input.githubId) {
          return cannotCheck();
        }
        // A review has no single-item GET endpoint; a 404 here reflects the
        // parent pull request going away, and an empty match reflects the
        // review itself being deleted — both are genuine "dead" outcomes.
        const reviews = await listPullRequestReviews(token, fullName, pullRequestNumber);
        return reviews.some((review) => String(review.id) === input.githubId);
      }

      case 'contributor': {
        if (!input.authorLogin) {
          return cannotCheck();
        }
        await fetchGithubUser(token, input.authorLogin);
        return true;
      }

      case null:
        return cannotCheck();

      default:
        return cannotCheck();
    }
  } catch (error) {
    if (error instanceof GithubError && error.kind === 'not_found') {
      return false;
    }
    throw error;
  }
}
