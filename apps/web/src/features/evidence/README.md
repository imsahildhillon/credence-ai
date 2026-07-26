# features/evidence/

The Engineering Evidence Pipeline: turns a queued analysis into normalized engineering evidence. No AI, no scoring, no assessment — ingestion only.

```
analysis job → analysis_repositories (snapshot) → GitHub → normalization → evidence_items
```

**Public interface** (`index.ts`): `ingestAnalysisEvidence(analysisId, checkpoint)`, returning an `IngestionResult` (`success | failure | cancelled`). Since [ADR-009](../../../../../docs/adr/ADR-009-analysis-pipeline-orchestration.md), this stage **never writes `analyses.status` itself** — the pipeline orchestrator (`features/pipeline`) is the only caller and the only writer of lifecycle state. `checkpoint` is called between repositories so a long-running ingestion can observe worker shutdown (or, later, cancellation) — a plain function type, not imported from `features/pipeline` (this feature depends on nothing there).

- `worker.ts` — `ingestAnalysisEvidence(analysisId, checkpoint)`: per-repository isolation, returns the result above.
- `service.ts` — `ingestRepositoryEvidence(token, snapshotRow)`: collects and normalizes one repository, returning evidence **and** per-stage failures as data.
- `queries.ts` — service-role data access (snapshot read, upsert, error recording, link-liveness scan/write). Claiming and terminal-state writes moved to `features/pipeline` — this module no longer transitions `analyses.status`.
- `mapper.ts` — pure GitHub → domain normalization. `client.ts` — bounded GitHub REST. `types.ts` — wire + domain types, including `IngestionResult`/`StageFailure`.
- `link-liveness.ts` / `link-liveness-worker.ts` — `checkEvidenceLiveness()`, `processLinkLivenessBatch()`: re-verifies `external_url` against the authoritative REST API (never the public HTML page, which 404s for private repos regardless of whether the resource exists) and writes `link_checked_at`/`link_dead_at`. Invoked by `POST /api/v1/evidence/verify-links`, on the same manual-trigger model the analysis pipeline used before ADR-009 — nothing schedules it automatically yet.

**Key invariants:**

- **No raw GitHub object is persisted or exposed.** Everything becomes an `evidence_items` row with one vocabulary (`source_type`, `github_id`, `occurred_at`, `author_login`, `external_url`, `payload`, `confidence`).
- **Ingestion is idempotent.** Upsert on `(repository_id, source_type, github_id)`; `github_id` holds a numeric id or a commit SHA. Re-running an analysis refreshes, never duplicates — which is what makes crash/stall recovery (reclaim, ADR-009) safe.
- **One repository failing never fails the run.** Stage- and repository-level isolation; failures land in `analysis_errors` for the assessment stage to account for honestly.
- **Ingestion is a stage, not the whole analysis.** It returns a result and hands off to [`features/analysis`](../analysis/README.md) via the pipeline orchestrator, which owns the terminal `completed`/`partial`/`failed` state and the summary/confidence/model/version a completed analysis must carry. Producing no evidence at all is a `failure` result.
- **Unknown ≠ zero.** Unfetched metrics are `null`; `payload.detailFetched` says whether enrichment ran.
- **The worker reads the snapshot, never `repositories.included`** (ADR-005), and no repository identifier ever comes from a client.
- `confidence` here is ingestion fidelity (1.0), _not_ the `confidence_level` assessment enum.

**Environment:** `WORKER_TRIGGER_SECRET` (manual `/api/v1/evidence/verify-links` trigger auth) and `SUPABASE_SERVICE_ROLE_KEY` (no user session, so all data access is service-role).

**Full documentation:** [docs/04-system-architecture.md](../../../../../docs/04-system-architecture.md) § Evidence Pipeline, § Analysis Pipeline Orchestration, and § Analysis Lifecycle & Snapshots. Related: [ADR-006](../../../../../docs/adr/ADR-006-evidence-normalization-and-idempotency.md), [ADR-009](../../../../../docs/adr/ADR-009-analysis-pipeline-orchestration.md).
