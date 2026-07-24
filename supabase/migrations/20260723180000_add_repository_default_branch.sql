-- The analysis snapshot must record which branch a repository was analyzed
-- from (reproducibility). GitHub returns `default_branch` on the repo list
-- response, so this costs no extra API call at import time.
alter table public.repositories add column default_branch text;

comment on column public.repositories.default_branch is 'GitHub default branch at import time. Copied into analysis_repositories snapshots so a run is reproducible against a specific branch.';
