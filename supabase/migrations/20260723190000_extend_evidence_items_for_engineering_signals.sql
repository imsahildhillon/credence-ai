-- Normalized engineering evidence.
--
-- The pipeline never persists raw GitHub objects; every signal (commit, PR,
-- review, issue, release, contributor, repository) is normalized into one
-- `evidence_items` row. `evidence_type` stays the coarse category
-- (github_repository vs resume_claim …); `source_type` carries which GitHub
-- signal produced this row.
create type public.evidence_source_type as enum (
  'repository',
  'commit',
  'pull_request',
  'review',
  'issue',
  'release',
  'contributor'
);

-- `metadata` was a generic placeholder never written to (table is empty and
-- unreferenced). Renamed to `payload` so the column means one thing: the
-- normalized signal body.
alter table public.evidence_items rename column metadata to payload;

alter table public.evidence_items
  -- Nullable: only rows produced by the GitHub pipeline carry these. Other
  -- evidence types (resume claims, certificates) leave them null.
  add column source_type public.evidence_source_type,
  -- text, not bigint: holds either a numeric GitHub id or a commit SHA.
  add column github_id text,
  -- When the underlying event happened on GitHub, distinct from created_at
  -- (when we ingested it).
  add column occurred_at timestamptz,
  add column author_login text,
  -- INGESTION confidence — fidelity of the observation, 1.0 = read directly
  -- from the source API. Deliberately distinct from `confidence_level`
  -- (high|moderate|preliminary), which is *assessment* confidence and is the
  -- only confidence ever shown to a user (CLAUDE.md §5 domain vocabulary).
  add column confidence numeric(3, 2) not null default 1.0,
  add constraint evidence_items_confidence_range check (confidence >= 0 and confidence <= 1);

comment on column public.evidence_items.payload is 'Normalized signal body — never a raw GitHub API object verbatim.';
comment on column public.evidence_items.source_type is 'Which GitHub signal produced this row. Null for non-GitHub evidence.';
comment on column public.evidence_items.github_id is 'Deterministic upstream identifier: numeric GitHub id, or commit SHA. Part of the idempotency key.';
comment on column public.evidence_items.occurred_at is 'When the event happened upstream (commit authored, PR merged…), not when we ingested it.';
comment on column public.evidence_items.confidence is 'Ingestion fidelity (1.0 = observed directly from the GitHub API). NOT assessment confidence — that is the confidence_level enum on skill_assessments.';
comment on column public.evidence_items.external_url is 'Canonical URL of the source artifact on GitHub (the pipeline''s raw_url).';

-- Idempotency key: re-running an analysis re-observes the same signals and
-- must upsert, never duplicate. NULLs never conflict in Postgres, so
-- non-GitHub evidence rows are unaffected by this constraint.
alter table public.evidence_items
  add constraint evidence_items_source_identity_unique
  unique (repository_id, source_type, github_id);

create index evidence_items_profile_source_idx on public.evidence_items (profile_id, source_type);
create index evidence_items_repository_source_idx on public.evidence_items (repository_id, source_type);
create index evidence_items_occurred_at_idx on public.evidence_items (occurred_at desc nulls last);
