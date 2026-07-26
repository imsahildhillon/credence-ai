# ADR-009: Analysis Pipeline Orchestration

**Status:** Accepted
**Related:** [ADR-005](ADR-005-immutable-analysis-snapshots.md) (snapshots define the work), [ADR-006](ADR-006-evidence-normalization-and-idempotency.md) (idempotent ingestion, the prior queue design), [ADR-007](ADR-007-evidence-grounded-skill-assessment.md) (assessment stage)

## Context

The pipeline previously split ingestion and assessment across two separately-triggered, secret-authenticated HTTP endpoints (`/api/v1/analyses/process`, `/api/v1/analyses/assess`), each invoked externally with no scheduler configured anywhere in this repository or its deploy target. A full audit of the running system found the practical consequence: two real analyses sat in `status = 'queued'` for 9–10 hours in production, because nothing ever called `/analyses/process`. A second, independent gap sat one stage further in: even if ingestion were triggered, nothing called `/analyses/assess` for that specific run afterward — a completed ingestion would sit in `processing` forever, indistinguishable in the database from a healthy in-flight run.

Both gaps trace to the same root cause: `analyses.status` was carrying two jobs at once — the **outcome** (`completed`/`partial`/`failed`) and the **queue position** (`queued`/`processing`) — and no field recorded whether a claimed run was still alive. A crashed worker and a slow one looked identical.

## Decision

### One column, not two

`analysis_status` gains four values directly — `ingesting`, `assessing`, `finalizing`, `cancelled` — rather than adding a parallel `stage` column. Lifecycle position and outcome were always the same concern; the enum just needed more granularity. `processing` remains in the enum (Postgres cannot cheaply drop enum values) but is never written again; both real production rows were confirmed `queued`, not `processing`, before this migration, so no backfill was needed.

### One orchestrator, one terminal state

`features/pipeline` is a new module owning the entire lifecycle:

```
claim_next_analysis() → ingesting → assessing → finalizing → completed | partial | failed | cancelled
```

`ingestAnalysisEvidence` (`features/evidence`) and `runSkillAssessment` (`features/analysis`) each return a discriminated result (`IngestionResult`/`AssessmentResult` — `success | failure | cancelled`) and **never write `analyses.status` themselves**. `features/pipeline/orchestrator.ts` is the only writer of lifecycle state. This is the change that makes "one lifecycle, one orchestrator" true in code: previously, four call sites across two feature modules each independently decided and wrote terminal state.

### Liveness is observed, not assumed

`analyses.heartbeat_at` is refreshed by the orchestrator at every checkpoint. `claim_next_analysis(worker_id, stale_after)` claims either a fresh `queued` row or reclaims a `processing`-family row whose heartbeat has gone stale past the threshold — a stalled run is now a detectable fact (a timestamp comparison), not a guess. Reclaim is bounded by `attempt_count < 3` so a poison job terminally fails instead of being reclaimed forever.

### `analysis_events` for observability

An append-only table, one row per real checkpoint (`claimed`, `ingestion_completed`, `assessment_started`, `assessment_completed`, `finalized`, `failed`, `cancelled`), mirroring the audit-log pattern already established for `analysis_errors`. It's both the audit trail and available to the UI for progress detail beyond the coarse status.

### Cancellation checkpoints (groundwork)

`analyses.cancellation_requested_at` exists and every orchestrator checkpoint checks it, but nothing sets it yet — the same "groundwork only" pattern as `evidence_items.link_dead_at` (Phase 1 of the report redesign). The same checkpoint mechanism also serves graceful worker shutdown (a `SIGTERM`-driven `isWorkerStopping` flag), so a future cancel action is additive rather than a redesign.

### A standalone long-lived worker, not `after()` or a serverless trigger

`workers/analysis-worker.ts` is a plain Node process — deliberately not a Next.js request, route handler, or `after()` callback, all of which are bound by a serverless function's wall-clock limit. It polls continuously, has no timeout, and is hosting-agnostic: it imports only `features/pipeline`'s public interface and knows nothing about where it runs. `Dockerfile`/`railway.json` at the repo root are thin wrappers — moving to a different host later means changing those two files, never the worker or the orchestrator.

Deployment target: **Railway**, as a dedicated worker service, separate from the Next.js app (which stays on Vercel). Supabase Postgres remains the queue (`analyses.status`) and the database — no new queue technology (Redis/BullMQ) was introduced; `FOR UPDATE SKIP LOCKED` plus the lease/heartbeat columns already provide safe concurrent claiming, matching the "boring technology" principle (CLAUDE.md §2.2) until a measured bottleneck justifies more (CLAUDE.md §29.1).

```
User → Vercel (Next.js) → Supabase (queue + data) → Railway (analysis worker) → Engineering Report
```

### Retries are crash recovery, not automatic re-attempt

A logical failure (no evidence, no assessable skills, every citation rejected) is a genuine, informative terminal `failed` — retrying it without new input wouldn't help, so it is not retried automatically; the existing "Retry analysis" UI action lets the student re-enqueue deliberately. Only a stalled **lease** (heartbeat gone quiet — the worker crashed or was killed mid-run) is reclaimed automatically, bounded by `attempt_count`. Idempotency, which makes reclaim-and-resume safe, already existed in both stages (evidence upserts key on `(repository_id, source_type, github_id)`; assessments are append-only with `superseded_by`) — this ADR relies on that property, it doesn't introduce it.

### The manual escape hatch

`POST /api/v1/analyses/run` replaces both `/process` and `/assess` — same shared-secret auth, calls `runNextAnalysis()` once. It exists for ops/debugging (process one claimable job on demand without waiting for the worker's next poll interval); the long-lived worker is the real production driver.

## Alternatives Considered

**Keep two HTTP endpoints, add a scheduler (Vercel Cron, GitHub Actions) to call them.** Rejected per explicit direction: adds a second trigger surface and still leaves the ingestion→assessment handoff as two separately-scheduled calls with no shared lifecycle state between them.

**`after()` inside `startAnalysisAction`.** Rejected per explicit direction: still bound by the serverless function's wall-clock limit (60s default on Vercel), and a run that outlives it dies with no visibility beyond what this ADR's heartbeat mechanism would need to add anyway. The heartbeat/reclaim design was kept regardless, since even a long-lived worker process can crash.

**A separate `stage` column alongside `status`.** Rejected: `status` already served this purpose; extending the enum is one migration versus a second column that would need to stay in lockstep with the first, with no compelling reason to keep them apart (no existing constraint or consumer required it).

**BullMQ + Redis now.** Rejected: introduces new infrastructure (forbidden without an ADR per CLAUDE.md §3) to solve a problem `FOR UPDATE SKIP LOCKED` and a heartbeat column already solve at current scale. `features/pipeline`'s orchestrator has zero knowledge of how it was invoked — only `queries.ts` knows the queue is Postgres — so swapping in BullMQ later replaces the claim source and leaves the orchestrator untouched.

## Consequences

**Positive**
- The two production-blocking gaps found by audit (nothing calls `/process`; nothing calls `/assess`) are structurally closed — the worker drives both stages of the same claimed run without a second trigger.
- A stalled run is now detectable and (bounded) self-healing, where before it was invisible.
- The UI can show a truthful "stalled" state instead of an indefinite spinner over a dead run.
- The orchestration logic is platform-independent; only the process entrypoint and two deployment config files are Railway-specific.

**Negative / follow-up**
- The long-lived worker needs to actually be deployed and kept running on Railway — this ADR and the code it describes don't self-deploy; see the project's deployment runbook.
- `attempt_count < 3` is a fixed bound with no backoff between reclaim attempts yet — a rapidly-crashing job could be reclaimed three times in quick succession before terminally failing. Exponential backoff between reclaims is a reasonable follow-up if this proves noisy in practice.
- No automated test suite covers the orchestrator's checkpoint/reclaim paths yet (CLAUDE.md §22 gap, consistent with the rest of this codebase's current testing maturity).
- Structured logging (Pino, per CLAUDE.md §20) is not used in the worker — it follows this codebase's actual established convention (`console.warn`/`console.error`, matching `scripts/eval.ts`) rather than introducing a new dependency unilaterally.
