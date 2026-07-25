# features/evidence/

The Engineering Evidence Pipeline: turns a queued analysis into normalized engineering evidence. No AI, no scoring, no assessment — ingestion only.

```
analysis job → analysis_repositories (snapshot) → GitHub → normalization → evidence_items
```

**Public interface:**

- `worker.ts` — `processAnalysis(analysisId)`, `processNextQueuedAnalysis()`. The job processor; invoked today by `POST /api/v1/analyses/process`, and by BullMQ unchanged once that lands.
- `service.ts` — `ingestRepositoryEvidence(token, snapshotRow)`: collects and normalizes one repository, returning evidence **and** per-stage failures as data.
- `queries.ts` — service-role data access (claim, snapshot read, upsert, error recording, status transitions, link-liveness scan/write).
- `mapper.ts` — pure GitHub → domain normalization. `client.ts` — bounded GitHub REST. `types.ts` — wire + domain types.
- `link-liveness.ts` / `link-liveness-worker.ts` — `checkEvidenceLiveness()`, `processLinkLivenessBatch()`: re-verifies `external_url` against the authoritative REST API (never the public HTML page, which 404s for private repos regardless of whether the resource exists) and writes `link_checked_at`/`link_dead_at`. Invoked by `POST /api/v1/evidence/verify-links`, on the same on-demand-trigger model as the analysis worker — nothing schedules it automatically yet.

**Key invariants:**

- **No raw GitHub object is persisted or exposed.** Everything becomes an `evidence_items` row with one vocabulary (`source_type`, `github_id`, `occurred_at`, `author_login`, `external_url`, `payload`, `confidence`).
- **Ingestion is idempotent.** Upsert on `(repository_id, source_type, github_id)`; `github_id` holds a numeric id or a commit SHA. Re-running an analysis refreshes, never duplicates — which is what makes job-level retry safe.
- **One repository failing never fails the run.** Stage- and repository-level isolation; failures land in `analysis_errors` for the assessment stage to account for honestly.
- **Ingestion is a stage, not the whole analysis.** A run that produced evidence stays `processing` and hands off to [`features/analysis`](../analysis/README.md), which owns the terminal `completed`/`partial` state and the summary/confidence/model/version a completed analysis must carry. Producing no evidence at all is terminal `failed`.
- **Unknown ≠ zero.** Unfetched metrics are `null`; `payload.detailFetched` says whether enrichment ran.
- **The worker reads the snapshot, never `repositories.included`** (ADR-005), and no repository identifier ever comes from a client.
- `confidence` here is ingestion fidelity (1.0), _not_ the `confidence_level` assessment enum.

**Environment:** `WORKER_TRIGGER_SECRET` (trigger auth) and `SUPABASE_SERVICE_ROLE_KEY` (the worker has no session, so all its data access is service-role).

**Full documentation:** [docs/04-system-architecture.md](../../../../../docs/04-system-architecture.md) § Evidence Pipeline and § Analysis Lifecycle & Snapshots. Related: [ADR-006](../../../../../docs/adr/ADR-006-evidence-normalization-and-idempotency.md).
