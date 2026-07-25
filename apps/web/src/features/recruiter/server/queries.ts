import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { normalizeSupabaseError } from '@/lib/supabase/errors';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';

import type { CandidateStatus } from '../types';

/**
 * Read/write access for the Recruiter MVP. Every query here runs through
 * the recruiter's own RLS-scoped client — the candidate-visibility policies
 * already on `profiles`/`analyses`/`skill_assessments` (CLAUDE.md §18.2,
 * `is_recruiter_visible`) are what make these queries return only
 * currently-consented candidates, not anything added here. The one
 * exception is `logCandidateViewEvent`, which uses the service-role client
 * because `view_events` intentionally has no `insert` policy for
 * `authenticated` (a client must never be able to forge its own "viewed"
 * record) — every call site logs only after independently confirming the
 * candidate is visible to this recruiter right now.
 */

export interface VisibleCandidateRow {
  readonly id: string;
  readonly full_name: string | null;
}

/** Every student profile currently visible to this recruiter session — RLS does the filtering, not this query. */
export async function listVisibleCandidateProfiles(): Promise<readonly VisibleCandidateRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('profiles').select('id, full_name').eq('role', 'student');
  if (error) {
    throw normalizeSupabaseError(error);
  }
  return data ?? [];
}

export async function getCandidateName(profileId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', profileId)
    .maybeSingle();
  if (error) {
    throw normalizeSupabaseError(error);
  }
  return data?.full_name ?? null;
}

export interface CandidateAnalysisSummaryRow {
  readonly profile_id: string;
  readonly status: Database['public']['Enums']['analysis_status'];
  readonly completed_at: string | null;
  readonly created_at: string;
}

/** Every analysis row for this set of candidates, most-recent-first — reduced client-side to "latest per candidate" (one batched query, no N+1). */
export async function listAnalysesForProfiles(
  profileIds: readonly string[],
): Promise<readonly CandidateAnalysisSummaryRow[]> {
  if (profileIds.length === 0) {
    return [];
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('analyses')
    .select('profile_id, status, completed_at, created_at')
    .in('profile_id', [...new Set(profileIds)])
    .order('created_at', { ascending: false });
  if (error) {
    throw normalizeSupabaseError(error);
  }
  return data ?? [];
}

export interface CandidateSkillRow {
  readonly profile_id: string;
  readonly level: Database['public']['Enums']['assessment_level'];
  readonly confidence: Database['public']['Enums']['confidence_level'];
  readonly skillName: string;
}

/** Every current skill assessment across this set of candidates, in one query. */
export async function listSkillsForProfiles(
  profileIds: readonly string[],
): Promise<readonly CandidateSkillRow[]> {
  if (profileIds.length === 0) {
    return [];
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('skill_assessments')
    .select('profile_id, level, confidence, skill:skills(name)')
    .in('profile_id', [...new Set(profileIds)])
    .is('superseded_by', null);
  if (error) {
    throw normalizeSupabaseError(error);
  }
  return (data ?? []).flatMap((row) => {
    const skill = Array.isArray(row.skill) ? row.skill[0] : row.skill;
    return skill ? [{ profile_id: row.profile_id, level: row.level, confidence: row.confidence, skillName: skill.name }] : [];
  });
}

export interface SavedCandidateRow {
  readonly profile_id: string;
  readonly bookmarked: boolean;
  readonly status: CandidateStatus;
  readonly note: string | null;
  readonly updated_at: string;
}

/** Every tracking row this recruiter has ever written — small by construction (one recruiter's own candidates), fetched in one query for the whole list page. */
export async function listSavedCandidatesForRecruiter(
  recruiterId: string,
): Promise<readonly SavedCandidateRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('saved_candidates')
    .select('profile_id, bookmarked, status, note, updated_at')
    .eq('recruiter_id', recruiterId);
  if (error) {
    throw normalizeSupabaseError(error);
  }
  return data ?? [];
}

export async function getSavedCandidate(
  recruiterId: string,
  profileId: string,
): Promise<SavedCandidateRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('saved_candidates')
    .select('profile_id, bookmarked, status, note, updated_at')
    .eq('recruiter_id', recruiterId)
    .eq('profile_id', profileId)
    .maybeSingle();
  if (error) {
    throw normalizeSupabaseError(error);
  }
  return data;
}

/**
 * Creates or updates this recruiter's tracking row for one candidate.
 * `is_recruiter_visible(profile_id)` is enforced by the insert/update RLS
 * policies themselves (`saved_candidates_insert_own_visible` /
 * `saved_candidates_update_own_visible`) — a write for a candidate who
 * isn't currently visible fails at the database, not here.
 */
export async function upsertSavedCandidate(
  recruiterId: string,
  profileId: string,
  patch: Partial<{ bookmarked: boolean; status: CandidateStatus; note: string }>,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('saved_candidates')
    .upsert({ recruiter_id: recruiterId, profile_id: profileId, ...patch }, { onConflict: 'recruiter_id,profile_id' });
  if (error) {
    throw normalizeSupabaseError(error);
  }
}

/**
 * Records a "recruiter viewed this candidate" audit event (CLAUDE.md
 * §18.7 — "who viewed my profile" is also a candidate-facing feature).
 * Uses the service-role client because `view_events` has no `authenticated`
 * insert policy by design; callers must have already confirmed visibility
 * via `is_recruiter_visible` (or an equivalent successful RLS-gated read)
 * before calling this.
 */
export async function logCandidateViewEvent(profileId: string, recruiterId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('view_events').insert({
    profile_id: profileId,
    viewer_recruiter_id: recruiterId,
    source: 'recruiter_summary',
  });
  if (error) {
    throw normalizeSupabaseError(error);
  }
}
