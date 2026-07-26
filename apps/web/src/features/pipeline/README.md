# features/pipeline/

The analysis lifecycle orchestrator (ADR-009). Owns the entire run end to end — ingestion → assessment → finalization — as a single lifecycle with a single terminal state. No GitHub access, no Claude calls, no React: it drives `features/evidence` and `features/analysis` through their public interfaces and nothing else.

```
claim_next_analysis() → ingesting → assessing → finalizing → completed | partial | failed | cancelled
```

**Public interface** (`index.ts`): `runAnalysisLifecycle(analysisId, options?)`, `runNextAnalysis(workerId, options?)`.

Called by exactly two things: `workers/analysis-worker.ts` (the long-lived polling process — the real production driver) and `app/api/v1/analyses/run/route.ts` (a manual, secret-authenticated escape hatch for ops/debugging — process one job on demand without waiting for the worker's next poll).

**Key invariants:**

- **One orchestrator writes `analyses.status`.** `ingestAnalysisEvidence` and `runSkillAssessment` each return a `IngestionResult`/`AssessmentResult` describing their outcome — they never write lifecycle state themselves. This module is the only place `analyses.status` changes after the initial `queued` insert.
- **Lifecycle position is one column, not two.** `analyses.status` carries `queued → ingesting → assessing → finalizing → completed | partial | failed | cancelled` directly — no separate "stage" column. `processing` remains in the enum for backward compatibility but is never written again.
- **Stalled is a detectable fact.** `heartbeat_at` is refreshed at every checkpoint; `claim_next_analysis()` reclaims a run whose heartbeat has gone stale past a threshold, distinguishing a dead worker from a slow one — something the prior two-endpoint design could not do at all (a `processing` run that would never finish was indistinguishable from one about to).
- **`analysis_events` is the observability log**, append-only, one row per real checkpoint (`claimed`, `ingestion_completed`, `assessment_started`, `assessment_completed`, `finalized`, `failed`, `cancelled`). It is both the audit trail and a richer data source for UI progress than counting `evidence_items` rows.
- **Cancellation checkpoints are wired but unused.** `analyses.cancellation_requested_at` exists and every checkpoint checks it, but nothing sets it yet — groundwork only, same pattern as `evidence_items.link_dead_at`. The same checkpoint also serves graceful worker shutdown (`isWorkerStopping`), so building a cancel action later is additive, not a redesign.
- **Retries are crash recovery, not automatic re-attempt.** A logical failure (no evidence, no assessable skills, every citation rejected) is a real, informative terminal `failed` — retrying it without new input wouldn't help, so it isn't retried automatically. Only a stalled *lease* (heartbeat gone quiet — the worker crashed or was killed) is reclaimed, bounded by `attempt_count`.
- **Idempotent by construction, not by this module.** Evidence upserts key on `(repository_id, source_type, github_id)`; assessments are append-only with `superseded_by`. Both properties already existed in `features/evidence`/`features/analysis` — they're what make reclaim-and-resume safe.

**Not yet built:** an actual cancel action (button + server action + setting `cancellation_requested_at`) — the checkpoints exist, nothing calls them yet.

**Environment:** none of its own — reuses `SUPABASE_SERVICE_ROLE_KEY` already required by `features/evidence`/`features/analysis`.

**Full documentation:** [docs/04-system-architecture.md](../../../../../docs/04-system-architecture.md) § Analysis Pipeline Orchestration. [ADR-009](../../../../../docs/adr/ADR-009-analysis-pipeline-orchestration.md).
