import 'server-only';

import { normalizeSupabaseError } from '@/lib/supabase/errors';
import { createClient } from '@/lib/supabase/server';
import type { Database, Json } from '@/lib/supabase/types';

/**
 * Read-side data access for the Candidate Engineering Profile.
 *
 * Every query runs through the user-scoped server client, so Row Level
 * Security is the ownership boundary — a signed-in student can only ever
 * read their own analyses, evidence, and assessments (CLAUDE.md §18.2).
 * These functions contain no business rules or aggregation; that lives in
 * `service.ts` (CLAUDE.md §14.1).
 *
 * Every function here is batched — one query per table, never one query
 * per row — so assembling the whole profile is a small, fixed number of
 * round trips regardless of how much evidence a candidate has accumulated.
 */

export interface AnalysisRow {
  readonly id: string;
  readonly profile_id: string;
  readonly status: Database['public']['Enums']['analysis_status'];
  readonly summary: string | null;
  readonly confidence: Database['public']['Enums']['confidence_level'] | null;
  readonly model: string | null;
  readonly pipeline_version: string | null;
  readonly prompt_version: string | null;
  readonly error_message: string | null;
  readonly completed_at: string | null;
  readonly created_at: string;
}

export interface SkillAssessmentRow {
  readonly id: string;
  readonly skill_id: string;
  readonly level: Database['public']['Enums']['assessment_level'];
  readonly confidence: Database['public']['Enums']['confidence_level'];
  readonly reasoning: string;
  readonly strengths: readonly string[];
  readonly growth_areas: readonly string[];
}

export interface SkillRow {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string | null;
  readonly display_order: number;
}

export interface AssessmentEvidenceLinkRow {
  readonly assessment_id: string;
  readonly evidence_item_id: string;
}

export interface EvidenceItemRow {
  readonly id: string;
  readonly source_type: Database['public']['Enums']['evidence_source_type'] | null;
  readonly title: string;
  readonly occurred_at: string | null;
  readonly author_login: string | null;
  readonly external_url: string | null;
  readonly repository_id: string | null;
  readonly payload: Json;
  /** Set only once a re-check confirms `external_url` no longer resolves — null means presumed reachable (no verification job exists yet). */
  readonly link_dead_at: string | null;
}

export interface RepositoryRow {
  readonly id: string;
  readonly full_name: string;
  readonly description: string | null;
  readonly primary_language: string | null;
  readonly html_url: string | null;
}

/** The most recent analysis for the signed-in user, whatever its status — this decides which empty/ready state the page shows. */
export async function getLatestAnalysis(): Promise<AnalysisRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('analyses')
    .select(
      'id, profile_id, status, summary, confidence, model, pipeline_version, prompt_version, error_message, completed_at, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    throw normalizeSupabaseError(error);
  }
  return data;
}

/**
 * Same shape as `getLatestAnalysis`, explicitly scoped to `profileId`
 * instead of the caller's own session — the read a recruiter needs when
 * viewing a specific candidate. RLS (`analyses_select_recruiter_visible`)
 * is what actually enforces "only a currently-visible candidate", exactly
 * as `analyses_select_own` enforces the current-user case above; this
 * function adds no authorization logic of its own.
 */
export async function getLatestAnalysisForProfile(profileId: string): Promise<AnalysisRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('analyses')
    .select(
      'id, profile_id, status, summary, confidence, model, pipeline_version, prompt_version, error_message, completed_at, created_at',
    )
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    throw normalizeSupabaseError(error);
  }
  return data;
}

export async function getGithubUsername(profileId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('github_accounts')
    .select('github_username')
    .eq('profile_id', profileId)
    .maybeSingle();
  if (error) {
    throw normalizeSupabaseError(error);
  }
  return data?.github_username ?? null;
}

/**
 * The current version of every assessed skill (`superseded_by is null` is
 * exactly "the latest version" — CLAUDE.md §15.3 append-only versioning),
 * joined to the skill taxonomy for display names.
 */
export async function listCurrentSkillAssessments(
  profileId: string,
): Promise<readonly (SkillAssessmentRow & { readonly skill: SkillRow })[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('skill_assessments')
    .select(
      'id, skill_id, level, confidence, reasoning, strengths, growth_areas, skill:skills(id, slug, name, description, display_order)',
    )
    .eq('profile_id', profileId)
    .is('superseded_by', null);
  if (error) {
    throw normalizeSupabaseError(error);
  }
  // The embedded resource is typed as an array by the generated types
  // (Supabase can't statically know the FK is one-to-one); it always
  // resolves to exactly one row here because `skill_id` is not null.
  return (data ?? []).flatMap((row) => {
    const skill = Array.isArray(row.skill) ? row.skill[0] : row.skill;
    return skill ? [{ ...row, skill }] : [];
  });
}

/** One batched lookup for every evidence link across a set of assessment ids — never one query per assessment. */
export async function listAssessmentEvidenceLinks(
  assessmentIds: readonly string[],
): Promise<readonly AssessmentEvidenceLinkRow[]> {
  if (assessmentIds.length === 0) {
    return [];
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('assessment_evidence')
    .select('assessment_id, evidence_item_id')
    .in('assessment_id', [...assessmentIds]);
  if (error) {
    throw normalizeSupabaseError(error);
  }
  return data ?? [];
}

/** Every evidence item for the profile, in one query — the shared source for every aggregated section plus the Evidence Explorer. */
export async function listAllEvidence(profileId: string): Promise<readonly EvidenceItemRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('evidence_items')
    .select(
      'id, source_type, title, occurred_at, author_login, external_url, repository_id, payload, link_dead_at',
    )
    .eq('profile_id', profileId)
    .order('occurred_at', { ascending: false, nullsFirst: false });
  if (error) {
    throw normalizeSupabaseError(error);
  }
  return data ?? [];
}

/** Repository metadata for a set of ids, in one query. */
export async function listRepositoriesByIds(
  repositoryIds: readonly string[],
): Promise<readonly RepositoryRow[]> {
  if (repositoryIds.length === 0) {
    return [];
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('repositories')
    .select('id, full_name, description, primary_language, html_url')
    .in('id', [...new Set(repositoryIds)]);
  if (error) {
    throw normalizeSupabaseError(error);
  }
  return data ?? [];
}
