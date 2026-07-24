import 'server-only';

import { decryptSecret, encryptSecret } from '@/lib/crypto/secret-cipher';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizeSupabaseError } from '@/lib/supabase/errors';

/**
 * Durable storage for GitHub OAuth access tokens.
 *
 * Every function here uses the **service-role** client deliberately:
 * `github_credentials` has RLS enabled with zero policies and revoked table
 * grants, so it is unreachable from any browser session by construction. The
 * plaintext token exists only inside this module's callers on the server —
 * it is never returned to a client component, never placed in a prop, and
 * never logged (CLAUDE.md §18.5, §20.4).
 *
 * Lifecycle: captured at the OAuth callback → read on each GitHub API call →
 * marked revoked when GitHub answers 401 → replaced (revocation cleared) when
 * the student re-authorizes. See docs/04-system-architecture.md.
 */

export async function storeGithubAccessToken(
  githubAccountId: string,
  accessToken: string,
  scopes?: string | null,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from('github_credentials').upsert(
    {
      github_account_id: githubAccountId,
      access_token_encrypted: encryptSecret(accessToken),
      token_scopes: scopes ?? null,
      captured_at: new Date().toISOString(),
      // A freshly captured token means authorization is valid again.
      revoked_at: null,
    },
    { onConflict: 'github_account_id' },
  );

  if (error) {
    throw normalizeSupabaseError(error);
  }
}

/** Returns the decrypted token, or null when absent or known-revoked. */
export async function readGithubAccessToken(githubAccountId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('github_credentials')
    .select('access_token_encrypted, revoked_at')
    .eq('github_account_id', githubAccountId)
    .maybeSingle();

  if (error) {
    throw normalizeSupabaseError(error);
  }
  if (!data || data.revoked_at) {
    return null;
  }
  return decryptSecret(data.access_token_encrypted);
}

/**
 * Records that GitHub rejected this credential (401) — i.e. the student
 * revoked the app's authorization, or the token was invalidated. Stops us
 * retrying a dead token and drives the "reconnect GitHub" prompt.
 */
export async function markGithubCredentialRevoked(githubAccountId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('github_credentials')
    .update({ revoked_at: new Date().toISOString() })
    .eq('github_account_id', githubAccountId);

  if (error) {
    throw normalizeSupabaseError(error);
  }
}
