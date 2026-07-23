create table public.github_accounts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  github_user_id bigint not null,
  github_username text not null,
  private_repo_access_granted_at timestamptz,
  connected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id),
  unique (github_user_id)
);

comment on table public.github_accounts is 'Linked GitHub identity per student profile (PRD FR-1.1, FR-1.4: one student account per GitHub identity). Classification: internal.';

create trigger set_github_accounts_updated_at
  before update on public.github_accounts
  for each row
  execute function public.set_updated_at();

create index github_accounts_profile_idx on public.github_accounts (profile_id);

alter table public.github_accounts enable row level security;

-- Owner-only in every direction; no recruiter policy exists on this table
-- at all. GitHub identity is excluded from the anonymized recruiter view
-- until a contact request is accepted (PRD FR-8.7), so recruiters get no
-- read path here whatsoever — default-deny covers it.
create policy "github_accounts_owner_all"
  on public.github_accounts for all
  to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
