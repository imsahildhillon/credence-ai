import 'server-only';

import type { User } from '@supabase/supabase-js';

import { normalizeSupabaseError } from '@/lib/supabase/errors';
import { createClient } from '@/lib/supabase/server';

import { storeGithubAccessToken } from './credentials';
import { getAuthenticatedGithubUser } from './service';
import { GithubError, type GithubAccountRow } from './types';

/**
 * Linking a Supabase identity to its GitHub account. Extracted from the
 * Server Actions module so both the OAuth callback (a route handler) and the
 * onboarding actions can use it — business logic lives here, not in the
 * action or the route (CLAUDE.md §14.1).
 */

/** GitHub identity already present in the Supabase session, no network call. */
export function deriveGithubIdentity(user: User): { id: number; login: string } | null {
  const metadata = user.user_metadata ?? {};
  const login = (metadata.user_name ?? metadata.preferred_username) as string | undefined;
  const providerId = (metadata.provider_id ?? metadata.sub) as string | undefined;
  if (!login || !providerId) {
    return null;
  }
  const id = Number(providerId);
  return Number.isFinite(id) ? { id, login } : null;
}

/**
 * Idempotently ensures the student's `github_accounts` row exists and returns
 * it. Writes through the RLS-scoped client — the owner policy validates
 * `profile_id = auth.uid()`.
 *
 * `useApi: false` skips the authoritative `/user` lookup and uses the identity
 * already in the session. The OAuth callback passes it to avoid adding a
 * network round-trip to every login; onboarding uses the API for accuracy and
 * falls back to session identity if GitHub is unreachable.
 */
export async function ensureGithubAccount(
  user: User,
  { useApi = true }: { useApi?: boolean } = {},
): Promise<GithubAccountRow> {
  let githubUserId: number;
  let githubUsername: string;

  const fromSession = deriveGithubIdentity(user);

  if (useApi) {
    try {
      const apiUser = await getAuthenticatedGithubUser();
      githubUserId = apiUser.id;
      githubUsername = apiUser.login;
    } catch (error) {
      if (!(error instanceof GithubError) || !fromSession) {
        throw error;
      }
      githubUserId = fromSession.id;
      githubUsername = fromSession.login;
    }
  } else {
    if (!fromSession) {
      throw new GithubError('unknown', 'No GitHub identity present on this session.');
    }
    githubUserId = fromSession.id;
    githubUsername = fromSession.login;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('github_accounts')
    .upsert(
      { profile_id: user.id, github_user_id: githubUserId, github_username: githubUsername },
      { onConflict: 'profile_id' },
    )
    .select('*')
    .single();

  if (error) {
    throw normalizeSupabaseError(error);
  }
  return data;
}

/**
 * Captures the GitHub OAuth token issued at sign-in and persists it
 * (encrypted) so repository access survives beyond the Supabase session —
 * the durability fix. Called from the OAuth callback on a best-effort basis:
 * a failure here must never break login, it only means the app falls back to
 * the session token until the next sign-in.
 */
export async function captureGithubOAuthCredentials(
  user: User,
  providerToken: string | null | undefined,
): Promise<void> {
  if (!providerToken) {
    return;
  }
  const account = await ensureGithubAccount(user, { useApi: false });
  await storeGithubAccessToken(account.id, providerToken);
}
