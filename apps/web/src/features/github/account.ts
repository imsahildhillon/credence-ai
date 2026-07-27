import 'server-only';

import type { Session, SupabaseClient, User } from '@supabase/supabase-js';

import { normalizeSupabaseError } from '@/lib/supabase/errors';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';

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
  supabase: SupabaseClient<Database>,
  profileId: string,
  githubUserId: number,
  githubUsername: string,
): Promise<GithubAccountRow> {
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
 * `client`, if provided, is used instead of building one via
 * `lib/supabase/server.ts`'s ambient `createClient()`. This exists because
 * that ambient client reads the session through `next/headers`' cookie jar,
 * which — within the OAuth callback's own request — has not yet observed the
 * session `exchangeCodeForSession()` just established (that session's
 * cookies were written onto the callback's own locally-scoped `response`
 * object, not into `next/headers`). Passing the callback's already-
 * authenticated client through avoids reconstructing auth from a cookie jar
 * that is one request behind; every other caller omits it and gets the
 * ambient client as before.
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
  { useApi = true, client }: { useApi?: boolean; client?: SupabaseClient<Database> } = {},
): Promise<GithubAccountRow> {
  const supabase = client ?? (await createClient());
  const fromSession = deriveGithubIdentity(user);

  if (!useApi) {
    if (!fromSession) {
      throw new GithubError('unknown', 'No GitHub identity present on this session.');
    }
    return upsertGithubAccount(supabase, user.id, fromSession.id, fromSession.login);
  }

  const sessionAccount = fromSession
    ? await upsertGithubAccount(supabase, user.id, fromSession.id, fromSession.login)
    : null;

  try {
    const apiUser = await getAuthenticatedGithubUser();
    return await upsertGithubAccount(supabase, user.id, apiUser.id, apiUser.login);
  } catch (error) {
    if (!(error instanceof GithubError) || !sessionAccount) {
      throw error;
    }
    return sessionAccount;
  }
}

/**
 * Every terminal state a GitHub OAuth callback request can reach, covering
 * both the token exchange (`exchange_failed`, constructed by the route
 * itself before this module is ever called) and credential capture (the
 * other five, returned by `captureGithubOAuthCredentials`). Deliberately one
 * flat union rather than nested results — a caller can `switch` over exactly
 * six cases and knows, by the type, that there is no seventh silent path.
 */
export type OAuthCallbackOutcome =
  | { readonly outcome: 'exchange_failed'; readonly error: unknown }
  | { readonly outcome: 'provider_token_missing'; readonly context: ProviderTokenAbsenceContext }
  | { readonly outcome: 'github_identity_missing' }
  | { readonly outcome: 'github_account_upsert_failed'; readonly error: unknown }
  | { readonly outcome: 'credential_upsert_failed'; readonly githubAccountId: string; readonly error: unknown }
  | { readonly outcome: 'credential_persisted'; readonly githubAccountId: string };

/**
 * What the session tells us about *why* `provider_token` might be absent —
 * built from fields Supabase actually returns, not a guess. Supabase itself
 * doesn't supply a "reason" for a missing provider token, so this reports
 * the facts a reader can use to judge the likely cause: whether a
 * `provider_refresh_token` came back either (both missing points at GitHub
 * simply not reissuing one this exchange, vs. one present without the
 * other), whether this looks like a first-ever sign-in or a returning
 * session, and how many identities are linked.
 */
export interface ProviderTokenAbsenceContext {
  readonly hasProviderRefreshToken: boolean;
  readonly isReturningIdentity: boolean;
  readonly identityCount: number;
  readonly tokenType: string | null;
}

export function describeProviderTokenAbsence(session: Session): ProviderTokenAbsenceContext {
  return {
    hasProviderRefreshToken: Boolean(session.provider_refresh_token),
    isReturningIdentity: session.user.created_at !== session.user.last_sign_in_at,
    identityCount: session.user.identities?.length ?? 0,
    tokenType: session.token_type ?? null,
  };
}

/** Independent copy of the same error-description walk used elsewhere (`lib/supabase/errors.ts`, `features/pipeline/diagnostics.ts`, `features/analysis/service.ts`) — this feature imports none of them (CLAUDE.md §4). */
function describeErrorForLog(error: unknown, seen: Set<unknown> = new Set()): unknown {
  if (error === null || typeof error !== 'object') {
    return error;
  }
  if (seen.has(error)) {
    return '[circular]';
  }
  seen.add(error);

  const record = error as Record<string, unknown>;
  const description: Record<string, unknown> = {};

  if (error instanceof Error) {
    description['name'] = error.name;
    description['message'] = error.message;
    description['stack'] = error.stack;
  }
  for (const key of ['status', 'statusCode', 'code', 'details', 'hint']) {
    if (record[key] !== undefined) {
      description[key] = record[key];
    }
  }
  if (record['cause'] !== undefined) {
    description['cause'] = describeErrorForLog(record['cause'], seen);
  }

  return description;
}

/**
 * The single place every OAuth callback request logs its terminal outcome —
 * exactly one of the six `OAuthCallbackOutcome` variants, exactly once. The
 * route calls this either immediately after an `exchange_failed` (then
 * returns) or once after `captureGithubOAuthCredentials` resolves; those two
 * call sites are mutually exclusive by construction (the first `return`s
 * before the second can run), so no request can ever log twice or not at all.
 */
export function logOAuthCallbackOutcome(
  correlationId: string,
  userId: string,
  outcome: OAuthCallbackOutcome,
): void {
  const base = { correlationId, userId, outcome: outcome.outcome };
  switch (outcome.outcome) {
    case 'credential_persisted':
      console.warn('[auth-callback] outcome', { ...base, githubAccountId: outcome.githubAccountId });
      return;
    case 'provider_token_missing':
      console.warn('[auth-callback] outcome', { ...base, context: outcome.context });
      return;
    case 'github_identity_missing':
      console.error('[auth-callback] outcome', base);
      return;
    case 'exchange_failed':
    case 'github_account_upsert_failed':
      console.error('[auth-callback] outcome', { ...base, error: describeErrorForLog(outcome.error) });
      return;
    case 'credential_upsert_failed':
      console.error('[auth-callback] outcome', {
        ...base,
        githubAccountId: outcome.githubAccountId,
        error: describeErrorForLog(outcome.error),
      });
      return;
    default: {
      const exhaustive: never = outcome;
      throw new Error(`Unhandled OAuth callback outcome: ${JSON.stringify(exhaustive)}`);
    }
  }
}

/**
 * Captures the GitHub OAuth token issued at sign-in and persists it
 * (encrypted) so repository access survives beyond the Supabase session —
 * the durability fix (ADR-004). Called from the OAuth callback only.
 *
 * Deliberately bypasses `ensureGithubAccount` (unlike the old version) and
 * calls `upsertGithubAccount` directly: the two failure modes inside
 * `ensureGithubAccount`'s `useApi: false` branch (missing session identity vs.
 * a failed account upsert) need to be distinguishable outcomes here, not
 * collapsed into one caught exception. Because the same `account.id` this
 * function gets back from the account upsert is the *only* id ever passed to
 * `storeGithubAccessToken`, the two tables' `github_account_id` cannot
 * diverge within one call — there is no second id in scope to compare
 * against.
 *
 * `client` is required (not optional, unlike `ensureGithubAccount`'s) because
 * this function has exactly one caller — the OAuth callback — and that
 * caller must always pass the client it authenticated via
 * `exchangeCodeForSession()`, never the ambient one. See `ensureGithubAccount`
 * for why the ambient client cannot see this session yet.
 */
export async function captureGithubOAuthCredentials(
  user: User,
  providerToken: string | null | undefined,
  providerTokenAbsenceContext: ProviderTokenAbsenceContext,
  client: SupabaseClient<Database>,
): Promise<OAuthCallbackOutcome> {
  if (!providerToken) {
    return { outcome: 'provider_token_missing', context: providerTokenAbsenceContext };
  }

  const fromSession = deriveGithubIdentity(user);
  if (!fromSession) {
    return { outcome: 'github_identity_missing' };
  }

  let account: GithubAccountRow;
  try {
    account = await upsertGithubAccount(client, user.id, fromSession.id, fromSession.login);
  } catch (error) {
    return { outcome: 'github_account_upsert_failed', error };
  }

  try {
    await storeGithubAccessToken(account.id, providerToken);
  } catch (error) {
    return { outcome: 'credential_upsert_failed', githubAccountId: account.id, error };
  }

  return { outcome: 'credential_persisted', githubAccountId: account.id };
}
