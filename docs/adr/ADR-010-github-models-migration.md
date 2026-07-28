# ADR-010: Migrate the AI Provider from Anthropic to GitHub Models

**Status:** Accepted
**Related:** [ADR-007](ADR-007-evidence-grounded-skill-assessment.md) (the assessment engine this provider serves), [ADR-008](ADR-008-ai-evaluation-framework.md) (the eval suite this migration invalidates and must re-baseline)

## Context

CLAUDE.md §3 names Anthropic's Claude API, via the official `@anthropic-ai/sdk`, as the sole sanctioned AI provider, and §17.1 forbids any feature from calling another LLM provider. Both are marked "forbidden without an ADR" for exactly this kind of change — swapping the model that produces every skill assessment is an AI-pipeline design change (§24.2), not a refactor.

Immediately prior to this decision, a production incident on the `analysis-worker` Railway service was root-caused to `ANTHROPIC_API_KEY` holding an invalid/stale key — `completeStructured()` was receiving a 401 `authentication_error: invalid x-api-key` from Anthropic on every assessment call. That incident is a credential-configuration problem, not a defect in the Anthropic integration itself, and is **not** the basis for this migration — it's noted here only because it's the immediate context in which the provider question came up. The actual decision to migrate to GitHub Models (`openai/gpt-5`, via the official `openai` SDK pointed at `https://models.github.ai/inference`) is a deliberate choice made and owned by the project's maintainer, independent of that incident, verified working via an independent standalone test.

## Decision

Replace the implementation inside `apps/web/src/lib/ai/` — and only there — with a client built on the official `openai` SDK, targeting GitHub Models' OpenAI-compatible inference endpoint. `completeStructured()`'s exported signature, `runSkillAssessment()`, and everything in `features/pipeline`/`features/analysis` above `lib/ai/` are unchanged; this is the one sanctioned seam (CLAUDE.md §17.1) doing its job — the whole point of routing every Claude call through one module was so a provider change stays contained to it.

### What carries over unchanged
- The public contract: `completeStructured<Schema>(options): Promise<StructuredCompletion<z.infer<Schema>>>`, structured-output enforcement (Zod schema in, Zod-validated output out — CLAUDE.md §17.2 §17.4), the `AiError` taxonomy and retryable/terminal classification (CLAUDE.md §19.2), model selection living in `models.ts` config rather than scattered through code (CLAUDE.md §17.2).
- Every stop-reason / finish-reason case remains an explicit branch (CLAUDE.md §17.6) — `length` (OpenAI) maps to the same `incomplete` terminal kind as Anthropic's `max_tokens` did; `content_filter` maps to the same `refusal` kind.

### What does not carry over, and is explicitly dropped rather than faked
- **Extended/adaptive thinking** (`thinking: {type: 'adaptive'}`) has no equivalent in the OpenAI Chat Completions API and is removed. There is no reasoning-effort parameter on this endpoint shape (the verified-working sample uses `chat.completions.create`, not a Responses-style API) — `AI_TASKS`'s `effort` field is removed from config rather than left in as a no-op that looks like it does something.
- **Explicit prompt-caching breakpoints** (`cache_control: {type: 'ephemeral'}`) have no equivalent here — Anthropic's is a request-time, user-declared prefix breakpoint; nothing in this call shape lets us declare one. `AiUsage.cacheReadInputTokens`/`cacheCreationInputTokens` are retained on the return type and are populated from `response.usage.prompt_tokens_details` (`cached_tokens`/`cache_write_tokens`) when the endpoint reports them, defaulting to `0` otherwise — whether GitHub Models' gateway actually populates these for `openai/gpt-5` is unverified in this codebase and should be confirmed against real traffic; either way, there is no way to *request* a cache hit the way the previous implementation could.
- **Model identity in config**: `AI_TASKS.skillAssessment.model` changes from `claude-opus-4-8` to `openai/gpt-5`.
- **New secret**: `GITHUB_TOKEN`, read via the same lazy-env pattern as `ANTHROPIC_API_KEY` was. This is a GitHub Models inference token — **unrelated to this codebase's existing per-student `github_credentials` OAuth tokens** (ADR-004); the shared name is a coincidence worth flagging explicitly so it is never conflated with student credentials in review or in incident response.

## Alternatives Considered

**Keep Anthropic, just fix the Railway `ANTHROPIC_API_KEY`.** This would have resolved the actual incident with a strictly smaller blast radius (a variable update, not a provider migration) and no ADR would have been required at all. Not chosen here because the migration is a deliberate, independent decision by the maintainer, not a workaround for the incident — recorded so a future reader doesn't conflate the two.

**Wrap both providers behind a shared interface, keep Anthropic as a fallback.** Rejected for now as unnecessary complexity: CLAUDE.md §2.5 (small, reversible steps) and §6 (no speculative abstraction) both argue against building a provider-agnostic seam before there's a second concrete need for one. `lib/ai/` already *is* the single seam; if a second provider is ever needed simultaneously (not as a replacement), that's a follow-up ADR.

## Consequences

**Positive**
- The diff is contained entirely to `apps/web/src/lib/ai/`, exactly as this module's original design intended.
- `runSkillAssessment()` and the entire orchestration pipeline require zero changes.

**Negative / follow-up**
- **The golden-dataset eval suite (ADR-008) is invalidated until re-run against GPT-5's actual output.** Calibration bounds, evidence-grounding checks, and fairness metrics were tuned against Claude's behavior; nothing guarantees they hold for a different model family. Per CLAUDE.md §17.9, a change that degrades these must not ship regardless of what else it improves — this must be re-verified, not assumed, before this is trusted in production for real assessments.
- **Fairness constraints (CLAUDE.md §17.10) are prompt-encoded instructions, not enforced mechanically** — their effectiveness is model-specific and is now unverified for GPT-5 until the eval suite runs.
- **Prompt-cache cost savings are lost** (see above) — token spend per assessment should be expected to rise even if raw quality holds.
- **GitHub Models' rate limits, availability, and exact structured-output constraints for `openai/gpt-5` through this gateway are unverified in this codebase** beyond the maintainer's independent standalone test; the retry/terminal classification in `toAiError` is carried over by best-effort mapping from the OpenAI SDK's error classes and should be confirmed against real traffic.
- Documentation referencing "Claude"/"Anthropic" as the AI layer (CLAUDE.md §3, §17 header, code comments throughout `lib/ai/`) is now stale outside of this ADR and should be updated in a follow-up pass; this ADR does not rewrite CLAUDE.md itself.
