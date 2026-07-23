-- Supabase grants EXECUTE on new public-schema functions to anon,
-- authenticated, and service_role by default (a project-level default
-- privilege), independent of PUBLIC — the prior migration's `revoke ...
-- from public` didn't reach that grant. Revoke explicitly from `anon`
-- (never a legitimate caller of any of these) and additionally lock
-- handle_new_user down entirely: it's a trigger function invoked by
-- Postgres's trigger machinery, not by caller privilege, so no role needs
-- direct EXECUTE on it at all.

revoke execute on function public.current_user_role() from anon;
revoke execute on function public.current_consent(uuid, public.consent_type) from anon;
revoke execute on function public.is_recruiter_visible(uuid) from anon;
revoke execute on function public.current_recruiter_organization_id() from anon;

revoke execute on function public.handle_new_user() from anon, authenticated;
