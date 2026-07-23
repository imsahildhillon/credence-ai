create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_table text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.audit_logs is 'System-wide append-only audit trail (CLAUDE.md §18.7, §20.5) — operator-facing, distinct from view_events (student-facing "who viewed me"). `action` is deliberately free text, not an enum: the domain-event vocabulary grows as features ship (CLAUDE.md §14.6), and a fixed enum would need a migration per new event type for no correctness benefit. Classification: regulated.';

create index audit_logs_actor_idx on public.audit_logs (actor_profile_id, created_at desc);
create index audit_logs_target_idx on public.audit_logs (target_table, target_id);

alter table public.audit_logs enable row level security;

create policy "audit_logs_select_admin"
  on public.audit_logs for select
  to authenticated
  using (public.current_user_role() = 'admin');

-- No insert policy for authenticated: written exclusively by the
-- service-role client as part of the actions it performs.
revoke update, delete on public.audit_logs from authenticated;
