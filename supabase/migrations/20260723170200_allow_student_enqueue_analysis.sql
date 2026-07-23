-- Let a signed-in student enqueue their OWN analysis job from onboarding.
-- The AI pipeline still exclusively owns writing analysis *results* (it uses
-- the service-role client, which bypasses RLS). This policy is deliberately
-- narrow: a student may insert only a bare QUEUED row for themselves, never
-- one carrying assessment output — model/pipeline/prompt/summary/confidence
-- must all be null — so it cannot be used to fabricate a completed
-- assessment (CLAUDE.md §15.2, §18.2). Update/delete remain denied.
create policy "analyses_insert_own_queued"
  on public.analyses
  for insert
  to authenticated
  with check (
    profile_id = (select auth.uid())
    and status = 'queued'
    and model is null
    and pipeline_version is null
    and prompt_version is null
    and summary is null
    and confidence is null
  );
