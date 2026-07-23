-- profiles: base identity row for every authenticated user (student,
-- recruiter, or admin), 1:1 with auth.users (ADR-001: Supabase Auth is the
-- identity system). Classification: internal.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null,
  full_name text,
  avatar_url text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Base identity row for every authenticated user (student|recruiter|admin), 1:1 with auth.users. Classification: internal.';

-- Shared updated_at trigger function, reused by every mutable table in
-- this schema.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- Auto-create a profile row when a new auth.users row is created. Role
-- defaults to 'student' unless signup passes a different role via
-- user_metadata (e.g. a recruiter accepting a workspace invitation).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, avatar_url)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'student'),
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- A user must never self-escalate role (student -> admin, etc.) — only
-- service_role (backend/operator actions) may change it. Enforced as a
-- trigger, not just RLS, since RLS restricts row visibility, not which
-- columns change within a row the user already owns.
create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role and auth.role() <> 'service_role' then
    raise exception 'role cannot be changed by the user; contact an operator';
  end if;
  return new;
end;
$$;

create trigger prevent_profiles_role_change
  before update on public.profiles
  for each row
  execute function public.prevent_role_self_escalation();

-- Cheap current-role lookup for RLS policies across this schema.
-- SECURITY DEFINER is safe here because the query is hard-scoped to
-- auth.uid() — it can never return another user's role.
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "profiles_select_admin"
  on public.profiles for select
  to authenticated
  using (public.current_user_role() = 'admin');

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Note: hard account deletion (CLAUDE.md §15.4, PRD §12.5) must be a
-- deliberate, ordered script (assessment_evidence -> skill_assessments ->
-- analyses -> evidence_items -> repositories -> github_accounts -> other
-- profile_id-referencing tables -> recruiters -> profiles), never a bare
-- `DELETE FROM profiles`. Several FKs below use ON DELETE RESTRICT to
-- protect provenance/evidence integrity, and RESTRICT checks are always
-- immediate (not deferrable) in Postgres — a naive single cascading
-- delete can violate them depending on cascade path ordering.
