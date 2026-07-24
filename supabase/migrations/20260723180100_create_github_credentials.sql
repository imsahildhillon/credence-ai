-- Durable GitHub OAuth credentials.
--
-- Previously repository imports depended on the Supabase session's
-- `provider_token`, which is ephemeral (dropped on a Supabase token refresh)
-- — so imports silently stopped working some time after login. Tokens are
-- now captured at the OAuth callback and persisted here.
--
-- SECURITY POSTURE (why this is its own table, not columns on
-- github_accounts): `github_accounts` has an owner-readable RLS policy, so
-- anything stored there is reachable by the signed-in user through PostgREST.
-- Credentials must never be client-reachable at all, so they live in a table
-- with RLS enabled and *deliberately zero policies* — deny-by-default for
-- `anon` and `authenticated` — plus revoked table grants as a second,
-- independent layer. Only the service-role client (which bypasses RLS) can
-- read or write them.
--
-- The stored value is an AES-256-GCM envelope whose key lives only in the
-- application environment (GITHUB_TOKEN_ENCRYPTION_KEY), never in the
-- database — so a database dump alone cannot yield a usable token
-- (CLAUDE.md §18.5, §18.6). Classification: regulated.
create table public.github_credentials (
  github_account_id uuid primary key references public.github_accounts (id) on delete cascade,
  access_token_encrypted text not null,
  token_scopes text,
  captured_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.github_credentials is 'Encrypted GitHub OAuth access tokens, one row per linked GitHub account. No RLS policies by design — service-role only. Ciphertext is AES-256-GCM; the key lives in the app environment, not the database. Classification: regulated.';
comment on column public.github_credentials.access_token_encrypted is 'Versioned AES-256-GCM envelope: v1.<iv_b64>.<authTag_b64>.<ciphertext_b64>.';
comment on column public.github_credentials.revoked_at is 'Set when GitHub rejects the token (401) — i.e. the student revoked authorization. Cleared when a fresh token is captured on re-authorization.';

create trigger set_github_credentials_updated_at
  before update on public.github_credentials
  for each row
  execute function public.set_updated_at();

alter table public.github_credentials enable row level security;

-- No policies are created on purpose: with RLS enabled and no policy, both
-- anon and authenticated are denied every operation. Revoking the default
-- Supabase table grants makes it unreachable even if a policy is ever added
-- by mistake.
revoke all on public.github_credentials from anon, authenticated;
