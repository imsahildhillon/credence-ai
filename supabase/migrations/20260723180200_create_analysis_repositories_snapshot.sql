-- Immutable per-analysis repository snapshot.
--
-- WHY: a queued job previously meant "analyze whatever repositories.included
-- says at the time the worker runs". That is not reproducible — a student can
-- change their selection (or a re-import can change repo metadata) between
-- enqueue and execution, so the same job could analyze a different set, and a
-- historical assessment could never be explained against the inputs that
-- actually produced it (CLAUDE.md §14.4 versioned/auditable pipeline, §15.2
-- provenance). The snapshot pins the exact analyzed set at enqueue time.
--
-- The worker MUST read this table, never repositories.included.
create table public.analysis_repositories (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  -- RESTRICT (not CASCADE): a repository row that a historical analysis was
  -- built from must not vanish silently, mirroring evidence_items.repository_id.
  repository_id uuid not null references public.repositories (id) on delete restrict,
  github_repo_id bigint not null,
  full_name text not null,
  default_branch text,
  is_private boolean not null,
  primary_language text,
  commit_sha text,
  created_at timestamptz not null default now(),
  unique (analysis_id, repository_id)
);

comment on table public.analysis_repositories is 'Immutable snapshot of the repositories an analysis was queued against. Written once by enqueue_analysis_with_snapshot(); never updated. The analysis worker reads this, not repositories.included. Classification: internal.';
comment on column public.analysis_repositories.commit_sha is 'HEAD commit of default_branch at enqueue time, best-effort — null when GitHub was unreachable or the token was unavailable. A non-null value makes the run reproducible against an exact commit.';

create index analysis_repositories_analysis_idx on public.analysis_repositories (analysis_id);
create index analysis_repositories_repository_idx on public.analysis_repositories (repository_id);

-- Immutability is enforced by the database, not merely by convention or by
-- withholding grants: even the service-role pipeline cannot mutate a snapshot.
-- UPDATE is blocked outright; DELETE is deliberately left possible so the
-- account-deletion cascade (PRD §12.5 right to erasure) still works.
create or replace function public.prevent_analysis_snapshot_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'analysis_repositories rows are immutable snapshots and cannot be updated';
end;
$$;

create trigger analysis_repositories_immutable
  before update on public.analysis_repositories
  for each row
  execute function public.prevent_analysis_snapshot_update();

alter table public.analysis_repositories enable row level security;

-- Students may read their own snapshots (drill-down / "what was analyzed").
create policy "analysis_repositories_select_own"
  on public.analysis_repositories
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.analyses a
      where a.id = analysis_repositories.analysis_id
        and a.profile_id = (select auth.uid())
    )
  );

-- Writes happen only inside enqueue_analysis_with_snapshot() (SECURITY
-- DEFINER) or via service-role; no client may insert/update/delete.
revoke insert, update, delete on public.analysis_repositories from anon, authenticated;
