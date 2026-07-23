create table public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid not null references public.recruiters (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  status public.contact_request_status not null default 'pending',
  role_context text not null,
  responded_at timestamptz,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contact_requests_role_context_length check (char_length(role_context) <= 500)
);

comment on table public.contact_requests is 'Recruiter-to-candidate contact request lifecycle (PRD FR-11). Contact details are only exchanged once status = accepted — enforced at the API/service layer, not by this table alone. Classification: sensitive.';

create trigger set_contact_requests_updated_at
  before update on public.contact_requests
  for each row
  execute function public.set_updated_at();

-- One active (pending) request per recruiter-candidate pair (PRD FR-11.3).
-- Historical declined/expired/accepted rows are unaffected by this index.
create unique index contact_requests_one_pending_per_pair
  on public.contact_requests (recruiter_id, profile_id)
  where status = 'pending';

create index contact_requests_profile_idx on public.contact_requests (profile_id);

alter table public.contact_requests enable row level security;

create policy "contact_requests_select_participant"
  on public.contact_requests for select
  to authenticated
  using (recruiter_id = auth.uid() or profile_id = auth.uid());

create policy "contact_requests_insert_recruiter"
  on public.contact_requests for insert
  to authenticated
  with check (
    recruiter_id = auth.uid()
    and public.current_user_role() = 'recruiter'
    and public.is_recruiter_visible(profile_id)
  );

-- Only the candidate may change status (accept/decline) — the recruiter
-- who sent the request cannot self-accept (PRD FR-11: "candidate must
-- accept before any identity/contact exchange").
create policy "contact_requests_update_candidate"
  on public.contact_requests for update
  to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
