-- Recruiter MVP: candidate tracking state (Candidate Profile spec — "Add:
-- Recruiter notes, Bookmark, Candidate status"). `saved_candidates`
-- already is exactly "one row per recruiter-candidate pair with a private
-- note" (CLAUDE.md §15.7 reuse), so this extends it in place rather than
-- creating a second recruiter-candidate table — `note` already covers
-- Notes; `bookmarked`/`status` are the only genuinely new columns.
create type public.candidate_status as enum ('new', 'reviewing', 'interviewing', 'archived');

alter table public.saved_candidates
  add column bookmarked boolean not null default false,
  add column status public.candidate_status not null default 'new';

comment on table public.saved_candidates is 'Per-recruiter-per-candidate tracking state: bookmark, status, and private note. A row is only created when a recruiter first acts (bookmark/status change/note) — its absence means "new, not bookmarked, no note" (CLAUDE.md §6.3, avoid a row per view). Classification: internal.';
comment on column public.saved_candidates.bookmarked is 'Shortlist membership — the Bookmark feature.';
comment on column public.saved_candidates.status is 'Recruiter-private pipeline stage for this candidate. Independent of the candidate''s own analysis status (analyses.status) — this is the recruiter''s tracking state, not the profile''s readiness.';

-- Tighten write access: a recruiter may only track a candidate who is
-- actually visible to them right now (CLAUDE.md §18.2 deny-by-default;
-- this sprint's explicit "Only authorized candidate profiles" requirement).
-- The prior policy only checked `recruiter_id = auth.uid()`, which let a
-- recruiter write a row for *any* profile_id, visible or not.
drop policy "saved_candidates_owner_all" on public.saved_candidates;

create policy "saved_candidates_select_own"
  on public.saved_candidates for select
  to authenticated
  using (recruiter_id = auth.uid());

create policy "saved_candidates_insert_own_visible"
  on public.saved_candidates for insert
  to authenticated
  with check (recruiter_id = auth.uid() and public.is_recruiter_visible(profile_id));

create policy "saved_candidates_update_own_visible"
  on public.saved_candidates for update
  to authenticated
  using (recruiter_id = auth.uid())
  with check (recruiter_id = auth.uid() and public.is_recruiter_visible(profile_id));

create policy "saved_candidates_delete_own"
  on public.saved_candidates for delete
  to authenticated
  using (recruiter_id = auth.uid());
