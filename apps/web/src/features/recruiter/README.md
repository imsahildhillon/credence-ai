# features/recruiter/

The Recruiter MVP: an invitation-only, read-mostly view of consented candidates, plus a recruiter's private tracking (bookmark, status, notes) on top. This feature computes no assessment, skill, or evidence fact of its own — every claim about a candidate's work is `features/profile`'s pipeline, reused as-is.

```
getRecruiterSession()  →  proves "this session is an invited recruiter" (recruiters row exists)
        │
        ├─ getCandidateList(sort)        → profiles + analyses + skill_assessments + saved_candidates (this feature's own light queries)
        └─ getCandidateProfile(profileId) → features/profile.getProfileForRecruiter(profileId)  (shared pipeline, zero duplication)
                                           + this feature's own saved_candidates row (tracking)
```

**Public interface** (`index.ts`): `getRecruiterSession`, `getCandidateList`, `getCandidateProfile`, `listShortlist`, the note/status/bookmark Server Actions, `CandidateListSearchParamsSchema`, and this feature's types. Client components that call a Server Action import it directly from `./server/actions` (not the barrel) — same pattern as `features/analytics`, to keep `server-only` code out of the client bundle.

**Key invariants:**

- **Authorization is checked twice, never once.** `getRecruiterSession()` (a service-layer check — "does a `recruiters` row exist for this session") gates every function here, *and* every table read/write still runs through RLS's own `current_user_role() = 'recruiter' and is_recruiter_visible(profile_id)` policies. Neither is trusted alone (CLAUDE.md §18.2).
- **No self-signup, ever.** A `recruiters` row can only be created by an operator through the service-role client (ADR-003) — there is no code path in this feature, or anywhere in the app, that creates one. "Invited" is a fact about the database, not a flow this feature implements.
- **The candidate list has no ranking, no AI sorting.** `getCandidateList` supports exactly two sorts — most-recently-analyzed and alphabetical — both plain field comparisons. Nothing here scores or ranks candidates against each other.
- **Notes are never sent to Claude.** `saved_candidates.note` is recruiter-private markdown, rendered client-side with `react-markdown` (no `dangerouslySetInnerHTML`), and is not read by any AI-pipeline code path.
- **`view_events` writes use the service-role client on purpose.** That table has no `insert` policy for `authenticated` — a client must never be able to forge its own "viewed" audit row. `logCandidateViewEvent` is only called after independently confirming `is_recruiter_visible` for the profile being viewed.
- **Bookmark/status/note all live on one row** (`saved_candidates`, extended this sprint) instead of three separate tables — a recruiter's tracking state for one candidate is one concept with three fields, not three concepts (CLAUDE.md §2.2, reuse over proliferation).

**Full documentation:** [docs/04-system-architecture.md](../../../../../docs/04-system-architecture.md) § Recruiter View.
