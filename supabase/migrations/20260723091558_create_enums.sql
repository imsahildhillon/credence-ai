-- Enumerated domain types for the Credence AI schema (CLAUDE.md §15.1:
-- CHECK/enum constraints over runtime checks make illegal states
-- unrepresentable). Each is a small, genuinely fixed set per the MVP PRD;
-- assessment_level/confidence_level/contact_request_status/consent_type
-- values are taken verbatim from docs/03-mvp-prd.md FR-5, FR-8, FR-11.

create type public.user_role as enum ('student', 'recruiter', 'admin');

create type public.evidence_type as enum (
  'github_repository',
  'resume_claim',
  'certificate',
  'deployment_url'
);

create type public.assessment_level as enum ('strong', 'developing', 'not_yet_assessed');

create type public.confidence_level as enum ('high', 'moderate', 'preliminary');

create type public.contact_request_status as enum ('pending', 'accepted', 'declined', 'expired');

create type public.consent_type as enum ('analysis', 'visibility');

create type public.analysis_status as enum ('queued', 'processing', 'completed', 'failed', 'partial');
