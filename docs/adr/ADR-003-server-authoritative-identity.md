# ADR-003: Server-Authoritative Identity — GitHub-only students, invitation-only recruiters

**Status:** Accepted
**Supersedes:** the recruiter magic-link portion of [ADR-001](ADR-001-authentication.md) (Supabase Auth remains the auth system; only the recruiter *entry point* and the role-assignment mechanism change).
**Related:** [ADR-001](ADR-001-authentication.md), [ADR-002](ADR-002-database-migrations.md)

## Context

The first auth implementation (per ADR-001) offered two public sign-in paths: GitHub OAuth for students and email magic-link for recruiters. A security review found a class of defects around **client-controlled identity**:

1. **Role injection / privilege escalation at signup.** Role was carried from the browser as Supabase Auth `user_metadata` (`data: { role }` on the OTP request) and materialized by the `handle_new_user` trigger via `coalesce((raw_user_meta_data->>'role')::user_role, 'student')`. Because `user_metadata` is set from the client-supplied `data` option, a crafted request could submit `role: 'admin'` and self-provision an admin on first sign-in — admin unlocks read access to regulated consent and audit data (schema §18.7 policies). The existing `prevent_role_self_escalation` trigger did **not** cover this: it fires on `UPDATE`, while the injection happens at the `INSERT`.
2. **Public recruiter self-registration.** Open `signInWithOtp` plus `disable_signup: false` let *any* email self-register as a recruiter, contradicting PRD FR-1.3 ("recruiters join only via workspace invitation issued by an operator"). The schema already encoded the intended model (no client INSERT policy on `organizations`/`recruiters`), but the auth entry point ignored it.
3. **Unnecessary complexity and delivery fragility.** The magic-link path added a Zod form schema, an action-state discriminated union, a client form with `useActionState`, a role parameter threaded through four layers, and a hard dependency on transactional email (which also has a server-initiated-PKCE cross-device failure mode). All of this served a recruiter self-signup flow the product does not actually want.

The product decision that resolves all three: **there are exactly two identity paths — students via GitHub OAuth, and recruiters by invitation only — and the server, never the client, determines role.**

## Decision

1. **GitHub OAuth is the only public identity path.** Students authenticate exclusively with GitHub. There is no public email/magic-link sign-in.
2. **Role is server-authoritative and always `student` for public signup.** It is assigned in two mirrored, hard-coded places — the `handle_new_user` trigger and `getOrCreateProfile`'s self-heal insert — and is **never** derived from `raw_user_meta_data`/`user_metadata` or any other client-controlled input. `full_name`/`avatar_url` continue to come from GitHub provider metadata: they are non-privileged display fields, not an authorization boundary.
3. **Recruiters cannot self-register.** The recruiter magic-link form is removed and replaced with `/recruiter-access`, a public informational page ("invitation-only", "coming soon", placeholder contact) that creates no account. Recruiter/admin accounts are provisioned only by an operator through the service-role client, out of band.
4. **The role parameter and all client role plumbing are removed** end to end: no role field in any form, no role in any Server Action, no `data.role` in any Supabase call, no role read from metadata in any bootstrap path.

## Removed

- `signInWithMagicLink` (service), `requestMagicLinkAction` (action), `MagicLinkRequestSchema` (`schemas.ts`, deleted), `MagicLinkActionState` (`types.ts`, deleted), and the magic-link/email form and role plumbing in `AuthForm.tsx`.
- The `role`-from-`raw_user_meta_data` branch in `handle_new_user` (migration `20260723160000_harden_handle_new_user_server_authoritative_role.sql`).

## Alternatives Considered

**Validate the client role server-side instead of removing it.** Rejected. Even with an allowlist, a self-service path that lets an *unauthenticated* caller assert "I am a recruiter" contradicts FR-1.3 and keeps an authorization attribute on the wrong side of the trust boundary. Removing the input is simpler and strictly safer than policing it.

**Keep magic-link for recruiters but gate it behind invitations now.** Rejected as out of scope and premature: invitations are not being built yet, and retaining the email path keeps the delivery dependency and PKCE fragility for zero present benefit. The placeholder page holds the product space until invitations are designed.

**Disable the Supabase email provider entirely (dashboard).** Recommended as defense-in-depth but not sufficient on its own and not the primary control — the trigger hardening is what makes role injection impossible regardless of which provider is enabled. Tracked below as a manual follow-up.

## Consequences

**Positive:**
- Role injection is structurally impossible: no code path derives role from client input, and the trigger — the one place role is set at account creation — is a hard literal.
- The public attack surface shrinks: one OAuth button, no email input, no role field, no self-service recruiter account.
- Less code and one fewer runtime dependency (transactional email is no longer on the critical path for any sign-in).

**Negative / follow-up work required (out of scope for this ADR):**
- **Recruiter onboarding is now a stub.** Real recruiter access requires building operator-issued invitations (`supabase.auth.admin.inviteUserByEmail(email, { data: … })` via service-role, plus `organizations`/`recruiters` seeding). Until then, no recruiter can sign in at all — intended.
- **Defense-in-depth dashboard step:** set Supabase Auth `disable_signup: true` is *not* wanted (it would block student GitHub signup); instead, **disable the Email provider** in the dashboard so no email/OTP path exists at the GoTrue layer either. The connector cannot automate this; it is a manual step.
- **Role-based route gating is deferred.** Every account is a student today, so middleware gates on session alone. When recruiter routes exist they will need an explicit role check (middleware or layout), not merely a session check.
- The hardened migration must be applied to every environment (the dev project application was pending a connector outage at authoring time — see the change's deliverables note).
