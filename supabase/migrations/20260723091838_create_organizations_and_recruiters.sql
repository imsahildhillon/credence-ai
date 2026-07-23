create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  size_band text,
  stage text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.organizations is 'Recruiter design-partner organizations (PRD FR-1.3, FR-11.2 company stage/size band shared on contact requests). Classification: internal.';

create trigger set_organizations_updated_at
  before update on public.organizations
  for each row
  execute function public.set_updated_at();

create table public.recruiters (
  id uuid primary key references public.profiles (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete restrict,
  title text,
  invited_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.recruiters is 'Recruiter-specific extension of profiles; one workspace per recruiter in V1 (PRD FR-1.6). Classification: internal.';

create trigger set_recruiters_updated_at
  before update on public.recruiters
  for each row
  execute function public.set_updated_at();

create index recruiters_organization_idx on public.recruiters (organization_id);

-- Cheap own-organization lookup for RLS, same SECURITY DEFINER pattern as
-- current_user_role() — hard-scoped to auth.uid(), can't leak.
create or replace function public.current_recruiter_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.recruiters where id = auth.uid();
$$;

alter table public.organizations enable row level security;

create policy "organizations_select_member"
  on public.organizations for select
  to authenticated
  using (id = public.current_recruiter_organization_id());

create policy "organizations_select_admin"
  on public.organizations for select
  to authenticated
  using (public.current_user_role() = 'admin');

-- No insert/update/delete policy: organization onboarding is an operator
-- action (PRD FR-1.3 "invitation issued by an operator"), via the
-- service-role client only.

alter table public.recruiters enable row level security;

create policy "recruiters_select_own_or_org"
  on public.recruiters for select
  to authenticated
  using (
    id = auth.uid()
    or organization_id = public.current_recruiter_organization_id()
  );

create policy "recruiters_insert_own"
  on public.recruiters for insert
  to authenticated
  with check (id = auth.uid());

create policy "recruiters_update_own"
  on public.recruiters for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
