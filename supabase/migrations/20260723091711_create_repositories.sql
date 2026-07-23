create table public.repositories (
  id uuid primary key default gen_random_uuid(),
  github_account_id uuid not null references public.github_accounts (id) on delete cascade,
  github_repo_id bigint not null,
  full_name text not null,
  description text,
  is_private boolean not null default false,
  is_fork boolean not null default false,
  is_archived boolean not null default false,
  included boolean not null default true,
  primary_language text,
  deployed_url text,
  deployed_url_reachable boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (github_account_id, github_repo_id)
);

comment on table public.repositories is 'Repositories connected from a student''s linked GitHub account (PRD FR-2.1). `included` toggles participation without destroying history; prefer this over deleting the row once evidence has been derived from it (PRD FR-2.7). Classification: internal.';

create trigger set_repositories_updated_at
  before update on public.repositories
  for each row
  execute function public.set_updated_at();

create index repositories_github_account_idx on public.repositories (github_account_id);

alter table public.repositories enable row level security;

create policy "repositories_owner_all"
  on public.repositories for all
  to authenticated
  using (
    exists (
      select 1 from public.github_accounts ga
      where ga.id = repositories.github_account_id
        and ga.profile_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.github_accounts ga
      where ga.id = repositories.github_account_id
        and ga.profile_id = auth.uid()
    )
  );

create policy "repositories_select_recruiter_visible"
  on public.repositories for select
  to authenticated
  using (
    public.current_user_role() = 'recruiter'
    and exists (
      select 1 from public.github_accounts ga
      where ga.id = repositories.github_account_id
        and public.is_recruiter_visible(ga.profile_id)
    )
  );
