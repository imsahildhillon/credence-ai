# lib/supabase/

Supabase client foundation — database, auth, and storage access (CLAUDE.md §3). Each file has one responsibility and one intended caller:

| File            | Runs in                                      | Uses                       | Import from client components?                |
| --------------- | -------------------------------------------- | -------------------------- | --------------------------------------------- |
| `client.ts`     | Browser                                      | anon key                   | Yes — directly, never via `index.ts`          |
| `server.ts`     | Server Components / Actions / Route Handlers | anon key + request session | No                                            |
| `admin.ts`      | Server-only (jobs, webhooks)                 | service role key           | No — bypasses RLS entirely                    |
| `middleware.ts` | Next.js middleware (edge)                    | anon key                   | No                                            |
| `types.ts`      | n/a                                          | —                          | Placeholder for `supabase gen types` output   |
| `errors.ts`     | Anywhere                                     | —                          | Normalizes Supabase errors to a typed catalog |

`index.ts` re-exports everything **except** `client.ts` — that module is `'use client'`, while `server.ts`/`admin.ts` guard themselves with `server-only`; bundling all four through one barrel would poison client-component imports. Client code imports `@/lib/supabase/client` directly.

**Invariant:** the service-role key (`admin.ts`) is reachable only from files that never import `'use client'` or ship to the browser. `server-only` enforces this at build time, not just by convention.

**Auth is implemented** — see `apps/web/src/features/auth/` (the orchestration/service layer) and `docs/04-system-architecture.md` § Authentication & Session Flow (full flow, redirect rules, profile bootstrap, threat model). `middleware.ts` (root) refreshes sessions and enforces route protection. `app/auth/callback/route.ts` is the GitHub OAuth code-exchange endpoint. Identity is server-authoritative: GitHub OAuth is the only public sign-in path and always yields `role = student`; there is no public email/magic-link sign-in and no public recruiter signup (ADR-003). GitHub OAuth still needs a one-time manual dashboard step (Client ID/Secret) — documented in the system-architecture doc above.
