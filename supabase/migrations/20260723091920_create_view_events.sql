create table public.view_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  viewer_recruiter_id uuid references public.recruiters (id) on delete set null,
  source text not null default 'recruiter_search',
  viewed_at timestamptz not null default now(),
  constraint view_events_source_known check (source in ('recruiter_search', 'recruiter_summary', 'share_link'))
);

comment on table public.view_events is 'Append-only audit log powering "who viewed my profile" (PRD FR-8.6, FR-10.6). Classification: regulated.';

create index view_events_profile_idx on public.view_events (profile_id, viewed_at desc);

alter table public.view_events enable row level security;

create policy "view_events_select_own"
  on public.view_events for select
  to authenticated
  using (profile_id = auth.uid());

create policy "view_events_select_admin"
  on public.view_events for select
  to authenticated
  using (public.current_user_role() = 'admin');

-- No insert policy for authenticated: logged server-side at view time via
-- the service-role client, so a client can never forge a fake view event.
revoke update, delete on public.view_events from authenticated;
