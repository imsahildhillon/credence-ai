-- Atomic, self-validating persistence for one skill assessment.
--
-- CLAUDE.md §15.2 states the invariant plainly: "skill_assessments cannot
-- exist without rows in assessment_evidence linking to evidence_items",
-- written "in one transaction — the database never holds an orphaned claim".
-- supabase-js issues one statement per call and cannot open a transaction,
-- so the only place that invariant can actually hold is inside a function
-- (CLAUDE.md §15.8 sanctions `.rpc()` on a documented Postgres function for
-- exactly this reason).
--
-- It also puts citation validation at the lowest possible layer. An LLM can
-- return an evidence id that never existed, or one belonging to a different
-- candidate. Checking that in TypeScript would make the guarantee only as
-- strong as the caller; checking it here makes a hallucinated citation
-- *unpersistable* — the insert raises and the whole assessment is rejected,
-- rather than a claim landing with a broken provenance trail.
create or replace function public.persist_skill_assessment(
  p_analysis_id uuid,
  p_skill_slug text,
  p_level public.assessment_level,
  p_confidence public.confidence_level,
  p_reasoning text,
  p_strengths text[],
  p_growth_areas text[],
  p_evidence_item_ids uuid[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_skill_id uuid;
  v_prior_id uuid;
  v_prior_version integer;
  v_cited_count integer;
  v_valid_count integer;
  v_assessment_id uuid;
begin
  -- The profile is derived from the analysis, never passed in: the caller
  -- cannot attribute an assessment to someone else's profile.
  select a.profile_id into v_profile_id
  from public.analyses a
  where a.id = p_analysis_id;

  if v_profile_id is null then
    raise exception 'analysis % does not exist', p_analysis_id
      using errcode = 'foreign_key_violation';
  end if;

  -- The taxonomy is fixed (PRD FR-5.1). A slug the model invented resolves
  -- to nothing and the assessment is rejected — no free-form skills.
  select s.id into v_skill_id
  from public.skills s
  where s.slug = p_skill_slug;

  if v_skill_id is null then
    raise exception 'unknown skill slug %', p_skill_slug
      using errcode = 'foreign_key_violation';
  end if;

  select count(distinct x) into v_cited_count
  from unnest(coalesce(p_evidence_item_ids, '{}'::uuid[])) as x;

  if v_cited_count = 0 then
    raise exception 'skill assessment for % has no evidence citations', p_skill_slug
      using errcode = 'check_violation';
  end if;

  -- Every cited id must exist AND belong to this profile. Existence alone
  -- would let one candidate's assessment cite another candidate's work.
  select count(*) into v_valid_count
  from public.evidence_items e
  where e.id = any(p_evidence_item_ids)
    and e.profile_id = v_profile_id;

  if v_valid_count <> v_cited_count then
    raise exception
      'skill assessment for % cites % evidence item(s) that do not exist or belong to another profile',
      p_skill_slug, v_cited_count - v_valid_count
      using errcode = 'foreign_key_violation';
  end if;

  -- Append-only versioning (CLAUDE.md §15.3): never update an assessment in
  -- place; append the next version and point the prior one at it.
  select sa.id, sa.version into v_prior_id, v_prior_version
  from public.skill_assessments sa
  where sa.profile_id = v_profile_id
    and sa.skill_id = v_skill_id
  order by sa.version desc
  limit 1;

  insert into public.skill_assessments (
    profile_id, skill_id, analysis_id, level, confidence,
    reasoning, strengths, growth_areas, version
  )
  values (
    v_profile_id, v_skill_id, p_analysis_id, p_level, p_confidence,
    p_reasoning,
    coalesce(p_strengths, '{}'::text[]),
    coalesce(p_growth_areas, '{}'::text[]),
    coalesce(v_prior_version, 0) + 1
  )
  returning id into v_assessment_id;

  insert into public.assessment_evidence (assessment_id, evidence_item_id)
  select distinct v_assessment_id, x
  from unnest(p_evidence_item_ids) as x;

  if v_prior_id is not null then
    update public.skill_assessments
    set superseded_by = v_assessment_id
    where id = v_prior_id;
  end if;

  return v_assessment_id;
end;
$$;

comment on function public.persist_skill_assessment is 'Writes one skill assessment and its evidence links in a single transaction, rejecting unknown skills and hallucinated or cross-profile evidence citations. Service-role only — the assessment worker has no user session.';

-- Service-role only. Supabase grants EXECUTE to PUBLIC on new functions by
-- default, so revoke explicitly from each role rather than relying on PUBLIC.
revoke all on function public.persist_skill_assessment(
  uuid, text, public.assessment_level, public.confidence_level, text, text[], text[], uuid[]
) from public, anon, authenticated;

grant execute on function public.persist_skill_assessment(
  uuid, text, public.assessment_level, public.confidence_level, text, text[], text[], uuid[]
) to service_role;
