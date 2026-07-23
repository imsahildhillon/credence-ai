-- Security hardening (ADR-003): make role assignment server-authoritative.
--
-- The prior definition read the new user's role from
-- `new.raw_user_meta_data->>'role'`, falling back to 'student'. That field
-- is client-influenceable — Supabase Auth copies the `data` option of a
-- signUp/signInWithOtp call straight into raw_user_meta_data — so a crafted
-- request could set `role: 'admin'` and self-provision an admin profile on
-- first sign-in. The existing prevent_role_self_escalation trigger did NOT
-- close this, because it fires on UPDATE only, while this injection happens
-- at the INSERT. This was an unauthenticated privilege-escalation vector.
--
-- New behavior: role is a hard-coded 'student' literal here and is never
-- derived from any client-controlled metadata. Recruiters and admins are
-- provisioned exclusively by an operator through the service-role client
-- (which bypasses this trigger), never through public signup. full_name and
-- avatar_url are still sourced from provider metadata — they are
-- non-privileged display fields populated by the GitHub OAuth provider, not
-- an authorization boundary.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, avatar_url)
  values (
    new.id,
    'student',
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'user_name'
    ),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;
