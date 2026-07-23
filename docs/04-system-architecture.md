# System Architecture

Companion to [CLAUDE.md](../CLAUDE.md) (engineering standards) and [docs/adr/](adr/) (why specific choices were made). This document describes the resolved backend architecture as it stands today; it grows section-by-section as further decisions are made — each addition should link back to its ADR.

## Backend Platform: Supabase

Per [ADR-001](adr/ADR-001-authentication.md) and [ADR-002](adr/ADR-002-database-migrations.md), Supabase is the backend platform for V1:

- **Auth:** Supabase Auth — GitHub OAuth for students, email magic-link for recruiters (CLAUDE.md §3, §18.2).
- **Database:** Supabase-hosted PostgreSQL. Schema and migrations are managed exclusively through the Supabase CLI (`supabase/migrations/`) — not Prisma, not an ORM.
- **Source of truth:** the live Supabase project's schema is authoritative. `apps/web/src/lib/supabase/types.ts` is generated from it (`supabase gen types typescript`) and is never hand-edited.
- **Storage:** Supabase Storage buckets (e.g., a private `resumes` bucket), gated by the same RLS model as the database.
- **Data access:** application code reads and writes through `@supabase/supabase-js` (via `apps/web/src/lib/supabase/`), parameterized on the generated `Database` type — no ORM layer sits in between.
- **Authorization enforcement:** Postgres Row Level Security is the primary, structurally-enforced deny-by-default boundary (CLAUDE.md §18.2) — not an application-layer-only check. The single consent-check service (CLAUDE.md §16.5) sits on top of RLS, not instead of it.

## Client responsibilities (`apps/web/src/lib/supabase/`)

Full detail lives in that module's own README; summarized here for architectural context:

| Client | Runs in | Key used | Purpose |
|---|---|---|---|
| `client.ts` | Browser | anon | User-scoped, RLS-enforced |
| `server.ts` | Server Components / Server Actions / Route Handlers | anon + session cookie | User-scoped, RLS-enforced |
| `admin.ts` | Server-only (jobs, webhooks) | service role | Bypasses RLS — used only where the caller independently authorizes (never per-request on a user's behalf) |
| `middleware.ts` | Edge middleware | anon | Session refresh + route protection (see below) |

## Authentication & Session Flow

Implements Supabase Auth (ADR-001) for identity only, hardened to be **server-authoritative** (ADR-003) — no product features live here. There are exactly two identity paths: **students via GitHub OAuth**, and **recruiters by operator invitation only** (not yet built). The browser never supplies a role or any other authorization attribute.

### Why GitHub is the only student identity provider

GitHub identity *is* the product's evidence anchor — a student's credibility is built from their repositories (PRD FR-1.1, §2 "GitHub identity is core"). Authenticating students through GitHub means the identity and the primary evidence source are the same verified account, with nothing to reconcile. It also collapses the sign-in surface to a single OAuth button: no passwords to store or reset, no email-deliverability dependency, and no second credential to phish. Email/magic-link sign-in for students was removed as unnecessary complexity that served no product need.

### Why public recruiter signup was removed

The prior model let anyone self-register as a recruiter via email magic-link, with the desired role passed from the browser as `user_metadata`. This was both a product-model violation (PRD FR-1.3 requires operator-issued, invitation-only recruiter access) and a **security defect**: role travelled across the trust boundary from client to server, and a crafted request could assert `role: 'admin'` and self-provision elevated access on first sign-in (see Threat Model below). The fix is structural rather than validative — the public simply has no path to create a recruiter or admin, and the server assigns role, so there is no client-supplied role to validate or trust in the first place. Recruiter onboarding is replaced by an informational placeholder (`/recruiter-access`) until invitations are built.

### Providers

- **GitHub OAuth (students, PRD FR-1.1)** is the only configured provider, set up *in the Supabase project*, not in application code — there is no app-side OAuth client secret for the sign-in flow itself.
- **Manual dashboard steps** (cannot be automated via the Supabase connector — it has no tool that reads/writes provider config):
  1. Create a GitHub OAuth App (github.com/settings/developers). Homepage URL = the app's canonical URL per environment. **Authorization callback URL = `https://<project-ref>.supabase.co/auth/v1/callback`** — this is Supabase's fixed GoTrue callback, *not* this app's own `/auth/callback` route; GoTrue receives GitHub's redirect first, then forwards the browser on to whatever `redirectTo` the app requested.
  2. Supabase Dashboard → Authentication → Providers → GitHub: enable, paste the Client ID and Client Secret from step 1.
  3. Supabase Dashboard → Authentication → URL Configuration: set **Site URL** to the app's canonical URL per environment, and add this app's `/auth/callback` URL (e.g. `http://localhost:3000/auth/callback` for local dev) to **Redirect URLs** — Supabase rejects any `redirectTo` not on this allowlist.
  4. **Defense-in-depth (recommended):** disable the **Email** provider so no email/OTP path exists at the GoTrue layer either. The application no longer calls it, and the hardened `handle_new_user` trigger makes role injection impossible regardless, but disabling the provider removes the account-creation surface entirely. Leave `disable_signup` **off** — it would block legitimate student GitHub signup.
- No other provider (Google, etc.) is configured.

### Sign-in flow

1. `signInWithGithubAction` (`features/auth/server/actions.ts`) → `service.signInWithGithub()` calls `supabase.auth.signInWithOAuth({ provider: 'github' })` with `redirectTo` pointed at this app's `/auth/callback`, and redirects the browser to the returned provider URL. No role, email, or other identity attribute is read from the request. No extra scopes are requested — the separate, consent-gated private-repo escalation (FR-1.2) is a future github-analysis feature, not identity infrastructure.
2. GitHub is both sign-in and sign-up (OAuth does not distinguish); Supabase Auth provisions the `auth.users` row on first success. `/login` and `/signup` render the identical GitHub-only form with different framing copy only.
3. Recruiters have **no** sign-in action. `/recruiter-access` is a static informational page that creates no account.

### Redirect flow

- `app/auth/callback/route.ts` is the GitHub OAuth landing point: exchanges `code` for a session (`exchangeCodeForSession`), bootstraps the profile, then redirects to `next` (or `/dashboard` by default).
- **`next` is untrusted input.** `toSafeRedirectPath()` (`features/auth/server/service.ts`) accepts only same-origin relative paths (`/…`, never `//…` or an absolute URL) — every redirect target in this flow (`/auth/callback`, the OAuth `redirectTo`, the middleware's post-login bounce) is passed through it. This is the app's sole open-redirect guard.
- **Root middleware** (`apps/web/src/middleware.ts`) refreshes the session on every request via `updateSession()`, then applies route protection using three mutually-exclusive route sets:
  - `PUBLIC_ROUTES` (`/`, `/auth/callback`, `/recruiter-access`) — never gated.
  - `AUTH_ROUTES` (`/login`, `/signup`) — redirect to `/dashboard` if already signed in.
  - `PROTECTED_ROUTE_PREFIXES` (`/dashboard`, `/settings`, `/profile`) — redirect to `/login?next=<path>` if signed out.
  
  Because a request can match at most one of the two gated sets, the two redirect branches can never both fire — this is what rules out a redirect loop, not a special-cased loop-detection check. Every authenticated account is a student today, so a session check *is* a "student" check; recruiter routes (when they exist) will need an explicit role check, not merely a session check.
- **Layout-level checks are defense-in-depth**, not the primary gate: `(auth)/layout.tsx` and `(app)/layout.tsx` independently call `getCurrentUser()` and redirect, so a middleware matcher gap can never itself expose a protected page or leak the login form to a signed-in user (CLAUDE.md §18.2 — checked on every access, not one layer only).
- `getCurrentUser()` always calls `auth.getUser()`, never `auth.getSession()` for an authorization decision — `getUser()` revalidates the token against the Auth server; `getSession()` trusts the client-writable cookie alone.

### Profile bootstrap

Bootstrap is **idempotent, transactional, and entirely server-side**, and always assigns `role = student` — never derived from any client-controlled metadata.

- **Primary path (transactional):** the `handle_new_user` trigger on `auth.users` (migration `20260723091619_create_profiles.sql`, hardened by `20260723160000_harden_handle_new_user_server_authoritative_role.sql`) inserts a `profiles` row **inside the `auth.users` INSERT transaction** — atomic with account creation. `role` is a hard-coded `'student'` literal; it is **not** read from `raw_user_meta_data`. Because `profiles.id` *is* `auth.users.id` (shared primary key), a duplicate is a schema-level impossibility.
- **Resilient path (idempotent):** `getOrCreateProfile(user)` is the read path every page uses. It returns the existing profile; only if one is genuinely missing (self-heal for historical inconsistency, a manually-removed row, or a trigger that failed silently — CLAUDE.md §19) does it insert one, via the service-role client (`profiles` has no client-facing INSERT policy — creation is a system action, not a user privilege) with `onConflict: 'id', ignoreDuplicates: true` and a re-fetch, so a race with the trigger is harmless.
- **Role is a server literal in both paths** (`PUBLIC_SIGNUP_ROLE = 'student'`). `full_name`/`avatar_url` are still taken from provider metadata (the GitHub profile) — non-privileged display fields, not an authorization boundary — falling back to `null`.

### Threat model (identity)

| Threat | Vector (pre-hardening) | Control (now) |
|---|---|---|
| **Privilege escalation via role injection** | Role carried from browser as `user_metadata.role` and copied into `profiles.role` by the signup trigger; a crafted request could assert `role: 'admin'` and self-provision admin (read access to regulated consent/audit data). The `prevent_role_self_escalation` trigger did *not* catch it — it fires on UPDATE, the injection was at INSERT. | Role is a hard-coded server literal in the trigger and in `getOrCreateProfile`; no code path reads role from client input. Injection is structurally impossible, not merely validated against. |
| **Unauthorized recruiter/admin account creation** | Open `signInWithOtp` + `disable_signup: false` let any email self-register as recruiter. | No public path creates a recruiter or admin at all; GitHub OAuth only ever yields `student`. Recruiter/admin provisioning is operator-only via the service-role client. Recommended dashboard hardening: disable the Email provider. |
| **Open redirect** | A `next` param could point off-origin. | `toSafeRedirectPath()` allows only same-origin relative paths; applied to every redirect target. |
| **Session forgery / stale-cookie trust** | Trusting a client-writable session cookie for authorization. | `auth.getUser()` (server-revalidated) is used for every authorization decision; `getSession()` is never the gate. |
| **Broken access control at the data layer** | — | Independent of app-layer auth: Postgres RLS is deny-by-default on every table (schema migrations), so even a mistaken app-layer decision cannot expose another user's rows. Auth here is one layer of several. |

### Error handling

| Failure | Where | Behavior |
|---|---|---|
| OAuth init fails (provider misconfigured, network) | `signInWithGithubAction` | Redirects to `/login?error=oauth_init_failed`, calm inline message |
| Code exchange fails (expired/revoked OAuth grant) | `/auth/callback` | Redirects to `/login?error=oauth_callback_failed` |
| Callback hit with no `code` | `/auth/callback` | Redirects to `/login?error=oauth_missing_code` |
| Profile bootstrap fails at callback time | `/auth/callback` | Swallowed there deliberately — `getOrCreateProfile` retries the same self-healing read on the very next protected-page render, so a transient failure doesn't strand the user (CLAUDE.md §19.5, partial failure is honest, not fatal) |

### Recruiter onboarding (future work)

Recruiter access is **invitation-only and not yet implemented**. `/recruiter-access` is a public placeholder (invitation-only notice, "coming soon", placeholder contact) that creates no account. The intended flow, when built (PRD FR-1.3): an operator issues a single-use, 7-day invitation via `supabase.auth.admin.inviteUserByEmail(email, { data: … })` (service-role) with the organization/workspace seeded in `organizations`/`recruiters`; the invited recruiter completes sign-in through the invite link. Because role is set by the *inviter* (server-side, service-role) and never by the recruiter, this stays consistent with the server-authoritative model — the invitee has no self-asserted role at any point.

## Async pipeline

Redis + BullMQ remain the job spine for AI analysis and other slow/expensive work (CLAUDE.md §14) — Supabase's role is persistence, auth, and storage, not job orchestration. Job processors read/write through the same `@supabase/supabase-js` clients as request handlers, using the service-role client only where a job genuinely needs to act outside any single user's session.

## Open / future sections

This document currently covers only the backend-platform decisions resolved by the audit. Sections to add as they're designed (each with its own ADR where CLAUDE.md §3/§24.2 requires one):

- Data model detail (entity relationships, RLS policy design per table)
- AI evaluation pipeline architecture (CLAUDE.md §17)
- Search/ranking implementation (FR-9)
- Notification delivery architecture (FR-14)
