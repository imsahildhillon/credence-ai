create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  evidence_item_id uuid references public.evidence_items (id) on delete cascade,
  status public.analysis_status not null default 'queued',
  model text not null,
  pipeline_version text not null,
  prompt_version text,
  summary text,
  confidence public.confidence_level,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint analyses_completed_requires_summary_and_confidence check (
    status <> 'completed' or (summary is not null and confidence is not null)
  )
);

comment on table public.analyses is 'AI analysis job records (repo analysis, interview evaluation, report synthesis). Tracks model/pipeline/prompt version per job for reproducibility (CLAUDE.md §14.4, §17.8). Classification: internal (summary content derived from sensitive sources).';

create trigger set_analyses_updated_at
  before update on public.analyses
  for each row
  execute function public.set_updated_at();

create index analyses_profile_status_idx on public.analyses (profile_id, status);

alter table public.analyses enable row level security;

create policy "analyses_select_own"
  on public.analyses for select
  to authenticated
  using (profile_id = auth.uid());

create policy "analyses_select_recruiter_visible"
  on public.analyses for select
  to authenticated
  using (
    status = 'completed'
    and public.current_user_role() = 'recruiter'
    and public.is_recruiter_visible(profile_id)
  );

-- No insert/update/delete policy for authenticated: analyses are written
-- exclusively by the backend job pipeline via the service-role client
-- (CLAUDE.md §14 — async job spine), never directly by a student or
-- recruiter request.
