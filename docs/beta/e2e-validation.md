# Beta Readiness — End-to-End Validation

Scope: everything through the Candidate Engineering Profile, verified for private beta. No architecture changes, no recruiter features — per the sprint constraint. Protected systems (`features/auth`, `features/github`, `features/evidence`, `features/analysis`, `features/evaluation`) were treated read/import-only throughout; every fix below lives in `features/profile`, `features/analytics` (new), `app/(app)/*` route composition, `components/`, `styles/globals.css`, or a new `supabase/migrations/*.sql`.

## 1. GitHub OAuth → Profile flow

**Real, credentialed GitHub OAuth was not run.** This environment has no real GitHub account available, and entering GitHub credentials (username/password, 2FA) on a user's behalf is outside what this session will ever do, beta or not. Fabricating a "verified" live run would violate the same honesty principle this product is built on (CLAUDE.md §21.5) — so this is reported as a real limitation, not glossed over.

What was verified instead, against the real dev Supabase project (`guzqogdwnnhlyvdpjvsf`) with realistic synthetic data seeded directly into Postgres:

- **Repository Import → Evidence Pipeline → AI Assessment → Candidate Profile**: verified at the data-model and query level. `getProfileForCurrentUser()` (`apps/web/src/features/profile/server/service.ts`) correctly assembles all 9 profile sections from `analyses` + `skill_assessments` + `assessment_evidence` + `evidence_items` + `repositories` in 6 batched queries, with RLS as the only ownership boundary (no service-role reads anywhere in `features/profile`).
- **Failed/queued/processing/partial/completed** analysis statuses were each exercised at the data layer and confirmed to route to the correct page (`/analysis` holding screen vs. `/profile`), per `apps/web/src/app/(app)/analysis/page.tsx` and `getProfileForCurrentUser()`'s status branching.
- **Auth guard cost**: an unauthenticated request to `/profile` redirects in ~1.5–2.5ms (measured via repeated `curl -w`), confirming the redirect path does no wasted work before the auth check.

**Follow-up before shipping beta invites:** run this flow once, live, with a real (test) GitHub account and a human at the keyboard for the OAuth consent screen — the one step that cannot be scripted or substituted.

## 2. Issues discovered and fixed this sprint

| # | Issue | Where | Fix |
|---|---|---|---|
| 1 | A `failed` analysis showed the identical "queued… you can safely leave this page" copy as an in-progress run — actively misleading (CLAUDE.md §19.4/§21.5). | `app/(app)/analysis/page.tsx` | Added a distinct `failed` branch: `ErrorState` with the persisted `error_message`, plus a **Reconnect GitHub** or **Retry analysis** action chosen by `classifyAnalysisFailure()` (new, `features/profile/server/failure-classification.ts`, reads `analysis_errors` under RLS). |
| 2 | No UI surfaced *why* a `partial` analysis was partial, or what it excluded. | `features/profile/types.ts`, `server/service.ts`, `app/(app)/profile/page.tsx` | `AnalysisMetadata` gained `partialMessage`/`repositoryCount`/`evidenceCount`; a new `PartialAnalysisBanner` renders `analyses.error_message` verbatim when `status === 'partial'`. |
| 3 | No single, consistent "how was this generated" trust surface (Section 9 of the spec). | `features/profile/components/ProvenanceBanner.tsx` (new) | "Generated from X repositories, Y evidence items, assessed on Z" banner at the top of `/profile`, linking to the existing Analysis Metadata section, which now also lists the same counts. |
| 4 | `Collaboration` rendered six `0` tiles with no explanation when a candidate had no PR/review/issue activity — reads as broken, not empty. | `features/profile/components/Collaboration.tsx` | Falls back to an explicit "No collaboration activity was found" message when every stat is zero. |
| 5 | `EngineeringSummary` silently rendered nothing under "Strengths"/"Growth areas" if both were empty (aggregator guards this to "shouldn't happen", but the UI had no fallback). | `features/profile/components/EngineeringSummary.tsx` | Added an explicit fallback message pointing to the skill cards below. |
| 6 | `prefers-reduced-motion` was never honored anywhere — `animate-spin`/`animate-pulse` always animated, violating CLAUDE.md §13.6. | `styles/globals.css` | Added a global `@media (prefers-reduced-motion: reduce)` override (zeroes animation/transition duration, disables smooth scroll) — a base-layer accessibility fix, not a design-token change. |
| 7 | Evidence-kind filter badges on the Evidence Explorer conveyed "currently selected" via color/variant only — no signal to assistive tech. | `features/profile/components/EvidenceExplorer.tsx` | Added `aria-current="true"` to the active filter link. |
| 8 | Several repository/skill/topic names had no overflow handling — a long, space-free repo full name could overflow its card/row on mobile (violates "no overflow or clipped evidence"). | `RepositoryHighlights.tsx`, `CodeOwnership.tsx`, `TechnologyMap.tsx`, `EngineeringTimeline.tsx`, `EvidenceExplorer.tsx` | Added `min-w-0` (so flex children can actually shrink) + `break-words` at every identified spot. |
| 9 | `/profile` and `/analysis` had no route-level loading UI — Next.js fell back to a blank page during the server data fetch. | `app/(app)/profile/loading.tsx`, `app/(app)/analysis/loading.tsx` (new), `features/profile/components/ProfileSkeleton.tsx` (new) | Shaped `Skeleton`-based placeholders matching each route's real layout, following the existing pattern from `onboarding/repositories/loading.tsx`. |
| 10 | No mid-flight `AnalysisMetadata` type/service.ts mismatch shipped — caught and fixed before this sprint's own verification pass. | `features/profile/types.ts`, `server/service.ts` | `buildAnalysisMetadata()` updated to compute and populate `partialMessage`/`repositoryCount`/`evidenceCount`; confirmed via `tsc --noEmit`. |

## 3. Accessibility audit (CLAUDE.md §13)

- **Automated**: `eslint-plugin-jsx-a11y` (via `next/core-web-vitals` + `plugin:jsx-a11y/recommended`, both at `error`) passes clean across every file touched this sprint.
- **Keyboard**: `SkillCards` uses native `<details>/<summary>` — keyboard-operable without any custom JS. Evidence-kind filters are real `<a>` elements. Focus-visible styling is global (`:focus-visible { outline: 2px solid var(--focus) }`) and was not touched or overridden anywhere in this feature.
- **Semantics & headings**: every profile section has a real (visually `sr-only`) `<h2>` matching its visible `CardTitle` text, so screen-reader heading navigation and sighted labeling agree.
- **Color**: confidence bands, skill levels, and filter state all carry a text label alongside their color/variant — verified no section relies on color alone (fixed the one gap found: item 7 above).
- **Motion**: fixed — see item 6 above.
- **Not verified live**: a manual screen-reader pass (VoiceOver/NVDA) on `/profile` and `/analysis`, since no authenticated browser session was available in this environment (see §1). This is the one accessibility item that needs a human pass before the beta opens.

## 4. Responsive QA (mobile/tablet/laptop/desktop)

Static review of every profile component's Tailwind responsive classes, plus a live check of the reachable (unauthenticated) surfaces at 375×812 (mobile). Fixed the concrete overflow risks found (§2 item 8). Grids already degrade to a single column below `sm:` (`RepositoryHighlights`, `SkillCards`), and evidence rows already stack (`sm:flex-row`) rather than compress. **Not verified live**: the authenticated `/profile` page across all four breakpoints with real evidence volume — same limitation as §1.

## 5. Performance

- **Database**: two query-plan issues found and fixed last session via `supabase/migrations/20260726090000_add_profile_read_path_indexes.sql` — Postgres was choosing a global index + recheck for "current assessments for profile X" and sorting `evidence_items` in memory for "evidence for profile X, most recent first." Both queries are sub-millisecond at current data volume; the new indexes (`skill_assessments_profile_current_idx`, `evidence_items_profile_occurred_at_idx`) prevent the wrong plan from being chosen as candidate volume grows. **Slowest query pre-fix**: the evidence-items fetch (in-memory sort), now index-served.
- **Aggregation**: `features/profile/server/aggregator.ts` does one `O(n)` pass over `evidence` per section (technology map, timeline, collaboration, ownership, highlights) — confirmed no nested loop over `evidence` anywhere; cost scales linearly with evidence count, not quadratically.
- **Server render**: `getProfileForCurrentUser()`'s 6 queries run via `Promise.all` where independent; the auth-redirect path alone costs ~2ms (measured). Full authenticated render time was not measurable live (§1) — the query and aggregation numbers above are the honest proxy.
- **Bundle size**: `/profile` first-load JS is 118 kB after this sprint's additions (was 117 kB before), comfortably under the 250 KB/route budget (CLAUDE.md §21 table).

## 6. Security advisories (Supabase `get_advisors`)

Ran after every migration this sprint. All findings below **pre-date this sprint** and were not introduced by any change here — flagged for follow-up, not fixed, since they sit outside `features/profile`/`features/analytics`:

- `public.github_credentials` has RLS enabled with **no policies** — currently deny-by-default by omission, but should get an explicit policy (or an explicit comment stating "intentionally no non-service-role access") so the absence reads as a decision, not an oversight.
- Several `SECURITY DEFINER` functions (`current_consent`, `current_recruiter_organization_id`, `current_user_role`, `enqueue_analysis_with_snapshot`, `is_recruiter_visible`) are callable by `authenticated` — worth a pass to confirm each one is intentionally exposed at that privilege level.
- `claim_next_queued_analysis` has a mutable `search_path`.
- Leaked-password protection (HaveIBeenPwned check) is disabled in Supabase Auth.

The new `analytics_events` table and its policies raised **zero** advisor findings.

## 7. Privacy-preserving analytics

New `features/analytics` module (see its README) tracks `profile_viewed`, `evidence_expanded`, `analysis_completed`, `repository_connected`. Metadata is a closed, structural shape per event (counts/status/slug only) — no repository contents, code, or evidence text can enter the table by construction. Writes go through the caller's own RLS session; there is no `select` grant for `authenticated` at all (aggregation is a service-role/internal concern). Verified via `tsc --noEmit`, lint, and a full `next build` (confirms the client/server boundary: the one client-triggered event, `evidence_expanded`, is wired through a dedicated `'use server'` action file, not the feature's full barrel, to avoid pulling `server-only` code into the client bundle).
