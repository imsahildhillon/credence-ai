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
| `middleware.ts` | Edge middleware | anon | Session refresh only — no access-rule enforcement lives here |

## Async pipeline

Redis + BullMQ remain the job spine for AI analysis and other slow/expensive work (CLAUDE.md §14) — Supabase's role is persistence, auth, and storage, not job orchestration. Job processors read/write through the same `@supabase/supabase-js` clients as request handlers, using the service-role client only where a job genuinely needs to act outside any single user's session.

## Open / future sections

This document currently covers only the backend-platform decisions resolved by the audit. Sections to add as they're designed (each with its own ADR where CLAUDE.md §3/§24.2 requires one):

- Data model detail (entity relationships, RLS policy design per table)
- AI evaluation pipeline architecture (CLAUDE.md §17)
- Search/ranking implementation (FR-9)
- Notification delivery architecture (FR-14)
