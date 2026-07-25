-- Privacy-preserving product analytics (beta-readiness spec §8: "track
-- profile viewed, evidence expanded, analysis completed, repository
-- connected — never log repository contents or code"). `event_name` is a
-- closed set, `metadata` is a small allowlisted JSON blob populated by
-- `features/analytics` — never raw evidence, repository contents, or code
-- (CLAUDE.md §20.4). Classification: internal.
create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  event_name text not null check (
    event_name in ('profile_viewed', 'evidence_expanded', 'analysis_completed', 'repository_connected')
  ),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.analytics_events is 'Privacy-preserving product analytics events. metadata is a small allowlisted blob — never repository contents, code, or evidence text. Classification: internal.';

create index analytics_events_profile_event_idx on public.analytics_events (profile_id, event_name, created_at desc);

-- `analysis_completed` and `repository_connected` are one-time milestones
-- per profile — the pages that emit them may re-render on every visit
-- (e.g. revisiting /analysis after it's done), so this index makes
-- `ON CONFLICT DO NOTHING` the record-once mechanism instead of a
-- read-then-write race.
create unique index analytics_events_milestone_once_idx
  on public.analytics_events (profile_id, event_name)
  where event_name in ('analysis_completed', 'repository_connected');

alter table public.analytics_events enable row level security;

-- Write-only from the app's perspective: each user can record their own
-- events, but no `select` policy exists for `authenticated` — analytics
-- aggregation is a service-role/internal concern, not a user-facing read
-- (CLAUDE.md §18.2 deny-by-default).
create policy "analytics_events_insert_own"
  on public.analytics_events
  for insert
  to authenticated
  with check (profile_id = (select auth.uid()));

revoke select, update, delete on public.analytics_events from anon, authenticated;
