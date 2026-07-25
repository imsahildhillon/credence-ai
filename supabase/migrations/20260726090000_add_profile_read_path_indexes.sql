-- Beta-readiness performance pass (docs/beta/e2e-validation.md § Performance).
--
-- Both indexes serve the exact two queries the Candidate Engineering
-- Profile issues on every single view (features/profile/server/queries.ts):
-- "the current version of every assessed skill for this profile" and "all
-- evidence for this profile, most recent first". Verified via EXPLAIN
-- ANALYZE against the dev project before adding these — Postgres was
-- choosing `skill_assessments_superseded_by_idx` (a global index matching
-- every candidate's current assessments) and then filtering by profile_id
-- in a Recheck, instead of going straight to the one profile's rows; and
-- sorting `evidence_items` by `occurred_at` in memory after an index-only
-- filter on `(profile_id, source_type)`. Both are harmless at today's data
-- volume (sub-millisecond either way) but pick the wrong plan as the
-- candidate base grows, since neither existing index has `profile_id` as
-- the leading, highly-selective column for its respective query.
create index skill_assessments_profile_current_idx
  on public.skill_assessments (profile_id)
  where superseded_by is null;

comment on index public.skill_assessments_profile_current_idx is 'Serves "current assessments for profile X" (features/profile) — profile_id as the leading, selective column, scoped to current-version rows only.';

create index evidence_items_profile_occurred_at_idx
  on public.evidence_items (profile_id, occurred_at desc nulls last);

comment on index public.evidence_items_profile_occurred_at_idx is 'Serves "all evidence for profile X, most recent first" (features/profile, Evidence Explorer default sort) without an in-memory sort step.';
