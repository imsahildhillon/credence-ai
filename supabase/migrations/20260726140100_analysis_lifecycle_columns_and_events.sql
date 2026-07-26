-- Split into its own migration from the enum-value additions
-- (20260726140000): Postgres does not allow a newly added enum value to be
-- referenced by name in the same transaction that added it, so this file's
-- default/backfill using 'ingesting' etc. must run as a separate migration.

-- Lease + liveness columns. `heartbeat_at` is the piece that makes "stalled"
-- an observed fact: a claimed run whose heartbeat has gone quiet past a
-- threshold is detectably dead, not merely slow (CLAUDE.md §19.6 — a job
-- never sits in processing limbo silently).
alter table public.analyses
  add column heartbeat_at timestamptz,
  add column attempt_count integer not null default 0,
  add column claimed_by text,
  -- Cancellation checkpoint groundwork only — no action sets this yet, same
  -- pattern as evidence_items.link_dead_at in a prior migration: the column
  -- exists so a future cancel feature is additive, not a redesign.
  add column cancellation_requested_at timestamptz;

comment on column public.analyses.heartbeat_at is
  'Refreshed by the worker at each lifecycle checkpoint. A claimed run whose heartbeat is older than the reclaim threshold is stalled, not merely slow.';
comment on column public.analyses.attempt_count is
  'Incremented on every claim (fresh or reclaim). Bounds automatic reclaim so a poison job terminally fails instead of looping forever.';
comment on column public.analyses.claimed_by is
  'Opaque worker identity holding the current lease — debuggability under multiple worker processes.';
comment on column public.analyses.cancellation_requested_at is
  'Groundwork only: no feature sets this yet. The orchestrator checks it at defined checkpoints so a future cancel action is additive.';

-- Append-only observability log — the fine-grained "what happened, when"
-- that analyses.status alone cannot carry, mirroring the audit-log pattern
-- already established for analysis_errors (CLAUDE.md §15.3).
create table public.analysis_events (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index analysis_events_analysis_id_idx on public.analysis_events (analysis_id, created_at);

alter table public.analysis_events enable row level security;

create policy "analysis_events_select_own" on public.analysis_events
  for select using (
    exists (
      select 1 from public.analyses a
      where a.id = analysis_id and a.profile_id = (select auth.uid())
    )
  );

-- Only the worker (service_role) ever writes events.
revoke insert, update, delete on public.analysis_events from authenticated, anon;

-- Replaces claim_next_queued_analysis: claims either a fresh `queued` row or
-- reclaims a `processing`-family row (ingesting/assessing/finalizing) whose
-- heartbeat has gone stale — the crash-recovery path. Bumping attempt_count
-- on every claim is what lets the orchestrator bound retries.
create or replace function public.claim_next_analysis(
  p_worker_id text,
  p_stale_after interval default interval '5 minutes'
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  update public.analyses a
  set status = 'ingesting',
      started_at = coalesce(a.started_at, now()),
      heartbeat_at = now(),
      claimed_by = p_worker_id,
      attempt_count = a.attempt_count + 1
  where a.id = (
    select q.id
    from public.analyses q
    where q.status = 'queued'
       or (
         q.status in ('processing', 'ingesting', 'assessing', 'finalizing')
         and q.heartbeat_at is not null
         and q.heartbeat_at < now() - p_stale_after
       )
    order by q.created_at
    for update skip locked
    limit 1
  )
  returning a.id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.claim_next_analysis(text, interval) from public, anon, authenticated;
grant execute on function public.claim_next_analysis(text, interval) to service_role;

drop function if exists public.claim_next_queued_analysis();

-- A student re-clicking "Start Analysis" on a run whose worker died should
-- get a fresh attempt, not the same permanently-stuck job handed back
-- forever. Only dedupes against a run that is still genuinely live
-- (recent heartbeat, or not yet claimed at all).
create or replace function public.enqueue_analysis_with_snapshot(p_commit_shas jsonb default '{}'::jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile uuid := (select auth.uid());
  v_analysis_id uuid;
  v_selected integer;
begin
  if v_profile is null then
    raise exception 'not authenticated';
  end if;

  select a.id into v_analysis_id
  from public.analyses a
  where a.profile_id = v_profile
    and (
      a.status = 'queued'
      or (
        a.status in ('processing', 'ingesting', 'assessing', 'finalizing')
        and (a.heartbeat_at is null or a.heartbeat_at > now() - interval '5 minutes')
      )
    )
  order by a.created_at desc
  limit 1;

  if v_analysis_id is not null then
    return v_analysis_id;
  end if;

  select count(*) into v_selected
  from public.repositories r
  join public.github_accounts ga on ga.id = r.github_account_id
  where ga.profile_id = v_profile
    and r.included;

  if v_selected = 0 then
    raise exception 'no repositories selected for analysis';
  end if;

  insert into public.analyses (profile_id, status)
  values (v_profile, 'queued')
  returning id into v_analysis_id;

  insert into public.analysis_repositories (
    analysis_id, repository_id, github_repo_id, full_name,
    default_branch, is_private, primary_language, commit_sha
  )
  select
    v_analysis_id,
    r.id,
    r.github_repo_id,
    r.full_name,
    r.default_branch,
    r.is_private,
    r.primary_language,
    nullif(p_commit_shas ->> (r.id::text), '')
  from public.repositories r
  join public.github_accounts ga on ga.id = r.github_account_id
  where ga.profile_id = v_profile
    and r.included;

  return v_analysis_id;
end;
$$;
