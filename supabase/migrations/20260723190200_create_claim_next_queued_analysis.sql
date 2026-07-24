-- Atomic queue claim: moves exactly one job queued → processing and returns
-- its id, or null when the queue is empty.
--
-- `FOR UPDATE SKIP LOCKED` is what makes this safe to run from several worker
-- instances at once — two workers can never claim the same job, and neither
-- blocks the other. This is the piece that lets `analyses` behave as a work
-- queue until the BullMQ spine (CLAUDE.md §14) exists.
--
-- Deliberately SECURITY INVOKER and granted only to `service_role`: claiming
-- work is a backend operation, never something a signed-in user can do.
create or replace function public.claim_next_queued_analysis()
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  update public.analyses a
  set status = 'processing',
      started_at = now()
  where a.id = (
    select q.id
    from public.analyses q
    where q.status = 'queued'
    order by q.created_at
    for update skip locked
    limit 1
  )
  returning a.id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.claim_next_queued_analysis() from public, anon, authenticated;
grant execute on function public.claim_next_queued_analysis() to service_role;
