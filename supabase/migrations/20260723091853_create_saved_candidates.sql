create table public.saved_candidates (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid not null references public.recruiters (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (recruiter_id, profile_id)
);

comment on table public.saved_candidates is 'Recruiter bookmarks of candidates (simplified MVP form of PRD §9.2 pipeline intelligence). Classification: internal.';

create trigger set_saved_candidates_updated_at
  before update on public.saved_candidates
  for each row
  execute function public.set_updated_at();

create index saved_candidates_recruiter_idx on public.saved_candidates (recruiter_id);

alter table public.saved_candidates enable row level security;

create policy "saved_candidates_owner_all"
  on public.saved_candidates for all
  to authenticated
  using (recruiter_id = auth.uid())
  with check (recruiter_id = auth.uid());
