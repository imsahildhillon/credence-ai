# features/analysis/

The Evidence-Based Skill Assessment Engine: interprets already-normalized engineering evidence into versioned, cited skill assessments. No GitHub access, no React, no ingestion.

```
evidence_items → aggregation (dimensions) → Claude → citation validation → skill_assessments + assessment_evidence
```

**Public interface** (`index.ts`): `runSkillAssessment(analysisId)`, `PIPELINE_VERSION`, `PROMPT_VERSION`.

- `aggregator.ts` — pure evidence → structured, PII-free summary. Groups evidence into 11 engineering dimensions and attaches each taxonomy skill to the dimensions that inform it.
- `prompt.ts` — the versioned prompt artifact (stable cacheable system prefix + volatile user payload).
- `mapper.ts` — model output → persistable rows: numeric confidence → `confidence_level` band, citation validation.
- `queries.ts` — service-role data access; all writes go through the `persist_skill_assessment` RPC.
- `service.ts` — orchestration and terminal-state decisions. `types.ts` — domain types + the Zod output contract.

**Key invariants:**

- **The LLM never receives raw database rows, raw GitHub objects, or candidate identity.** Only the aggregator's structured summary — dimension counts plus a capped, most-recent-first sample of evidence references. Name, GitHub handle, institution, and free-form bodies are excluded at the pipeline level (CLAUDE.md §17.10); authorship survives only as `authoredByCandidate`.
- **Only existing `evidence_items` may be cited.** Every id is checked against the supplied set in `mapper.ts`, then re-checked in SQL — `persist_skill_assessment` refuses ids that do not exist or belong to another profile. An assessment citing any invalid id is dropped whole, never partially kept.
- **A claim and its evidence links are written in one transaction.** The RPC is the only write path, so the database can never hold an orphaned claim (CLAUDE.md §15.2).
- **No numeric score is ever stored or shown.** The model reports confidence as 0–1; `mapper.ts` bands it into `high | moderate | preliminary` and additionally caps it by citation count — fewer than 3 citations can only ever be `preliminary`.
- **Assessments are append-only.** Re-running appends a new version and sets `superseded_by` on the prior one; nothing is updated in place (CLAUDE.md §15.3).
- **Failure never deletes evidence.** A refusal, timeout, or schema violation marks the analysis `failed`, leaves ingested evidence intact, and is safe to retry.
- **Skills with no supporting evidence are never assessed** — they are excluded from the request rather than asked about and answered from nothing.
- Provenance for every run — `model`, `pipeline_version`, `prompt_version` — is written to the `analyses` row the assessments reference.

**Not yet built:** the golden-dataset eval suite (CLAUDE.md §17.9). Until it exists, prompt and model changes ship without regression evidence — treat that as a release gate, not a nice-to-have.

**Environment:** `ANTHROPIC_API_KEY`, `WORKER_TRIGGER_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`.

**Full documentation:** [docs/04-system-architecture.md](../../../../../docs/04-system-architecture.md) § Skill Assessment Engine. Related: [ADR-007](../../../../../docs/adr/ADR-007-evidence-grounded-skill-assessment.md), [ADR-006](../../../../../docs/adr/ADR-006-evidence-normalization-and-idempotency.md).
