-- Atomic enqueue: creates the analysis job AND its immutable repository
-- snapshot in one transaction, so a job can never exist without the snapshot
-- that defines what it analyzes (CLAUDE.md §14.5 transactions around
-- invariants; §15 no orphans).
--
-- Ownership is validated *in SQL by construction*: the snapshot is built from
-- a query joined through github_accounts to auth.uid(), so only the caller's
-- own repositories can ever be snapshotted. The caller-supplied
-- `p_commit_shas` map is keyed by repository id and applied only to rows that
-- ownership-scoped query already returned — a forged id cannot inject a
-- foreign repository, it is simply ignored.
--
-- Replaces the direct client INSERT policy on analyses: enqueueing now has
-- exactly one, validated entry point.
drop policy if exists "analyses_insert_own_queued" on public.analyses;

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

  -- Reuse an already-active job instead of stacking duplicates. Its snapshot
  -- stays authoritative — that is the point of a snapshot.
  select a.id into v_analysis_id
  from public.analyses a
  where a.profile_id = v_profile
    and a.status in ('queued', 'processing')
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

revoke execute on function public.enqueue_analysis_with_snapshot(jsonb) from public, anon;
grant execute on function public.enqueue_analysis_with_snapshot(jsonb) to authenticated;
