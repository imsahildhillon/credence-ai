-- Analysis pipeline orchestration (ADR-009): collapses the two-column
-- status/stage design down to one enum extension, adds lease/heartbeat
-- columns so a stalled run is a detectable fact instead of indistinguishable
-- from a healthy one, adds an append-only analysis_events table for
-- observability, and adds a cancellation checkpoint column (groundwork only
-- — no cancel action exists yet, same pattern as evidence_items.link_dead_at).

-- Existing rows are both `queued` today (verified before writing this
-- migration) — nothing to backfill. `processing` stays in the enum
-- (Postgres cannot cheaply drop enum values) but is never written again.
alter type public.analysis_status add value if not exists 'ingesting' after 'queued';
alter type public.analysis_status add value if not exists 'assessing' after 'ingesting';
alter type public.analysis_status add value if not exists 'finalizing' after 'assessing';
alter type public.analysis_status add value if not exists 'cancelled' after 'finalizing';
