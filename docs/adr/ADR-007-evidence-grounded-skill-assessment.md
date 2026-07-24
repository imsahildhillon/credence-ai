# ADR-007: Evidence-Grounded Skill Assessment

**Status:** Accepted
**Related:** [ADR-005](ADR-005-immutable-analysis-snapshots.md) (snapshots define the work), [ADR-006](ADR-006-evidence-normalization-and-idempotency.md) (normalized evidence)

## Context

The product's founding promise is that no claim about a person exists without the evidence that produced it. An LLM is the only practical way to interpret a body of engineering activity into skill-level findings — and an LLM is also the single most likely component to fabricate one.

Four questions had to be answered before any assessment could be written:

1. **What does the model see?** Given it the wrong inputs and the explainability promise is unrecoverable — a claim traced to a GitHub URL that 404s next month explains nothing.
2. **Which vocabulary does it assess?** Evidence groups naturally along engineering lines (testing, delivery, collaboration). The product's assessed vocabulary is a fixed 12-entry taxonomy (PRD FR-5.1). These are not the same list.
3. **How is a hallucinated citation prevented from being persisted?** Not detected — *prevented*.
4. **How is confidence expressed?** A model can report graded uncertainty usefully. The product forbids numeric scores anywhere a user can see one (PRD FR-5.2, Brand Guidelines §16.3).

## Decision

### The model consumes stored evidence, never GitHub and never database rows

The LLM's entire input is the aggregator's structured summary: per-dimension counts, an activity span, and a capped, most-recent-first sample of evidence *references* (id, kind, title, repository, date, `authoredByCandidate`, a short structural detail).

This is an explainability decision before it is a performance one. GitHub is mutable and eventually unreachable — a repository can be renamed, made private, or deleted, and a re-fetch would produce a different answer or none. Normalized evidence is stored, stable, and addressable by id, so any assessment can be re-explained from its citations years later, long after the source moved on. It also collapses the trust boundary: candidate-supplied text (READMEs, commit messages, issue bodies) reaches the model only after normalization, in a shape we control, so prompt-injection attempts arrive as data to assess rather than instructions to follow.

Identity is excluded at the pipeline level: no name, handle, avatar, institution, or free-form body. Authorship survives only as a boolean. The model cannot be biased by data it never receives (CLAUDE.md §17.10).

### Dimensions organize evidence; the taxonomy defines what is assessed

Eleven engineering dimensions (code quality, collaboration, architecture, testing, delivery, ownership, documentation, debugging, performance, security, leadership) are **buckets for filing evidence**, not an output vocabulary. Each of the 12 taxonomy skills declares which dimensions inform it.

Routing is structural wherever possible — a pull request is collaboration because of what a pull request *is*; a commit touching `src/foo.test.ts` files under testing because of the path, which is a fact about the change rather than the author's description of it. Routing decides which evidence the model reads under which heading. It never asserts a finding; every finding is the model's and must cite evidence.

A skill whose dimensions contain no evidence is **not sent for assessment at all**. Asking a model to judge something it has nothing on is precisely the condition that produces invented findings.

### Citations are validated twice, and the database has the final say

`mapper.ts` checks every cited id against the set actually supplied, and drops any assessment citing an invalid id **whole** — keeping its valid citations would persist a claim whose stated grounds are partly fiction.

That check exists for diagnosis. The guarantee lives in SQL: `persist_skill_assessment` re-derives the profile from the analysis, resolves the skill slug against the taxonomy, and refuses evidence ids that do not exist or belong to another profile. It writes the assessment and its `assessment_evidence` links in one function call — one transaction — so the database can never hold an orphaned claim (CLAUDE.md §15.2), and a fabricated citation is *unpersistable* even if every application-layer check were deleted.

### Confidence is graded internally, banded externally

The model reports confidence as a 0–1 number, because a graded self-report calibrates better than asking it to pick a word. That number never leaves `mapper.ts`. It is banded into `confidence_level` (`high | moderate | preliminary`) and **additionally capped by citation count**: fewer than 3 citations can only ever be `preliminary`, fewer than 8 only `moderate`. Calibration is ours to enforce, not the model's to self-report — no amount of model confidence produces a `high` band off three commits.

The analysis-level confidence is the weakest band present: an overall claim is only as good as its worst part.

### Failure is terminal for the run, never for the evidence

A refusal, timeout, truncation, or schema violation marks the analysis `failed`, records a diagnostic in `analysis_errors`, and leaves ingested evidence untouched. Retry re-reads the same evidence and **appends a new assessment version**, setting `superseded_by` on the prior one — assessments are never updated in place (CLAUDE.md §15.3). Nothing is ever deleted.

Any exclusion — an unreadable repository, a rejected citation, a refused row — makes the run `partial`, not `completed`. Degraded results are labeled, never presented as complete.

### Ingestion and assessment are separate stages with separate triggers

Evidence ingestion no longer marks an analysis `completed`. It hands off in `processing`; the assessment stage owns the terminal state and writes the `summary`, `confidence`, `model`, `pipeline_version`, and `prompt_version` that a completed analysis is required by CHECK constraint to carry. (The previous behavior also violated that constraint outright — a fully successful ingestion could not be written.)

Separate triggers mean a transient GitHub failure never re-runs a paid assessment, and a failed assessment retries without re-ingesting anything.

## Consequences

**Good**

- Every persisted claim is traceable to rows that still exist, by construction rather than by convention.
- A hallucinated citation cannot be written, regardless of application-layer bugs.
- No numeric score can leak to the UI — the band is the only representation that exists past `mapper.ts`.
- Assessment is re-runnable and versioned, so improved prompts can be re-applied to historical evidence without invalidating issued assessments.

**Costs**

- The model sees a capped sample per dimension, not the full corpus. Very large portfolios are assessed from their most recent evidence; the input records the true counts so the model can hedge, but it is a sample.
- Routing heuristics (paths, labels, titles) are approximations. Misfiled evidence lands under a heading where it is less relevant — it does not corrupt a finding, but it can dilute one.
- Adding a taxonomy skill requires a dimension mapping; without one it is silently never assessed. Chosen over the alternative of assessing it against nothing.
- **No eval suite yet.** CLAUDE.md §17.9 requires a golden-dataset regression suite as a release gate for prompt and model changes. It does not exist. Until it does, every prompt change here ships without calibration, grounding, or fairness evidence — this is the largest outstanding risk in the pipeline, and it is debt of the "hazardous" class (§27.2), not the cosmetic kind.
