# features/profile/

The Candidate Engineering Profile — an explainable engineering dossier, not a résumé. Every AI-generated insight renders through `EvidenceCard` or `AiContentMarker` (`src/components/`), so a claim without evidence and confidence cannot be shown, by construction.

```
analyses + skill_assessments + assessment_evidence + evidence_items + repositories
             → server/queries.ts (RLS-scoped, batched reads)
             → server/aggregator.ts (pure — technology map, timeline, collaboration, ownership, highlights)
             → server/service.ts (orchestration → ProfileResult)
             → app/(app)/profile/page.tsx
```

**Public interface** (`index.ts`): `getProfileForCurrentUser()`, `EvidenceExplorerSearchParamsSchema`, `ProfileData`/`ProfileResult` types.

**Key invariants:**

- **No AI runs in this feature.** Sections 1–2 (Engineering Summary, Skill Cards) render text `features/analysis` already persisted; sections 3–7 (Technology Map, Timeline, Collaboration, Code Ownership, Repository Highlights) are pure counting/grouping over `evidence_items` — see `server/aggregator.ts`. Nothing here calls Claude, and nothing here can hallucinate, because nothing here generates anything.
- **Only the authenticated owner can view.** Every query in `server/queries.ts` runs through the user-scoped server client — Row Level Security is the ownership boundary, not a service-role read plus an application check. There is no service-role client anywhere in this feature.
- **Batched, not per-row.** Assembling the whole profile is 6 queries total regardless of how much evidence a candidate has: one analysis row, one github_accounts row, one skill_assessments query (joined to skills), one assessment_evidence query (all links, one `IN`), one evidence_items query (all evidence, one query), one repositories query (one `IN`). No N+1 anywhere in the call graph.
- **Code Ownership is built from `contributor` evidence, not `commit` evidence.** The evidence pipeline caps how many individual commits it ingests per repository (`MAX_COMMITS`); computing "commit share" from that capped sample would understate contribution on active repositories. `contributor` evidence carries GitHub's own whole-repository tally, so ownership math uses that instead.
- **Repository descriptions are structural facts, not generated text.** "Purpose" in Repository Highlights is the repository's own GitHub description, or a bounded README excerpt already stored by the evidence pipeline — never text generated for this page.
- **`/profile` only renders `completed`/`partial` analyses.** `queued`/`processing`/`failed` all redirect to `/analysis`, which already owns those states; a `partial` analysis renders fully here (labeled, not hidden — CLAUDE.md §19.5), it is never treated as a failure.
- **The Evidence Explorer is server-rendered, link-based filtering.** Kind/page filters are plain URL query params, validated once (`schemas.ts`) at the boundary — no client-side data transformation, no client component for the list itself.

**Not built yet:** `ConsentSurface` and public (unauthenticated) profile sharing — see "Future Public Profile" in [docs/04-system-architecture.md](../../../../../docs/04-system-architecture.md) § Candidate Engineering Profile for the shape that would take without weakening today's access control.

**Full documentation:** [docs/04-system-architecture.md](../../../../../docs/04-system-architecture.md) § Candidate Engineering Profile.
