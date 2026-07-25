# features/evaluation/

A deterministic AI evaluation framework: measures assessment-engine quality against a fixed golden dataset, before any prompt/model/pipeline change ships (CLAUDE.md §17.9, §22.5). No recruiter features, no profile UI, no prompt changes — evaluation only.

```
datasets/golden/ (20 fixture profiles, no database) → runner.ts (real aggregation → real prompt → Claude → real mapper)
  → metrics.ts → reporter.ts → eval-reports/*.json + *.md
```

**Public interface** (`index.ts`): `runDataset`, `runCase`, `computeMetrics`, `computeMetricsByArchetype`, `buildRunReport`, `compareToBaseline`, `renderMarkdownReport`, plus the types each returns.

**CLI:** `npm run eval` (run the full dataset against the real API, write `eval-reports/<timestamp>.json` + `.md` + `eval-reports/latest.json`) and `npm run eval:report` (re-render Markdown from a saved JSON report, no API calls). See flags in `scripts/eval.ts`.

## A deliberate exception to §4

This feature imports directly from `features/analysis`'s internal modules (`aggregator.ts`, `mapper.ts`, `prompt.ts`, `types.ts`), not only its public `index.ts`. That is normally forbidden (CLAUDE.md §4 — cross-feature access goes through a feature's public interface). The exception is narrow and intentional: this feature's entire purpose is to exercise the _real_ aggregation, prompt, and citation-validation logic against fixture data instead of live database rows, so a re-implementation here would test a copy that could silently drift from production and defeat the point of an eval suite. Nothing in `features/analysis` is modified — every import is read-only.

## Methodology

Each golden case is a synthetic engineering portfolio (repositories + normalized evidence, shaped exactly like `evidence_items` rows) plus a human reviewer's expectations: which skills should be assessed, at what level and confidence band, and which evidence ids legitimately ground each one. `datasets/golden/` never touches Supabase — evidence ids are fixture strings, not database UUIDs — so a run is fast, portable, and safe in CI.

For each case, `runner.ts` calls `aggregateEvidence()` and `buildAssessmentUserContent()` from `features/analysis` (the same functions the production worker calls), sends the result to Claude via `completeStructured()`, and validates the raw response two ways:

1. **Hallucination check**, against the case's full citable evidence-id set, on the **raw** model output — before the mapper strips anything. Measuring after the mapper would always read zero (that's the mapper's job) and would tell us nothing about how often the model _tries_ to fabricate a source.
2. **The real `mapAssessments()`** from `features/analysis/mapper.ts`, to confirm the production citation-validation path behaves identically against fixture data as it does against live evidence.

## Metrics

All ratio metrics are **micro-averaged** across the whole run (sum intersections and totals once, then divide), not averaged per-case — so a handful of evidence-rich cases aren't drowned out by many thin ones.

| Metric                                                          | What it answers                                                                                                                                             |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Skill precision / recall                                        | Of the skills assessed, how many were expected — and of the skills expected, how many were assessed                                                         |
| Missing / extra skill rate                                      | How often an expected skill was skipped, or an unsupported skill was assessed anyway (checked against each case's `unsupportedSkills`)                      |
| Citation precision / recall                                     | Of the evidence a matched skill cited, how much was genuinely grounding — and how much of the grounding evidence was found                                  |
| Hallucinated citation rate                                      | Fraction of raw citations naming an evidence id that does not exist in the case — **the integrity metric**                                                  |
| Confidence calibration accuracy / over- / under-confidence rate | Whether the _persisted_ confidence band (after `mapper.ts`'s own citation-count ceiling) matches the case's `expectedConfidenceBand`                        |
| Average tokens / latency / estimated cost                       | Operating cost per run, from `response.usage` and wall-clock timing (CLAUDE.md §17.13)                                                                      |
| Overall score (0–100)                                           | A weighted blend of skill F1, citation F1, and calibration accuracy — **forced to 0 whenever any hallucination occurred**, regardless of every other number |

## Regression policy

A run is compared against `eval-reports/baseline.json` — the last run a human reviewed and explicitly promoted (`npm run eval -- --promote`; never automatic). Each metric is classified `improved`, `regressed`, or `unchanged` against a small tolerance band (±2 points on the 0–100 score, ±2 percentage points on ratio metrics, ±5–10% relative on tokens/latency/cost) so ordinary run-to-run model variance isn't reported as a false regression. The first run ever has no baseline and reports that plainly rather than fabricating a comparison.

## Prompt acceptance criteria

A prompt, model, or pipeline change is acceptable to ship only if, against this dataset:

- **Zero hallucinated citations.** Non-negotiable — this is CLAUDE.md §27.4's non-debt-eligible list (evidence-provenance integrity) applied to the eval suite itself.
- **No regressed metric**, per the tolerance bands above — an unrelated improvement elsewhere does not offset a regression.
- Every case either passes or the failure is understood and expected (e.g., a deliberately adversarial case that isn't in the dataset yet).

## Release gate

`npm run eval` exits non-zero whenever any case failed (hallucination or a model-call error) or any metric regressed against the baseline — wire it into CI on any change touching `features/analysis/prompt.ts`, `types.ts` (the output schema), or `lib/ai/models.ts` (model/effort selection). A red exit blocks merge with no override culture (CLAUDE.md §22.10).

## Known gap

This is a fixture-based framework, not a live smoke test — it never calls the production database or the `/api/v1/analyses/*` routes. A small, separate real-API smoke test against a dedicated dev workspace key (CLAUDE.md §22.6) is still needed before this can be the _only_ gate; today it is the primary one.
