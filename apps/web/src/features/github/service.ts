import 'server-only';

import { createClient } from '@/lib/supabase/server';

import { fetchAllRepositories, fetchAuthenticatedUser } from './client';
import { GithubError, type GithubApiRepository, type GithubApiUser } from './types';

/**
 * GitHub-API orchestration. Sits between the low-level `client` (raw HTTP)
 * and the Server Actions (app boundary + persistence). Touches no database.
 *
 * The access token comes from the current Supabase Auth session's
 * `provider_token` — the GitHub OAuth token Supabase captured at sign-in.
 * It lives server-side in the session cookie and is read here with
 * `getSession()`; it is never sent to the browser (CLAUDE.md §18.5). We do
 * not re-run the OAuth flow: the student already granted access at login
 * (task requirement: "do not ask the user to reconnect if access exists").
 */
export async function getGithubAccessToken(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.provider_token;
  if (!token) {
    // The provider token is not persisted beyond the session and is dropped
    // on a Supabase token refresh — so this is an expected, recoverable
    // state (re-auth repopulates it), not a bug. Callers surface it as a
    // "reconnect GitHub" prompt, not a crash.
    throw new GithubError('token_unavailable', 'Your GitHub connection needs to be refreshed.');
  }
  return token;
}

export async function getAuthenticatedGithubUser(): Promise<GithubApiUser> {
  const token = await getGithubAccessToken();
  return fetchAuthenticatedUser(token);
}

export async function listAllGithubRepositories(): Promise<GithubApiRepository[]> {
  const token = await getGithubAccessToken();
  return fetchAllRepositories(token);
}
