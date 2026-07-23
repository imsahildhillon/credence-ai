create table public.skill_assessments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete restrict,
  analysis_id uuid not null references public.analyses (id) on delete restrict,
  level public.assessment_level not null,
  confidence public.confidence_level not null,
  reasoning text not null,
  version integer not null,
  superseded_by uuid references public.skill_assessments (id),
  created_at timestamptz not null default now(),
  unique (profile_id, skill_id, version)
);

comment on table public.skill_assessments is 'Versioned, append-only skill assessments (PRD FR-5.2, CLAUDE.md §15.3). Never updated in place; a re-assessment inserts a new version and sets superseded_by on the prior row. Classification: sensitive.';

create index skill_assessments_profile_skill_idx on public.skill_assessments (profile_id, skill_id);

alter table public.skill_assessments enable row level security;

create policy "skill_assessments_select_own"
  on public.skill_assessments for select
  to authenticated
  using (profile_id = auth.uid());

create policy "skill_assessments_select_recruiter_visible"
  on public.skill_assessments for select
  to authenticated
  using (
    public.current_user_role() = 'recruiter'
    and public.is_recruiter_visible(profile_id)
  );

-- Append-only, service-role-written only: no insert/update/delete policy
-- for authenticated, and update/delete are revoked at the grant level too
-- (defense in depth, same reasoning as consent_records).
revoke update, delete on public.skill_assessments from authenticated;

-- assessment_evidence: the structural provenance link CLAUDE.md §15.2
-- names explicitly — "skill_assessments cannot exist without rows in
-- assessment_evidence linking to evidence_items". The >=1-evidence-item
-- invariant is enforced by the pipeline writing both in one transaction
-- (as CLAUDE.md §15.2 specifies), not by a DB trigger here.
create table public.assessment_evidence (
  assessment_id uuid not null references public.skill_assessments (id) on delete cascade,
  evidence_item_id uuid not null references public.evidence_items (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (assessment_id, evidence_item_id)
);

comment on table public.assessment_evidence is 'Junction: which evidence_items support a given skill_assessments version (CLAUDE.md §15.2 provenance). Classification: sensitive.';

create index assessment_evidence_evidence_item_idx on public.assessment_evidence (evidence_item_id);

alter table public.assessment_evidence enable row level security;

create policy "assessment_evidence_select_via_assessment"
  on public.assessment_evidence for select
  to authenticated
  using (
    exists (
      select 1 from public.skill_assessments sa
      where sa.id = assessment_evidence.assessment_id
        and (
          sa.profile_id = auth.uid()
          or (public.current_user_role() = 'recruiter' and public.is_recruiter_visible(sa.profile_id))
        )
    )
  );

revoke update, delete on public.assessment_evidence from authenticated;
