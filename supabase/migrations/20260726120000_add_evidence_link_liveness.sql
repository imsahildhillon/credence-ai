-- Flagship groundwork: "never show dead links" (docs/10-flagship-experience.md
-- §11). Nullable by design — no verification job exists yet, so every
-- existing and new row defaults to "presumed reachable" (null). This
-- migration only makes the dead state *representable*; a future job is
-- what actually populates it by re-checking `external_url`.
alter table public.evidence_items
  add column link_dead_at timestamptz;

comment on column public.evidence_items.link_dead_at is 'Set when a re-check confirms external_url no longer resolves (repo deleted, force-pushed away, etc.) — null means presumed reachable, never verified false-negative. No populating job exists yet; this column is groundwork only.';
