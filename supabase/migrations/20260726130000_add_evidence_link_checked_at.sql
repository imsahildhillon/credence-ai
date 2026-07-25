alter table public.evidence_items
  add column link_checked_at timestamptz;

comment on column public.evidence_items.link_checked_at is
  'Set every time the link-liveness worker re-checks external_url, whether or not it was found dead. Null means never checked.';

-- The worker's scan query: "not yet confirmed dead, least-recently (or never) checked first".
create index evidence_items_link_check_due_idx
  on public.evidence_items (link_checked_at nulls first)
  where link_dead_at is null and external_url is not null;
