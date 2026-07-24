# ADR-004: Durable GitHub Credentials

**Status:** Accepted
**Related:** [ADR-001](ADR-001-authentication.md) (Supabase Auth), [ADR-003](ADR-003-server-authoritative-identity.md) (GitHub is the only student identity path), [ADR-005](ADR-005-immutable-analysis-snapshots.md)

## Context

Repository import authenticated to GitHub using `session.provider_token` — the OAuth token Supabase returns on the session object. That token is **ephemeral**: Supabase does not persist it, and it is dropped when the Supabase access token refreshes (roughly hourly). The practical effect was a silent, time-delayed failure: import worked immediately after login and then stopped, with the student seeing a "reconnect" error for no reason they could perceive.

Three things had to be true of a fix: the token must survive beyond the session; it must never be reachable from the browser; and losing/rejecting a token must produce a clean re-authorization path rather than a dead end.

## Decision

**Capture the GitHub access token at the OAuth callback and persist it encrypted, in a table no client role can reach.**

1. **Capture point.** `app/auth/callback/route.ts` calls `captureGithubOAuthCredentials()` immediately after `exchangeCodeForSession()` — the only moment the provider token exists. This is additive: it does not change how authentication works (no change to session handling, role assignment, redirects, or provider configuration), consistent with ADR-003.
2. **Storage.** A dedicated `github_credentials` table, **not** columns on `github_accounts`. `github_accounts` is owner-readable via RLS, so anything stored there is fetchable by the signed-in user through PostgREST. `github_credentials` instead has RLS enabled with **zero policies** and table grants revoked from `anon`/`authenticated` — two independent layers making it unreachable except by the service-role client.
3. **Encryption at rest.** AES-256-GCM (authenticated encryption) via `lib/crypto/secret-cipher.ts`, in a versioned self-describing envelope: `v1.<iv>.<authTag>.<ciphertext>`. The key (`GITHUB_TOKEN_ENCRYPTION_KEY`) lives only in the application environment, never in the database — so a database dump alone yields no usable token.
4. **Resolution order** (`features/github/service.ts`): stored credential → session `provider_token` (with opportunistic persistence, so the system self-heals into the durable path) → `token_unavailable`. This also means that if credential storage is unavailable (e.g. service-role key unset), the feature degrades to exactly its previous behavior instead of breaking.
5. **Revocation.** `withGithubToken()` is the single wrapper around every GitHub call; a `401` marks `revoked_at` on the credential and surfaces `unauthorized`. A revoked credential reads as absent, so we stop retrying a dead token.
6. **Reconnect.** `requiresGithubReconnect(kind)` drives a "Reconnect GitHub" affordance that routes to `/login?next=…`; re-running GitHub OAuth re-captures a fresh token and clears `revoked_at`.

## Alternatives Considered

**Supabase Vault** (`supabase_vault` is available). Rejected for this MVP: it requires SECURITY DEFINER RPC wrappers to reach from the app, and its keys are managed by the same platform that holds the database — whereas an app-held key means a database compromise alone is insufficient. Worth revisiting if we want key management out of application config.

**pgcrypto column encryption.** Rejected: the key still has to come from somewhere, and passing it in SQL risks it landing in query logs.

**GitHub App installation tokens** (short-lived, minted from a private key). Architecturally the strongest option — no long-lived user token at rest at all — but it is a different integration model (installations, not user OAuth) and a larger change than this sprint. Recorded as the likely successor.

**Storing the token unencrypted, service-role-only.** Rejected: unreachable-by-RLS is not the same as unreadable; encryption is what makes a leaked dump useless.

## Consequences

**Positive**
- Repository access survives session refreshes — the original defect is gone.
- Tokens are unreachable from any browser session and useless without an environment-held key.
- Revoked authorization is detected once, centrally, and produces a designed reconnect path.

**Negative / follow-up**
- `GITHUB_TOKEN_ENCRYPTION_KEY` is now operationally significant: rotating it invalidates stored tokens (students reconnect; no data loss). There is no key-versioning/rotation routine yet — the envelope is versioned to make one possible.
- Credential storage requires a real `SUPABASE_SERVICE_ROLE_KEY`. Until one is configured the app silently falls back to session tokens (i.e. the old behavior), which is safe but not durable.
- `token_scopes` is stored but not yet populated; it is intended for detecting the FR-1.2 private-repo escalation.
- No refresh-token handling: GitHub OAuth App tokens do not expire by default, so re-authorization is the recovery path. GitHub Apps would change this.
