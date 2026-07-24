import 'server-only';

import { createClient } from '@/lib/supabase/server';

import { fetchAllRepositories, fetchAuthenticatedUser, fetchRepositoryHeadSha } from './client';
import {
  markGithubCredentialRevoked,
  readGithubAccessToken,
  storeGithubAccessToken,
} from './credentials';
import { getGithubAccountForCurrentUser } from './queries';
import {
  GithubError,
  type GithubApiRepository,
  type GithubApiUser,
  type RepositoryRef,
} from './types';

/**
 * GitHub-API orchestration. Sits between the low-level `client` (raw HTTP)
 * and the Server Actions (app boundary + persistence).
 *
 * TOKEN DURABILITY: the token is resolved from persistent, encrypted storage
 * first and only falls back to the session's `provider_token`. The session
 * token is ephemeral — Supabase drops it on token refresh — which is why
 * imports used to stop working silently some time after login. Whenever we
 * do fall back to a session token we opportunistically persist it, so the
 * system self-heals into the durable path.
 *
 * The plaintext token never leaves the server: it is passed only to
 * `client.ts` and is never returned from any exported function here.
 */

// Bounds the extra API calls a single enqueue can make. Beyond this, snapshots
// simply carry a null commit_sha rather than stalling "Start analysis".
const MAX_COMMIT_SHA_LOOKUPS = 25;

interface GithubAccess {
  readonly token: string;
  readonly githubAccountId: string | null;
}

async function readSessionProviderToken(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.provider_token ?? null;
}

/**
 * Resolves a usable GitHub token, preferring durable storage.
 * Throws `GithubError('token_unavailable')` when the student must reconnect.
 */
async function resolveGithubAccess(): Promise<GithubAccess> {
  const account = await getGithubAccountForCurrentUser();
  const githubAccountId = account?.id ?? null;

  if (githubAccountId) {
    try {
      const stored = await readGithubAccessToken(githubAccountId);
      if (stored) {
        return { token: stored, githubAccountId };
      }
    } catch {
      // Storage unavailable (e.g. service-role key not configured, or the
      // encryption key changed). Degrade to the session token rather than
      // breaking the feature — never log the failure's contents, it is
      // credential-adjacent (CLAUDE.md §20.4).
      console.error('[github] stored credential unreadable; falling back to session token');
    }
  }

  const sessionToken = await readSessionProviderToken();
  if (sessionToken) {
    if (githubAccountId) {
      try {
        await storeGithubAccessToken(githubAccountId, sessionToken);
      } catch {
        // Best effort: failing to upgrade to durable storage must not block
        // the request that is happening right now.
      }
    }
    return { token: sessionToken, githubAccountId };
  }

  throw new GithubError('token_unavailable', 'Your GitHub connection needs to be reconnected.');
}

/**
 * Runs `fn` with a resolved token and turns a GitHub 401 into recorded
 * revocation — the single place we detect that a student withdrew the app's
 * authorization, so every caller gets the reconnect behavior for free.
 */
async function withGithubToken<T>(fn: (token: string) => Promise<T>): Promise<T> {
  const access = await resolveGithubAccess();

  try {
    return await fn(access.token);
  } catch (error) {
    if (error instanceof GithubError && error.kind === 'unauthorized' && access.githubAccountId) {
      try {
        await markGithubCredentialRevoked(access.githubAccountId);
      } catch {
        // Recording revocation is an optimization (it stops us retrying a
        // dead token); the 401 itself is still surfaced below.
      }
    }
    throw error;
  }
}

export async function getAuthenticatedGithubUser(): Promise<GithubApiUser> {
  return withGithubToken((token) => fetchAuthenticatedUser(token));
}

export async function listAllGithubRepositories(): Promise<GithubApiRepository[]> {
  return withGithubToken((token) => fetchAllRepositories(token));
}

/**
 * Best-effort HEAD commit SHA per repository, keyed by repository id, for the
 * analysis snapshot. Deliberately total: any failure (GitHub down, token
 * revoked, rate limit) yields a partial or empty map rather than throwing —
 * a snapshot without commit SHAs is still valid and enqueueing must not
 * depend on GitHub being reachable (CLAUDE.md §19.5 partial failure is honest).
 */
export async function resolveHeadCommitShas(
  refs: readonly RepositoryRef[],
): Promise<Record<string, string>> {
  const targets = refs.slice(0, MAX_COMMIT_SHA_LOOKUPS);
  if (targets.length === 0) {
    return {};
  }

  try {
    return await withGithubToken(async (token) => {
      const settled = await Promise.allSettled(
        targets.map((ref) => fetchRepositoryHeadSha(token, ref.fullName, ref.defaultBranch)),
      );

      const shaByRepositoryId: Record<string, string> = {};
      settled.forEach((result, index) => {
        const target = targets[index];
        if (target && result.status === 'fulfilled' && result.value) {
          shaByRepositoryId[target.id] = result.value;
        }
      });
      return shaByRepositoryId;
    });
  } catch {
    return {};
  }
}
