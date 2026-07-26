-- claim_next_analysis() reclaimed stale runs with no attempt bound — a
-- poison job (one that always crashes the worker at the same point) would
-- be reclaimed forever. Bounds it: past MAX_ATTEMPTS, a stale run is left
-- alone for the orchestrator's own terminal-failure path to catch instead
-- of being handed back out.
create or replace function public.claim_next_analysis(
  p_worker_id text,
  p_stale_after interval default interval '5 minutes'
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
  v_max_attempts constant integer := 3;
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
    where (
      q.status = 'queued'
      or (
        q.status in ('processing', 'ingesting', 'assessing', 'finalizing')
        and q.heartbeat_at is not null
        and q.heartbeat_at < now() - p_stale_after
        and q.attempt_count < v_max_attempts
      )
    )
    order by q.created_at
    for update skip locked
    limit 1
  )
  returning a.id into v_id;

  return v_id;
end;
$$;
