-- The assessment engine produces four narrative parts per skill: the
-- plain-language reasoning (already modelled as `reasoning`), plus the
-- observed strengths and the growth areas. Those last two had nowhere to
-- live, so they would have been flattened into the reasoning prose and lost
-- their structure — the UI could not render growth areas in the `growth`
-- token (Brand Guidelines §7) if it cannot tell them apart from strengths.
--
-- Additive only: both default to an empty array, so every existing row and
-- every existing read path is unaffected.
alter table public.skill_assessments
  add column strengths text[] not null default '{}',
  add column growth_areas text[] not null default '{}';

comment on column public.skill_assessments.strengths is 'Observed strengths for this skill, each grounded in the linked assessment_evidence. Observations about evidence, never verdicts about the person (CLAUDE.md §17.10).';
comment on column public.skill_assessments.growth_areas is 'Growth opportunities for this skill. Rendered with the `growth` semantic token — never `alert`; a gap is never an error (Brand Guidelines §7).';
