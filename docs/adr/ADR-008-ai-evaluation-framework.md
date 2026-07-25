# ADR-008: Deterministic AI Evaluation Framework

**Status:** Accepted
**Related:** [ADR-007](ADR-007-evidence-grounded-skill-assessment.md) (the assessment engine this evaluates)

## Context

CLAUDE.md §17.9 requires a regression suite before any prompt, model, or pipeline change ships: "A change that degrades calibration, evidence-grounding, or fairness metrics does not ship, whatever else it improves." §22.5 and §22.6 make it a first-class test tier, distinct from unit/integration/component tests, and explicitly permitted to call the real API. Until this sprint, that requirement was documented (ADR-007's "Known gap") but not built — every prompt edit to `features/analysis` shipped on inspection alone.

Building it raised four questions.

**What proves the framework is testing production behavior, not a copy of it?** An eval suite that re-implements aggregation and citation-validation logic to test against fixtures can drift silently from the real pipeline — the exact failure mode an eval suite exists to prevent.

**What does "deterministic" mean when the system under test is an LLM?** The dataset, the metrics, and the comparison logic must be fully reproducible; the model's response is not, and never will be.

**How is a fabricated citation measured, given the pipeline already prevents it from being persisted?** ADR-007's `persist_skill_assessment` RPC rejects hallucinated evidence ids at the database layer. That guarantee says nothing about how *often the model tries* — which is exactly what a prompt change needs to be measured against.

**How does the dataset stay honest about "no numeric score" and "no invented sources"** — the two hardest product guarantees to accidentally violate — without becoming another database dependency to seed and tear down on every run?

## Decision

### The framework imports `features/analysis`'s internals directly, not just its public interface

`features/evaluation/runner.ts` imports `aggregateEvidence`, `toSkillBriefs`, `mapAssessments`, `SKILL_ASSESSMENT_SYSTEM_PROMPT`, `buildAssessmentUserContent`, and `buildAssessmentOutputSchema` directly from their source files, not through `features/analysis/index.ts`. CLAUDE.md §4 normally forbids this ("cross-feature access goes through a feature's exported public interface"). The exception is deliberate and narrow: this feature's only job is to measure `features/analysis`'s real logic, so testing anything else — a parallel reimplementation, a mock, a hand-rolled prompt string — would test the wrong thing and could drift from production without anyone noticing. Nothing in `features/analysis` is modified; every import is read-only. This is the same principle CLAUDE.md §22.7 states for ordinary tests ("never mock internal functions of the module under test"), applied to a feature whose entire purpose is testing another feature.

### The dataset is fixture data, not database rows

`apps/web/datasets/golden/` holds 20 synthetic engineering portfolios — repositories and normalized evidence shaped exactly like `evidence_items` rows, with fixture-defined string ids rather than database UUIDs. The framework never calls Supabase. This is what makes the "deterministic" half of the requirement possible: the dataset, the aggregation, and the prompt construction are all pure and reproducible; only the model call varies. It also means a run needs no seeding, no cleanup, and no shared dev-database contention, and it runs anywhere (including CI) with nothing but an API key. The cost is that the framework cannot exercise the database-layer guarantee itself (RLS, the `persist_skill_assessment` RPC) — that remains the assessment engine's own concern and its own tests, per ADR-007.

### Hallucination is measured on the raw model output, before the mapper strips it

`features/analysis/mapper.ts`'s job is to drop any assessment that cites an invalid evidence id, so measuring hallucination *after* the mapper runs would always read zero — correctly, but uninformatively. The runner instead checks every citation in the model's raw response against the case's full citable evidence-id set, before `mapAssessments` is called. This is what makes "Hallucinated Citation Rate" an actual signal about the prompt and model, not a restatement of a guarantee the schema and the database already provide.

### The composite score is a release gate, not a dashboard number

`overallScore` is forced to zero whenever any hallucination occurred in the run, regardless of every other metric, and is additionally scaled by the fraction of cases that completed without a model-call error — a run where half the cases errored out must not score well on the strength of the other half. This mirrors CLAUDE.md §17.9's framing directly: grounding is not one input to a weighted average among several, it is a precondition.

### Regression detection compares against an explicitly promoted baseline, never automatically

`eval-reports/baseline.json` is the last run a human reviewed and chose to promote (`npm run eval -- --promote`). Every subsequent run is compared against it with a small tolerance band per metric (to avoid flagging ordinary model-response variance as a false regression), and the CLI's exit code is non-zero on any case failure or any regressed metric — wired into CI, this is the mechanism that makes §17.9's "does not ship" enforceable rather than aspirational. `baseline.json` is the one file under `eval-reports/` that is version-controlled; every other run artifact is gitignored.

## Consequences

**Good**

- Testing the real prompt, the real aggregation, and the real citation validator means a passing eval run is evidence about production behavior, not about a parallel implementation.
- No database dependency makes the suite fast, portable, and safe to run in CI without seeding or teardown.
- The hallucination metric is measured at the point that actually reflects model behavior, not the point the database guarantee already covers.
- The release gate is mechanical (an exit code), not a matter of a reviewer remembering to check a dashboard.

**Costs**

- The direct-internal-import exception to CLAUDE.md §4 needs to stay narrow. If `features/evaluation` starts importing more than the handful of pure functions it uses today, that is a signal the boundary is eroding, not that the exception should widen further.
- The dataset does not cover the database-layer guarantee (RLS, the persistence RPC) — a change there needs `features/analysis`'s own tests, not this suite.
- The dataset's 20 cases are hand-authored ground truth. They encode one reviewer's judgment of what a given portfolio should produce; they are a starting point for calibration, not a statistically representative sample, and should grow as real (anonymized) disagreements are found.
- Running `npm run eval` for real costs money and takes real wall-clock time per case — it is not a pre-commit hook, it is a CI stage gated on changes to `features/analysis/prompt.ts`, `types.ts`, or `lib/ai/models.ts`.
