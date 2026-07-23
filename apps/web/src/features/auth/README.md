# features/auth/

Identity only — no dashboards, no product features (PRD FR-1). Supabase Auth (ADR-001) is the system of record; this module is the app-side orchestration layer around it. Identity is **server-authoritative** (ADR-003): the browser never supplies a role or any other authorization attribute.

**Public interface:**

- `server/service.ts` — `getCurrentUser`, `signInWithGithub`, `signOut`, `getOrCreateProfile`, `toSafeRedirectPath`. The only layer that calls `@/lib/supabase/{server,admin}` for auth purposes.
- `server/actions.ts` — Server Actions (`signInWithGithubAction`, `signOutAction`) bound to forms in `components/AuthForm.tsx` and route layouts. Pages never call `service.ts` directly. No action accepts a role or identity attribute from the request.
- `components/AuthForm.tsx` — the single sign-in UI: one "Continue with GitHub" button, plus a link to `/recruiter-access`. No email field, no role selector, no recruiter form.

**Key invariants:**

- **GitHub OAuth is the only public identity path, and it always yields `role = student`** (ADR-003). There is no public email/magic-link sign-in and no way for the public to create a recruiter or admin.
- Role is assigned by the server in exactly two mirrored places, both hard-coded to `student`: the `handle_new_user` DB trigger (primary, transactional) and `getOrCreateProfile`'s self-heal insert (`PUBLIC_SIGNUP_ROLE`). Neither reads `user_metadata.role` — that field is client-influenceable and must never determine authorization.
- Recruiters/admins are provisioned only by an operator through the service-role client, out of band. `/recruiter-access` is an informational placeholder — it creates no account.
- `getCurrentUser` always calls `auth.getUser()` (server-revalidated), never `auth.getSession()` alone — the latter trusts a client-writable cookie for an authorization decision, which CLAUDE.md §18.2 forbids.
- `toSafeRedirectPath` gates every `next` redirect target; a `next` query param is untrusted input and must never become an open redirect.

**Full flow, threat model, and recruiter-onboarding rationale:** [docs/04-system-architecture.md](../../../../../docs/04-system-architecture.md) § Authentication & Session Flow. **Dashboard setup required before GitHub sign-in works:** see that section's "Manual dashboard steps."

Related: [ADR-001](../../../../../docs/adr/ADR-001-authentication.md) (Supabase Auth), [ADR-003](../../../../../docs/adr/ADR-003-server-authoritative-identity.md) (server-authoritative identity; supersedes ADR-001's recruiter magic-link path).
