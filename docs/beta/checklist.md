# Private Beta Release Checklist

Scope: Candidate Engineering Profile, through this beta-readiness sprint. Full findings and methodology: [e2e-validation.md](e2e-validation.md).

## ✓ Security

- [x] RLS is the sole ownership boundary in `features/profile` and the new `features/analytics` — no service-role reads or writes added.
- [x] `analytics_events`: insert-only-own policy, no `select` grant for `authenticated`, milestone events protected by a partial unique index (no client-controlled dedup logic needed).
- [x] `get_advisors(security)` run after every migration this sprint — zero new findings from `analytics_events` or the profile-read-path indexes.
- [ ] **Pre-existing, not fixed this sprint** — track before beta: `github_credentials` RLS-enabled-no-policy, 5 `SECURITY DEFINER` functions callable by `authenticated`, `claim_next_queued_analysis` mutable search_path, leaked-password protection disabled in Supabase Auth.
- [x] No secrets, tokens, or candidate PII added to any log line, error message, or analytics metadata field this sprint.

## ✓ Performance

- [x] Two query-plan issues found and fixed (profile-scoped index for current assessments; covering index for evidence-by-date) — see migration `20260726090000`.
- [x] Aggregation confirmed `O(n)` per section, no hidden N+1 in `features/profile/server/aggregator.ts`.
- [x] `/profile` bundle: 118 kB first-load JS — within the 250 KB/route budget.
- [ ] **Needs a human pass**: authenticated server-render timing (LCP) against realistic evidence volume in a real browser — not measurable without a live session in this environment.

## ✓ Accessibility

- [x] `eslint-plugin-jsx-a11y` (error level) clean across all changed files.
- [x] Keyboard operability, focus-visible, heading hierarchy, and color-plus-label pairing verified across all 9 profile sections.
- [x] Fixed: missing `prefers-reduced-motion` support (global), missing `aria-current` on the active evidence filter.
- [ ] **Needs a human pass**: manual screen-reader QA (VoiceOver/NVDA) on `/profile` and `/analysis` — required by CLAUDE.md §13.9 before any new assessment-flow screen ships, not yet performed live.

## ✓ Evaluation

- [x] No changes to `features/evaluation`, `features/analysis`, or any prompt this sprint — golden-dataset eval suite is unaffected; `npm run eval` was not required to re-run for this sprint's scope (no prompt/model/pipeline touched).

## ✓ Profile

- [x] Empty states audited across all 9 sections; fixed two silent-degradation gaps (`Collaboration` all-zero, `EngineeringSummary` both-empty).
- [x] Responsive overflow risks found and fixed at 5 call sites (long repository/skill names without `min-w-0`/`break-words`).
- [x] Route-level loading skeletons added for `/profile` and `/analysis`, matching the established `onboarding/repositories/loading.tsx` pattern.
- [x] Trust/provenance banner ("Generated from X repositories, Y evidence items, assessed Z" + "Learn how this was generated") added, backed by real persisted counts.

## ✓ AI

- [x] No AI pipeline, prompt, or model changes this sprint (out of scope per the sprint's explicit constraint).
- [x] Every AI-generated section still renders exclusively through `AiContentMarker`/`EvidenceCard` — unchanged, verified by inspection.
- [x] Partial-analysis honesty: `partialMessage` surfaces `analyses.error_message` verbatim, never paraphrased or hidden.

## ✓ Error handling

- [x] `failed` analysis state fixed: distinct copy, `error_message` shown, and the correct recovery action (**Reconnect GitHub** vs. **Retry analysis**) chosen by `classifyAnalysisFailure()` reading `analysis_errors`.
- [x] Rate-limited runs get distinct guidance ("wait a few minutes") instead of a reconnect prompt.
- [x] All fixes use existing, protected retry/reconnect mechanisms (`startAnalysisAction`, `connectGithubAction`) — no new mutation paths added to `features/github`/`features/analysis`.
- [ ] **Not run live**: a real, credentialed GitHub OAuth pass end-to-end (repository import → evidence → assessment → profile) — no real GitHub account was available in this environment; see e2e-validation.md §1.

## Final verification (this sprint)

- [x] `npm run lint` — clean.
- [x] `npx tsc --noEmit` (apps/web) — clean.
- [x] `npm run build` — clean, 17/17 pages generated.
- [x] `npm run eval` — run; failed with 0/20 cases and `averageInputTokens`/`averageOutputTokens`/`averageLatencyMs` all `0`, confirming every case failed at the API-call boundary (placeholder `ANTHROPIC_API_KEY` in this environment) rather than a real assessment-quality regression — the explicit exception this sprint's verification step allows for. No prompt/model/pipeline code was touched this sprint, so there is nothing here to have regressed.
- [x] Changes staged (`git add`), not committed, per instruction.
