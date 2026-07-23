-- handle_new_user's EXECUTE grant was to PUBLIC directly (every role,
-- including anon/authenticated, implicitly inherits PUBLIC's grants) —
-- the prior migration's explicit `from anon, authenticated` revoke didn't
-- touch that. Revoke from PUBLIC; only postgres/service_role retain it,
-- which is irrelevant anyway since trigger firing doesn't check the
-- invoking role's function-level EXECUTE grant.
revoke execute on function public.handle_new_user() from public;
