# ADR-002: Database Migrations — Supabase CLI

**Status:** Accepted
**Related:** [ADR-001](ADR-001-authentication.md) (authentication); backend audit that surfaced this conflict

## Context

[CLAUDE.md](../../CLAUDE.md) §3/§15 originally mandated **Prisma** as the sole ORM and migration tool ("every schema change is a Prisma migration"; "No raw SQL in features. Prisma everywhere"). A backend audit found: no `prisma/` directory exists anywhere in the monorepo, no `prisma` dependency in any `package.json`, and no Prisma schema was ever started. Instead, an empty `supabase/migrations/` scaffold (alongside `functions/`, `policies/`, `seed/`) already exists, matching the Supabase CLI's own project layout — though `supabase init` was never actually run (no `supabase/config.toml` present).

Separately, [ADR-001](ADR-001-authentication.md) adopts Supabase Auth, whose users live in Supabase's own `auth` schema. Prisma cannot introspect or migrate Supabase-managed schemas (`auth`, `storage`) — a Prisma-based migration workflow would only ever cover the `public` schema's application tables, leaving `auth`/`storage` schema knowledge (RLS policies referencing `auth.uid()`, storage bucket policies) split across two disconnected tools and two disconnected migration histories. That split works against CLAUDE.md §15.9's requirement that schema and access-control review happen together per table.

## Decision

**Use the Supabase CLI as the sole database migration system.** All schema changes — tables, enums, constraints, RLS policies, and storage bucket policies — are written as SQL migration files under `supabase/migrations/`, applied via `supabase db push` (or `supabase migration up` against a linked project), and reviewed as SQL in PRs like any other code change.

**The Supabase project is the source of truth for backend infrastructure** (schema, auth configuration, storage buckets, RLS policies) — not a schema file in the application repository. `supabase/migrations/` is the versioned history that produces that project state; it does not sit in front of it as an independent abstraction layer.

**TypeScript types are generated, not hand-written.** After any migration is applied, `apps/web/src/lib/supabase/types.ts` is regenerated via `supabase gen types typescript` and committed in the same PR as the migration. It is never edited by hand — the same "derive types from the schema, never let them diverge" principle CLAUDE.md §7.3 already applies to Zod, applied here to the database boundary instead.

Prisma is dropped entirely — not installed, not used for any part of the schema or data-access layer.

## Repository Workflow

1. A schema change starts with `supabase migration new <descriptive_name>` — creates a timestamped SQL file in `supabase/migrations/`.
2. The migration is written by hand as plain SQL (DDL, `CHECK` constraints, RLS policies, grants). This *is* the schema-defining SQL CLAUDE.md §15.1 expects at the migration boundary — a different concern from raw SQL inside application query code, which remains prohibited (§15.8, restated for this workflow).
3. Locally, `supabase start` runs the full local stack (Postgres, Auth, Storage) and `supabase db reset` replays all migrations from scratch against it — the same "run against a clean instance" discipline CLAUDE.md §28.5 already requires, now via the Supabase CLI's own local stack instead of a bare Docker Compose Postgres container.
4. Migration + regenerated types + application code land in the **same PR** (CLAUDE.md §15.5) — an out-of-sync `types.ts` is treated as a broken build, since it silently reintroduces the exact type/schema drift Zod-derived types are meant to prevent elsewhere in the stack.
5. Destructive migrations (drops, renames) still require a second review and a stated rollback note (CLAUDE.md §15.5) — the CLI enforces neither of these; it remains a review-process requirement, not a tooling guarantee.
6. `supabase/migrations/` history is never rewritten or squashed once merged to `main` (CLAUDE.md §28.8).

## Type Generation Workflow

1. After a migration is applied to the local (or a linked) Supabase instance: `supabase gen types typescript --local` (local dev) or `supabase gen types typescript --project-id <ref>` (against a hosted project) — overwrites `apps/web/src/lib/supabase/types.ts` in full.
2. This file's contents are 100% generated. The placeholder currently in the repo (`Tables: Record<string, never>`, etc.) was deliberately shaped to match the generator's real output structure, so this is a pure overwrite, never a refactor — verified when the placeholder was first written.
3. No other file hand-authors database shapes; `client.ts` / `server.ts` / `admin.ts` all parameterize on the single generated `Database` type.
4. A CI check enforcing "generated types match the current migration history" does not exist yet and is required follow-up application/tooling work before this workflow is fully safe against silent drift (see Consequences).

## Consequences

**Positive:**
- One tool, one migration history, one schema owner — `auth`, `storage`, and `public` schema changes (including RLS policies that reference `auth.uid()`) are reviewed together, matching how they actually depend on each other.
- Eliminates an entire dependency (Prisma) and its own migration-history/drift-detection machinery — less tooling surface for a small team to maintain (CLAUDE.md §2.2).
- RLS policies, which ADR-001 makes the primary authorization boundary, are naturally co-located with the tables they protect in the same migration files.

**Negative / follow-up work required (application code and tooling, out of scope for this ADR):**
- Raw SQL migration files carry more manual-review burden than Prisma's declarative schema diffing — reviewers must read SQL directly; CLAUDE.md §25's review checklist should get a line item for migration review once schema work starts.
- No Prisma Client means no auto-completed query builder with join-inference; `queries.ts` functions must be written directly against `@supabase/supabase-js`'s query builder, which is less ergonomic for complex joins — an accepted trade-off given CLAUDE.md §6.1's "functions do one thing," but worth naming explicitly.
- Local onboarding (CLAUDE.md §28.1) changes from "Docker Compose for Postgres" to "`supabase start`" — any onboarding scripts referencing Docker Compose for Postgres specifically need a follow-up fix.
- The CI check enforcing "generated types match migration history" (Type Generation Workflow, step 4) does not exist yet and must be built before this workflow is fully safe against silent drift.
