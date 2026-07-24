# ADR-006: Evidence Normalization & Idempotent Ingestion

**Status:** Accepted
**Related:** [ADR-004](ADR-004-durable-github-credentials.md) (durable credentials), [ADR-005](ADR-005-immutable-analysis-snapshots.md) (snapshots define the work)

## Context

The Evidence Engine — and eventually every assessment — must read a student's engineering activity. That activity arrives as seven differently-shaped GitHub REST payloads (repository, commit, PR, review, issue, release, contributor), each with its own field names, nesting, and identity scheme.

Three problems had to be answered before any of it is persisted:

1. **Shape.** If GitHub objects are stored verbatim, every downstream consumer learns GitHub's schema, and a provider change (or a second evidence source — resumes, certificates) breaks them all.
2. **Identity.** Analyses are re-runnable by design. Running one twice must not double-count a commit, or every "how much did they build" signal inflates.
3. **Failure.** A student's repository can be deleted, renamed, made private, or hit a rate limit mid-run. One bad repository must not destroy a whole analysis.

## Decision

### Normalization

**No raw GitHub object is ever persisted or exposed.** Every signal is mapped, by pure functions in `mapper.ts`, into one `evidence_items` row with a single vocabulary:

`source_type` · `github_id` · `title` · `occurred_at` · `author_login` · `external_url` (raw_url) · `payload` (JSON) · `confidence`

`evidence_type` remains the coarse category (`github_repository`); `source_type` (new enum) carries which signal produced the row. Payloads keep only fields with engineering meaning — the rest is dropped, not mirrored (PRD §12.6 data minimization). A README is stored as a bounded excerpt, never a full copy.

Two deliberate honesty rules in the mapping:
- Unfetched metrics are `null`, never `0` — absence of data is never reported as a measured zero.
- `payload.detailFetched` records whether the enriched detail call happened, so a consumer can tell "no additions" from "additions unknown".

`confidence` is a **numeric ingestion fidelity** (1.0 = read directly from the source API), explicitly *not* the `confidence_level` enum. That enum remains the only confidence ever shown to a user and belongs to assessments (CLAUDE.md §5 domain vocabulary). Naming them apart keeps the assessment-confidence promise intact.

### Idempotency

A unique constraint on `(repository_id, source_type, github_id)` is the deterministic identity, and ingestion is a single batched **upsert** on that key. `github_id` is `text` so it holds either GitHub's numeric id or a commit **SHA** — the only stable identity a commit has. Re-running an analysis therefore refreshes evidence in place and can never duplicate it. NULLs never conflict in Postgres, so non-GitHub evidence (resume claims) is unaffected by the constraint.

### Failure isolation & retry

- Each collection **stage** runs guarded: a repository with issues disabled or an unreadable README still yields its commits and PRs. Stage failures are returned as data, not thrown.
- Each **repository** is isolated in the worker: a failure records an `analysis_errors` row (stage, kind, message, `retryable`) and the run continues.
- Terminal state is honest: `completed` only when nothing failed, `partial` when some evidence was produced alongside failures, `failed` when none was.
- An `unauthorized` (revoked token) is the one failure that is *not* per-repository — it will fail identically for every remaining repository, so it is raised once, marks the credential revoked (ADR-004), and skips the remainder with an explicit reason rather than hammering GitHub.
- **Retry is at the job level, not the row level.** Because ingestion is idempotent, re-running a `partial`/`failed` analysis is always safe — there is no partial-write to reconcile. `analysis_errors.retryable` classifies whether a retry could plausibly succeed (rate limit, network, revoked-then-reconnected credential) versus not (repository genuinely gone).

### Queue

`analyses` doubles as the work queue until the BullMQ spine exists. `claim_next_queued_analysis()` moves exactly one job `queued → processing` using `FOR UPDATE SKIP LOCKED`, so multiple workers can run concurrently without ever claiming the same job. `started_at`/`completed_at` are persisted at each transition so a stalled job is detectable.

## Alternatives Considered

**Store raw GitHub JSON and normalize on read.** Rejected: it defers the problem to every consumer, makes the "no raw objects exposed" rule unenforceable, and stores far more candidate data than we interpret.

**A table per signal type** (`commits`, `pull_requests`, …). Rejected for V1: the Evidence Engine wants one uniform stream to reason over, and seven tables multiply RLS, migrations, and join complexity for no gain at this stage. `source_type` + `payload` keeps queries uniform while staying indexable.

**Delete-then-insert per run instead of upsert.** Rejected: it makes evidence ids unstable, which would break any future reference from an assessment back to the evidence that justified it.

**Fetch full detail for every commit/PR.** Rejected on cost: it is one API call each, so a 10-repository analysis would run into the thousands of calls. Detail is capped (20 commits, 10 PRs per repository) and un-enriched rows carry explicit nulls.

## Consequences

**Positive**
- One vocabulary for all evidence; adding resumes/certificates later means new `source_type`s, not new consumers.
- Re-running an analysis is always safe, which makes retry trivial and makes the pipeline restartable.
- Partial failure is representable and explainable per repository, matching the product's honesty commitments.

**Negative / follow-up**
- `payload` is schemaless JSON: it is not constrained by the database. A Zod schema per `source_type`, validated at the boundary, is the natural next step (CLAUDE.md §6.7).
- Detail caps mean commit stats are present only for the most recent slice of history. Deeper history needs pagination + a budget-aware scheduler.
- Contributor line counts (`additions`) are always null — the cheap `/contributors` endpoint does not expose them; `/stats/contributors` does but returns `202` while GitHub computes, which needs polling.
- Evidence has no `analysis_id`: it is a property of the repository, refreshed by whichever run last observed it. If "what did *this specific run* see" is ever needed, that is a separate join table.
- No automatic retry/backoff scheduler yet — the trigger endpoint is invoked externally, and a failed job is re-run by enqueueing again.
