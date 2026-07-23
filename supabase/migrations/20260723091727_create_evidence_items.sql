create table public.evidence_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  evidence_type public.evidence_type not null,
  repository_id uuid references public.repositories (id) on delete restrict,
  title text not null,
  storage_path text,
  external_url text,
  metadata jsonb not null default '{}'::jsonb,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint evidence_items_repository_required_for_github_repo check (
    (evidence_type = 'github_repository' and repository_id is not null)
    or (evidence_type <> 'github_repository' and repository_id is null)
  )
);

comment on table public.evidence_items is 'Evidence and unverified claims per profile: github_repository, resume_claim, certificate, deployment_url (PRD FR-2). resume_claim rows are unverified by construction (verified defaults false) — resume claims never directly produce assessments (FR-2.3). Classification: internal (resume/certificate content: sensitive).';

comment on column public.evidence_items.repository_id is 'ON DELETE RESTRICT: a repository with derived evidence should be deselected (repositories.included = false), never hard-deleted.';

create trigger set_evidence_items_updated_at
  before update on public.evidence_items
  for each row
  execute function public.set_updated_at();

create index evidence_items_profile_idx on public.evidence_items (profile_id);
create index evidence_items_type_idx on public.evidence_items (evidence_type);

alter table public.evidence_items enable row level security;

create policy "evidence_items_owner_all"
  on public.evidence_items for all
  to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy "evidence_items_select_recruiter_visible"
  on public.evidence_items for select
  to authenticated
  using (
    public.current_user_role() = 'recruiter'
    and public.is_recruiter_visible(profile_id)
  );
