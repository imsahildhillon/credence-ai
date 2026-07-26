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

async function upsertGithubAccount(
  profileId: string,
  githubUserId: number,
  githubUsername: string,
): Promise<GithubAccountRow> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('github_accounts')
    .upsert(
      { profile_id: profileId, github_user_id: githubUserId, github_username: githubUsername },
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
 * Idempotently ensures the student's `github_accounts` row exists and returns
 * it. Writes through the RLS-scoped client — the owner policy validates
 * `profile_id = auth.uid()`.
 *
 * `useApi: false` skips the authoritative `/user` lookup and uses the identity
 * already in the session. The OAuth callback passes it to avoid adding a
 * network round-trip to every login; onboarding uses the API for accuracy and
 * falls back to session identity if GitHub is unreachable.
 *
 * ROOT-CAUSE FIX (credential-capture investigation): when `useApi: true`, the
 * session-derived identity is upserted *before* the API call, not after.
 * `getAuthenticatedGithubUser()` calls `resolveGithubAccess()`
 * (`features/github/service.ts`), which opportunistically persists a
 * session-level `provider_token` into `github_credentials` the moment it
 * finds one — but only when it already knows a `github_account_id` to key
 * that row on. With the old ordering, that id didn't exist yet on a
 * student's very first GitHub call (this function is what creates it), so
 * the one guaranteed opportunity to self-heal a credential the OAuth
 * callback failed to capture could never fire. Upserting the account first
 * closes that gap without changing this function's return shape or
 * fallback behavior.
 */
export async function ensureGithubAccount(
  user: User,
  { useApi = true }: { useApi?: boolean } = {},
): Promise<GithubAccountRow> {
  const fromSession = deriveGithubIdentity(user);

  if (!useApi) {
    if (!fromSession) {
      throw new GithubError('unknown', 'No GitHub identity present on this session.');
    }
    return upsertGithubAccount(user.id, fromSession.id, fromSession.login);
  }

  const sessionAccount = fromSession
    ? await upsertGithubAccount(user.id, fromSession.id, fromSession.login)
    : null;

  try {
    const apiUser = await getAuthenticatedGithubUser();
    return await upsertGithubAccount(user.id, apiUser.id, apiUser.login);
  } catch (error) {
    if (!(error instanceof GithubError) || !sessionAccount) {
      throw error;
    }
    return sessionAccount;
  }
}

/**
 * What happened when the OAuth callback tried to capture and persist the
 * GitHub token this sign-in produced. A real discriminated result, not a
 * swallowed `void` — the previous version of this function silently
 * returned on a missing `provider_token` and let any persistence error
 * disappear into the callback's catch-all, which is exactly what made two
 * independent students' missing `github_credentials` rows undiagnosable
 * from logs alone.
 */
export type CredentialCaptureOutcome =
  | { readonly outcome: 'captured' }
  | { readonly outcome: 'no_provider_token' }
  | { readonly outcome: 'persist_failed'; readonly error: unknown };

/**
 * Captures the GitHub OAuth token issued at sign-in and persists it
 * (encrypted) so repository access survives beyond the Supabase session —
 * the durability fix (ADR-004). Called from the OAuth callback: never throws
 * (a failure here must never break login), but now reports exactly which of
 * the three possible outcomes occurred so the caller can log accordingly
 * instead of guessing after the fact.
 */
export async function captureGithubOAuthCredentials(
  user: User,
  providerToken: string | null | undefined,
): Promise<CredentialCaptureOutcome> {
  if (!providerToken) {
    return { outcome: 'no_provider_token' };
  }
  try {
    const account = await ensureGithubAccount(user, { useApi: false });
    await storeGithubAccessToken(account.id, providerToken);
    return { outcome: 'captured' };
  } catch (error) {
    return { outcome: 'persist_failed', error };
  }
}
