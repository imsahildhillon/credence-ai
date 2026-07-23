-- A queued analysis job (created at onboarding "Start Analysis", before any
-- AI runs) legitimately has no model or pipeline version yet — those are
-- chosen when the job actually executes. The original NOT NULL on model /
-- pipeline_version made a queued job unrepresentable without dishonest
-- placeholder values (CLAUDE.md §15.2 forbids fake provenance). Relax them
-- to nullable, and enforce — via CHECK, mirroring the existing
-- summary/confidence completion guard — that a *completed* analysis must
-- carry both. Illegal states stay unrepresentable (CLAUDE.md §7.4/§15.1);
-- the guard just moves from "always" to "once completed".
alter table public.analyses
  alter column model drop not null,
  alter column pipeline_version drop not null;

alter table public.analyses
  add constraint analyses_completed_requires_model_and_pipeline check (
    status <> 'completed' or (model is not null and pipeline_version is not null)
  );
