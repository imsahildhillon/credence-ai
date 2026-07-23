create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  consent_type public.consent_type not null,
  granted boolean not null,
  recorded_at timestamptz not null default now()
);

comment on table public.consent_records is 'Append-only consent history (analysis|visibility) per profile. Never updated in place (CLAUDE.md §15.3). Classification: regulated.';

create index consent_records_profile_type_recorded_idx
  on public.consent_records (profile_id, consent_type, recorded_at desc);

alter table public.consent_records enable row level security;

create policy "consent_records_select_own"
  on public.consent_records for select
  to authenticated
  using (profile_id = auth.uid());

create policy "consent_records_select_admin"
  on public.consent_records for select
  to authenticated
  using (public.current_user_role() = 'admin');

create policy "consent_records_insert_own"
  on public.consent_records for insert
  to authenticated
  with check (profile_id = auth.uid());

-- Append-only: no update/delete policy is defined (RLS default-denies
-- both already), and the base privilege is revoked too as a second,
-- independent layer — a future migration that accidentally adds an
-- update/delete policy still can't succeed without also re-granting here.
revoke update, delete on public.consent_records from authenticated;

-- Latest consent decision for a profile+type, read live every time (never
-- cached — PRD FR-8.3: "zero caching of consent decisions across
-- requests"). SECURITY DEFINER: a recruiter must be able to check a
-- candidate's *current* visibility without being granted row-level read
-- access to that candidate's full consent_records history.
create or replace function public.current_consent(p_profile_id uuid, p_type public.consent_type)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select granted
  from public.consent_records
  where profile_id = p_profile_id and consent_type = p_type
  order by recorded_at desc
  limit 1;
$$;

-- Single implementation of "is this profile visible to recruiters right
-- now" (CLAUDE.md §16.5). Both visibility=searchable AND analysis consent
-- must currently hold, since revoking analysis consent also hides derived
-- assessments (PRD FR-8.1). Every recruiter-facing policy in this schema
-- calls this function; none re-derive the logic.
create or replace function public.is_recruiter_visible(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_consent(p_profile_id, 'visibility'), false)
     and coalesce(public.current_consent(p_profile_id, 'analysis'), false);
$$;

-- Now that the visibility check exists, extend profiles' policy set so a
-- recruiter can see a currently-visible student's base profile row.
create policy "profiles_select_recruiter_visible"
  on public.profiles for select
  to authenticated
  using (
    public.current_user_role() = 'recruiter'
    and role = 'student'
    and public.is_recruiter_visible(id)
  );
