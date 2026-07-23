-- Addresses supabase advisors run after the initial schema pass:
--   * function_search_path_mutable (set_updated_at, prevent_role_self_escalation)
--   * anon_security_definer_function_executable (revoke PUBLIC/anon execute
--     on read-only helper functions; anon has no policies anywhere in this
--     schema and never needs them)
--   * auth_rls_initplan (wrap bare auth.uid()/auth.role() in policies as
--     `(select auth.uid())` so Postgres evaluates it once per statement,
--     not once per row)
--   * unindexed_foreign_keys (cover the remaining FKs)
--
-- "multiple_permissive_policies" and "unused_index" (empty tables) are
-- left as-is: an accepted, deliberate trade-off of readability/auditability
-- (separate named policy per audience) over a marginal query-planning
-- optimization (CLAUDE.md §21.2 — measure before optimizing).

-- 1) Pin search_path on the two plain trigger functions.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role is distinct from old.role and auth.role() <> 'service_role' then
    raise exception 'role cannot be changed by the user; contact an operator';
  end if;
  return new;
end;
$$;

-- 2) Lock read-only SECURITY DEFINER helpers down to `authenticated` only.
-- They remain callable by `authenticated` both directly (rpc) and via RLS
-- policy evaluation (callers need EXECUTE for either) — `anon` needs
-- neither, since no policy in this schema is ever defined `to anon`.
revoke execute on function public.current_user_role() from public;
revoke execute on function public.current_consent(uuid, public.consent_type) from public;
revoke execute on function public.is_recruiter_visible(uuid) from public;
revoke execute on function public.current_recruiter_organization_id() from public;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.current_consent(uuid, public.consent_type) to authenticated;
grant execute on function public.is_recruiter_visible(uuid) to authenticated;
grant execute on function public.current_recruiter_organization_id() to authenticated;

-- 3) Re-create policies that referenced auth.uid()/auth.role() directly,
-- wrapping the call as `(select auth.uid())` per the Supabase RLS
-- performance guide.

drop policy "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated
  using (id = (select auth.uid()));

drop policy "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy "github_accounts_owner_all" on public.github_accounts;
create policy "github_accounts_owner_all" on public.github_accounts for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

drop policy "consent_records_select_own" on public.consent_records;
create policy "consent_records_select_own" on public.consent_records for select to authenticated
  using (profile_id = (select auth.uid()));

drop policy "consent_records_insert_own" on public.consent_records;
create policy "consent_records_insert_own" on public.consent_records for insert to authenticated
  with check (profile_id = (select auth.uid()));

drop policy "repositories_owner_all" on public.repositories;
create policy "repositories_owner_all" on public.repositories for all to authenticated
  using (
    exists (
      select 1 from public.github_accounts ga
      where ga.id = repositories.github_account_id
        and ga.profile_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.github_accounts ga
      where ga.id = repositories.github_account_id
        and ga.profile_id = (select auth.uid())
    )
  );

drop policy "evidence_items_owner_all" on public.evidence_items;
create policy "evidence_items_owner_all" on public.evidence_items for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

drop policy "assessment_evidence_select_via_assessment" on public.assessment_evidence;
create policy "assessment_evidence_select_via_assessment" on public.assessment_evidence for select to authenticated
  using (
    exists (
      select 1 from public.skill_assessments sa
      where sa.id = assessment_evidence.assessment_id
        and (
          sa.profile_id = (select auth.uid())
          or (public.current_user_role() = 'recruiter' and public.is_recruiter_visible(sa.profile_id))
        )
    )
  );

drop policy "analyses_select_own" on public.analyses;
create policy "analyses_select_own" on public.analyses for select to authenticated
  using (profile_id = (select auth.uid()));

drop policy "skill_assessments_select_own" on public.skill_assessments;
create policy "skill_assessments_select_own" on public.skill_assessments for select to authenticated
  using (profile_id = (select auth.uid()));

drop policy "recruiters_select_own_or_org" on public.recruiters;
create policy "recruiters_select_own_or_org" on public.recruiters for select to authenticated
  using (
    id = (select auth.uid())
    or organization_id = public.current_recruiter_organization_id()
  );

drop policy "recruiters_insert_own" on public.recruiters;
create policy "recruiters_insert_own" on public.recruiters for insert to authenticated
  with check (id = (select auth.uid()));

drop policy "recruiters_update_own" on public.recruiters;
create policy "recruiters_update_own" on public.recruiters for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy "saved_candidates_owner_all" on public.saved_candidates;
create policy "saved_candidates_owner_all" on public.saved_candidates for all to authenticated
  using (recruiter_id = (select auth.uid()))
  with check (recruiter_id = (select auth.uid()));

drop policy "contact_requests_select_participant" on public.contact_requests;
create policy "contact_requests_select_participant" on public.contact_requests for select to authenticated
  using (recruiter_id = (select auth.uid()) or profile_id = (select auth.uid()));

drop policy "contact_requests_insert_recruiter" on public.contact_requests;
create policy "contact_requests_insert_recruiter" on public.contact_requests for insert to authenticated
  with check (
    recruiter_id = (select auth.uid())
    and public.current_user_role() = 'recruiter'
    and public.is_recruiter_visible(profile_id)
  );

drop policy "contact_requests_update_candidate" on public.contact_requests;
create policy "contact_requests_update_candidate" on public.contact_requests for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

drop policy "view_events_select_own" on public.view_events;
create policy "view_events_select_own" on public.view_events for select to authenticated
  using (profile_id = (select auth.uid()));

-- Storage policies (not covered by this advisor pass, fixed for consistency).
drop policy "resumes_owner_select" on storage.objects;
create policy "resumes_owner_select" on storage.objects for select to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy "resumes_owner_insert" on storage.objects;
create policy "resumes_owner_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy "resumes_owner_update" on storage.objects;
create policy "resumes_owner_update" on storage.objects for update to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy "resumes_owner_delete" on storage.objects;
create policy "resumes_owner_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- 4) Cover the remaining unindexed foreign keys.
create index analyses_evidence_item_idx on public.analyses (evidence_item_id);
create index evidence_items_repository_idx on public.evidence_items (repository_id);
create index saved_candidates_profile_idx on public.saved_candidates (profile_id);
create index skill_assessments_analysis_idx on public.skill_assessments (analysis_id);
create index skill_assessments_skill_idx on public.skill_assessments (skill_id);
create index skill_assessments_superseded_by_idx on public.skill_assessments (superseded_by);
create index view_events_viewer_recruiter_idx on public.view_events (viewer_recruiter_id);
