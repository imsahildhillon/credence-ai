# ADR-005: Immutable Analysis Snapshots

**Status:** Accepted
**Related:** [ADR-002](ADR-002-database-migrations.md), [ADR-004](ADR-004-durable-github-credentials.md)

## Context

A queued analysis job recorded only `analyses.profile_id` + `status`. Which repositories it covered was implicit: "whatever `repositories.included` says **at the time the worker runs**".

That is not a job definition — it is a late-bound query, and it breaks the product's central promise. Between enqueue and execution a student can change their selection, re-import can rewrite repository metadata, and a repository can be renamed or made private. The same job could therefore analyze a different set than the one the student reviewed and approved, and a historical assessment could never be explained against the inputs that actually produced it. CLAUDE.md §14.4 requires a versioned, auditable pipeline where any assessment can be reproduced; §15.2 requires provenance to be structural, not conventional. Late binding makes both impossible.

## Decision

**An analysis job owns an immutable snapshot of exactly what it will analyze, written atomically with the job.**

1. **`analysis_repositories`** — one row per repository in the run, preserving `repository_id`, `github_repo_id`, `full_name`, `default_branch`, `is_private`, `primary_language`, and `commit_sha`. These are copies, not joins: later edits to `repositories` cannot alter a past run's definition.
2. **Commit pinning.** Before the snapshot is frozen, `resolveHeadCommitShas()` best-effort resolves each repository's HEAD commit, so a run is pinned to exact commits — the strongest form of reproducibility available without cloning. It is deliberately *total*: GitHub being unreachable, rate-limited, or the token revoked yields null SHAs rather than blocking enqueue (`commit_sha` is nullable, and a null means "latest commit at execution time"). Enqueueing must not depend on GitHub availability (CLAUDE.md §19.5).
3. **Atomicity + ownership in SQL.** `enqueue_analysis_with_snapshot()` (SECURITY DEFINER) creates the job and its snapshot in one transaction, building the snapshot from a query joined through `github_accounts` to `auth.uid()`. Ownership is therefore validated *by construction* in the database, not merely asserted by the action: only the caller's own repositories can ever be snapshotted, and a caller-supplied `commit_sha` map keyed by repository id is applied only to rows that ownership-scoped query already returned — a forged id is ignored, it cannot inject a foreign repository. A job can never exist without its snapshot (CLAUDE.md §14.5).
4. **Immutability is enforced by the database.** A `BEFORE UPDATE` trigger raises unconditionally, so even the service-role pipeline cannot mutate a snapshot. Client roles additionally have `INSERT/UPDATE/DELETE` revoked. `DELETE` is left possible so the account-deletion cascade still satisfies the right to erasure (PRD §12.5) — "never changes" is about mutation, not retention.
5. **The worker contract:** the analysis worker MUST read `analysis_repositories`, never `repositories.included`. `listAnalysisSnapshot()` is the accessor; the `/analysis` screen already uses it, so what the student sees is precisely what will run.

This replaces the direct `analyses_insert_own_queued` RLS policy — enqueueing now has exactly one validated entry point.

## Alternatives Considered

**Keep `repositories.included` and have the worker read it.** Rejected — the defect itself.

**Snapshot as a JSON blob on `analyses`.** Rejected: unqueryable, unconstrained, no foreign keys, and it would not let us ask "which runs included this repository?" — a question the evidence layer will need.

**Copy rows but allow updates** (e.g. to backfill a SHA later). Rejected: a mutable snapshot is not a snapshot. A later run gets a new snapshot; that is what versioning is for.

**Resolve commit SHAs in the worker instead of at enqueue.** Rejected as the primary mechanism: the point of pinning is to capture the state the student approved. Kept as the fallback semantic for null SHAs.

## Consequences

**Positive**
- A queued job is a complete, self-contained, reproducible definition of work.
- Students can freely edit their selection after starting a run without corrupting it.
- Provenance for the future Evidence Engine is structural: every assessment traces to a snapshot row, which names an exact repository and (usually) an exact commit.

**Negative / follow-up**
- Enqueue now costs up to `MAX_COMMIT_SHA_LOOKUPS` (25) extra GitHub calls. Beyond 25 repositories the remainder snapshot with null SHAs — acceptable for the V1 scale envelope, but it is a cap, not a paginating solution.
- Snapshots are never garbage-collected; they accumulate per run. Fine at MVP volume, a retention question later.
- `repository_id` is `ON DELETE RESTRICT`, so repository rows referenced by a past run cannot be hard-deleted without first removing the analyses that used them — deliberate (it protects provenance) but it constrains the account-deletion script's ordering.
- Re-running an analysis is not yet implemented; when it is, it must create a *new* job + snapshot rather than mutating an existing one.
