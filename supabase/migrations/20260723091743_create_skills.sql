create table public.skills (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  applies_to_backend boolean not null default true,
  applies_to_fullstack boolean not null default true,
  display_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.skills is 'Fixed V1 skill taxonomy, single source of truth (PRD FR-5.1 — no free-form skills). Classification: public.';

create trigger set_skills_updated_at
  before update on public.skills
  for each row
  execute function public.set_updated_at();

alter table public.skills enable row level security;

create policy "skills_select_all_authenticated"
  on public.skills for select
  to authenticated
  using (true);

-- No insert/update/delete policy for authenticated: the taxonomy is fixed
-- product reference data, managed only via migration/service_role.

-- Seed the fixed V1 taxonomy (PRD FR-5.1). This is stable product
-- reference data needed in every environment, not dev/test fixture data,
-- so it belongs in a migration rather than supabase/seed/.
insert into public.skills (slug, name, description, applies_to_backend, applies_to_fullstack, display_order) values
  ('api-design', 'API design', 'Designing clear, consistent, well-structured APIs.', true, true, 1),
  ('data-modeling', 'Data modeling', 'Structuring data and relationships soundly for the problem at hand.', true, true, 2),
  ('testing', 'Testing', 'Automated test coverage and testing discipline.', true, true, 3),
  ('debugging-problem-solving', 'Debugging & problem-solving', 'Diagnosing and resolving real issues methodically.', true, true, 4),
  ('code-quality-readability', 'Code quality & readability', 'Clear, maintainable, well-organized code.', true, true, 5),
  ('system-reasoning', 'System reasoning', 'Reasoning about trade-offs, architecture, and failure modes.', true, true, 6),
  ('deployment-operability', 'Deployment & operability', 'Shipping and running software reliably.', true, true, 7),
  ('version-control-practice', 'Version-control practice', 'Commit hygiene and incremental, well-documented development.', true, true, 8),
  ('communication-of-reasoning', 'Communication of technical reasoning', 'Explaining decisions and trade-offs clearly.', true, true, 9),
  ('frontend-engineering', 'Frontend engineering', 'Building usable, correct user interfaces.', false, true, 10),
  ('backend-service-design', 'Backend service design', 'Structuring backend services and their boundaries.', true, false, 11),
  ('database-design', 'Database design', 'Schema design, indexing, and query performance.', true, true, 12);
