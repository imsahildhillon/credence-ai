# ADR-001: Authentication — Supabase Auth

**Status:** Accepted
**Related:** [ADR-002](ADR-002-database-migrations.md) (database migrations); backend audit that surfaced this conflict

## Context

[CLAUDE.md](../../CLAUDE.md) §3 originally specified **Auth.js (NextAuth)** with GitHub OAuth (students) and email magic-link (recruiters) as the authentication stack. A backend audit of the connected Supabase project and the already-built `apps/web/src/lib/supabase/` client foundation found that the implemented code (`client.ts`, `server.ts`, `middleware.ts`, `app/auth/callback/route.ts`) already implements **Supabase Auth** end-to-end — a different, incompatible session/auth system from Auth.js. No Auth.js code exists anywhere in the repository (no `lib/auth.ts`, no NextAuth route handler, no adapter), despite `NEXTAUTH_URL`/`NEXTAUTH_SECRET` being present in environment validation.

This is a genuine architectural fork, not a naming difference: Auth.js and Supabase Auth have separate session cookies, separate user tables, and separate OAuth/magic-link flows. Building features against one while environment config implies the other would produce an inconsistent, partially-broken auth layer.

The MVP PRD (FR-1) requires exactly two auth methods — GitHub OAuth for students (minimal read scopes, with a separate consent-gated escalation for private-repo access, FR-1.2) and email magic-link for recruiters (invitation-gated, single-use, 7-day expiry, FR-1.3) — but does not mandate a specific implementation technology for either.

## Decision

**Adopt Supabase Auth as the sole authentication system.** Auth.js/NextAuth is not used anywhere in the product.

Supabase Auth provides:
- GitHub OAuth for student sign-up (FR-1.1), configured directly in the Supabase project dashboard per environment.
- Email magic-link (OTP) for recruiter workspace invitations (FR-1.3).
- Session management via secure, httpOnly, sameSite cookies through `@supabase/ssr`, already implemented in `apps/web/src/lib/supabase/{client,server,middleware}.ts`.
- JWTs carrying a `role` claim (`student` | `recruiter` | `admin`), consumed directly by Postgres Row Level Security policies via `auth.uid()` / `auth.jwt()`.

`NEXTAUTH_URL` and `NEXTAUTH_SECRET` are to be removed from environment validation and `.env.example` in a follow-up application-code change — this ADR is documentation-only and does not itself modify code or config.

## Alternatives Considered

**1. Auth.js (NextAuth) — the originally documented choice.**
Rejected. Auth.js has no native integration with Postgres Row Level Security: a request authenticated via Auth.js is invisible to Postgres unless custom JWT signing and a matching claims setup is built and maintained by hand. That would mean re-implementing, in application code, the exact RLS-integration behavior Supabase Auth provides for free — working directly against CLAUDE.md §18.2's requirement that authorization be deny-by-default and enforced structurally, not layered on afterward. It would also mean discarding the already-built, working `lib/supabase/{client,server,middleware}.ts` and `/auth/callback` route.

**2. Hand-rolled sessions (custom JWT issuance, no library).**
Rejected outright — CLAUDE.md §2.2 ("boring technology, proven patterns") and §18 (Security Guidelines) make this a non-starter for a product whose core promise is trustworthy handling of career-sensitive data. Novelty budget is reserved for the evaluation/explainability layer, never for auth.

**3. Keep both — Auth.js for recruiters, Supabase Auth for students.**
Rejected. Splitting the two user classes across two different auth systems doubles the session-handling, RLS-integration, and security-review surface for no product benefit. FR-1 requires different *sign-in methods* per role, not different underlying *technology* — Supabase Auth supports both natively.

## Consequences

**Positive:**
- Row Level Security becomes the primary, structurally-enforced authorization boundary (CLAUDE.md §18.2), with `auth.uid()` available natively in every policy — no custom claims-bridging code to build or maintain.
- The existing `lib/supabase/*` client foundation is validated as architecturally correct and needs no rework.
- One session system, one cookie contract, one place (`lib/supabase/errors.ts`) to normalize auth errors.
- Private-repo GitHub scope escalation (FR-1.2) can reuse Supabase Auth's provider re-authentication flow rather than requiring a bespoke second OAuth client.

**Negative / follow-up work required (application code and infrastructure, out of scope for this ADR):**
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, and any Auth.js-shaped assumptions must be removed from `apps/web/src/config/env.ts` and `.env.example`.
- The GitHub OAuth app and email-provider configuration must be set up directly in the Supabase dashboard per environment (local/staging/production) — this is infrastructure configuration, tracked separately from application code changes.
- Recruiter workspace invitations (FR-1.3: single-use, 7-day expiry) are a product-layer concept built on top of Supabase's magic-link primitive, not something Supabase provides out of the box — still needs its own `consent`/`workspace` feature-layer design.
