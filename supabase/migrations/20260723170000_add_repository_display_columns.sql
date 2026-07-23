-- Onboarding needs to display and persist GitHub-sourced repository
-- metadata the original table didn't carry: star count, GitHub's own
-- last-updated timestamp, and the canonical repo URL (for later evidence
-- drill-down). These are imported-from-GitHub facts stored alongside the
-- repo row, not analysis outputs. Classification unchanged (internal).
alter table public.repositories
  add column stargazers_count integer not null default 0,
  add column github_updated_at timestamptz,
  add column html_url text;

comment on column public.repositories.stargazers_count is 'GitHub stargazers count at import time (display + a weak popularity signal). Refreshed on re-import.';
comment on column public.repositories.github_updated_at is 'GitHub''s own repository updated_at at import time — distinct from this row''s updated_at, which tracks our record.';
comment on column public.repositories.html_url is 'Canonical github.com URL for the repository (evidence drill-down).';
