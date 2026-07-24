-- Per-repository failure record.
--
-- A single unreachable/renamed/rate-limited repository must never abort a
-- whole analysis (CLAUDE.md §19.5: partial failure is honest failure). The
-- worker isolates each repository, records what failed here, and continues —
-- the run then completes as `partial` rather than `failed`, and the product
-- can say exactly which repositories are missing and why.
create table public.analysis_errors (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  -- Null when the failure is not attributable to one repository.
  repository_id uuid references public.repositories (id) on delete set null,
  -- Which ingestion stage failed ('repository', 'commits', 'pull_requests'…).
  stage text not null,
  -- Stable machine-readable classification (GithubErrorKind or 'persistence').
  kind text not null,
  -- Operator-facing detail. Never contains a token or candidate PII
  -- (CLAUDE.md §20.4).
  message text not null,
  retryable boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.analysis_errors is 'Per-repository/stage failures during evidence ingestion. Lets one repository fail without failing the run. Classification: internal.';

create index analysis_errors_analysis_idx on public.analysis_errors (analysis_id, created_at desc);

alter table public.analysis_errors enable row level security;

-- Students may see why part of their own analysis is incomplete (the product
-- states what was excluded and why — PRD FR-3, brand "partial failure is
-- honest"). Writes are service-role only: the worker records them.
create policy "analysis_errors_select_own"
  on public.analysis_errors
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.analyses a
      where a.id = analysis_errors.analysis_id
        and a.profile_id = (select auth.uid())
    )
  );

revoke insert, update, delete on public.analysis_errors from anon, authenticated;
