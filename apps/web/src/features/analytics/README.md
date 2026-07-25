# features/analytics/

Privacy-preserving product analytics: `profile_viewed`, `evidence_expanded`, `analysis_completed`, `repository_connected`. Beta-readiness requirement — measure real usage of the Candidate Engineering Profile without ever recording what's in it.

**Public interface** (`index.ts`): `trackEvent(eventName, metadata)`, `AnalyticsEventName`, `AnalyticsEventMetadata`.

**Key invariants:**

- **Metadata is a closed, structural shape per event** (`types.ts`) — counts, statuses, IDs. No event accepts free text, so repository contents, code, and evidence text structurally cannot end up in this table (CLAUDE.md §20.4).
- **Writes go through the caller's own RLS session**, never service-role — `analytics_events` has an insert-only policy scoped to `profile_id = auth.uid()` and no `select` grant for `authenticated` at all (CLAUDE.md §18.2 deny-by-default; aggregation is a service-role/internal concern, not a product read path).
- **Best-effort, always.** `trackEvent` never throws — a dropped event is not worth degrading the page that emits it (CLAUDE.md §19.1).
- **Milestones record once.** `analysis_completed` and `repository_connected` are guarded by a partial unique index on `(profile_id, event_name)`; the calling page doesn't need to check "have I already recorded this" — a duplicate insert just fails-silent on the unique constraint.

**Full documentation:** [docs/04-system-architecture.md](../../../../../docs/04-system-architecture.md) § Candidate Engineering Profile.
