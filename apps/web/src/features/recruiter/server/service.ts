import 'server-only';

import { getProfileForRecruiter, type ProfileResult } from '@/features/profile';
import { normalizeSupabaseError } from '@/lib/supabase/errors';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';

import type { CandidateListItem, CandidateListSort, CandidateTracking } from '../types';
import { DEFAULT_CANDIDATE_TRACKING } from '../types';

import { getRecruiterSession } from './auth';
import {
  getCandidateName,
  getSavedCandidate,
  listAnalysesForProfiles,
  listSavedCandidatesForRecruiter,
  listSkillsForProfiles,
  listVisibleCandidateProfiles,
  logCandidateViewEvent,
  upsertSavedCandidate,
  type CandidateAnalysisSummaryRow,
  type CandidateSkillRow,
  type SavedCandidateRow,
} from './queries';

/**
 * Orchestrates the two Recruiter MVP read surfaces: the candidate list
 * (§ Candidate List) and one candidate's page (§ Candidate Profile). Both
 * require an invited recruiter (`getRecruiterSession`, CLAUDE.md §18.2) and
 * neither computes an assessment, a skill, or evidence — that is entirely
 * `features/profile`'s pipeline, called as-is via `getProfileForRecruiter`.
 */

const LEVEL_RANK: Readonly<Record<Database['public']['Enums']['assessment_level'], number>> = {
  strong: 2,
  developing: 1,
  not_yet_assessed: 0,
};

const CONFIDENCE_RANK: Readonly<Record<Database['public']['Enums']['confidence_level'], number>> = {
  high: 2,
  moderate: 1,
  preliminary: 0,
};

const LEVEL_LABEL: Readonly<Record<Database['public']['Enums']['assessment_level'], string>> = {
  strong: 'Strong',
  developing: 'Developing',
  not_yet_assessed: 'Not yet assessed',
};

function pickTopSkills(skills: readonly CandidateSkillRow[]): readonly string[] {
  return [...skills]
    .sort(
      (a, b) =>
        LEVEL_RANK[b.level] - LEVEL_RANK[a.level] || CONFIDENCE_RANK[b.confidence] - CONFIDENCE_RANK[a.confidence],
    )
    .slice(0, 3)
    .map((s) => s.skillName);
}

function pickLatestAnalysis(
  analyses: readonly CandidateAnalysisSummaryRow[],
): CandidateAnalysisSummaryRow | undefined {
  // Already ordered created_at desc by the query — the first match per
  // profile is the latest, so a plain find (not a second sort) is enough.
  return analyses[0];
}

export async function getCandidateList(sort: CandidateListSort): Promise<readonly CandidateListItem[]> {
  const recruiter = await getRecruiterSession();
  if (!recruiter) {
    return [];
  }

  const profiles = await listVisibleCandidateProfiles();
  const profileIds = profiles.map((p) => p.id);

  const [analyses, skills, tracking] = await Promise.all([
    listAnalysesForProfiles(profileIds),
    listSkillsForProfiles(profileIds),
    listSavedCandidatesForRecruiter(recruiter.userId),
  ]);

  const analysesByProfile = new Map<string, CandidateAnalysisSummaryRow[]>();
  for (const row of analyses) {
    const bucket = analysesByProfile.get(row.profile_id) ?? [];
    bucket.push(row);
    analysesByProfile.set(row.profile_id, bucket);
  }
  const skillsByProfile = new Map<string, CandidateSkillRow[]>();
  for (const row of skills) {
    const bucket = skillsByProfile.get(row.profile_id) ?? [];
    bucket.push(row);
    skillsByProfile.set(row.profile_id, bucket);
  }
  const trackingByProfile = new Map<string, SavedCandidateRow>(tracking.map((t) => [t.profile_id, t]));

  const items: CandidateListItem[] = profiles.map((profile) => {
    const latestAnalysis = pickLatestAnalysis(analysesByProfile.get(profile.id) ?? []);
    const topSkillRows = skillsByProfile.get(profile.id) ?? [];
    const topSkills = pickTopSkills(topSkillRows);
    const track = trackingByProfile.get(profile.id);

    return {
      profileId: profile.id,
      name: profile.full_name ?? 'Unnamed candidate',
      headline: topSkillRows.length > 0 ? `${LEVEL_LABEL[topSkillRows[0]!.level]} — ${topSkillRows[0]!.skillName}` : null,
      topSkills,
      lastAnalyzedAt: latestAnalysis?.completed_at ?? null,
      profileStatus: latestAnalysis?.status ?? 'no_analysis',
      bookmarked: track?.bookmarked ?? false,
      status: track?.status ?? 'new',
    };
  });

  return sort === 'alphabetical'
    ? items.toSorted((a, b) => a.name.localeCompare(b.name))
    : items.toSorted((a, b) => (b.lastAnalyzedAt ?? '').localeCompare(a.lastAnalyzedAt ?? ''));
}

export interface CandidateProfileForRecruiter {
  readonly candidateName: string | null;
  readonly tracking: CandidateTracking;
  readonly profile: ProfileResult;
}

/** Returns null only when the caller isn't an invited recruiter — an unauthorized/non-existent profileId resolves through normally as `profile.status === 'no_analysis'`, since RLS returns no rows either way. */
export async function getCandidateProfile(profileId: string): Promise<CandidateProfileForRecruiter | null> {
  const recruiter = await getRecruiterSession();
  if (!recruiter) {
    return null;
  }

  const [profile, candidateName, saved] = await Promise.all([
    getProfileForRecruiter(profileId),
    getCandidateName(profileId),
    getSavedCandidate(recruiter.userId, profileId),
  ]);

  await maybeLogView(profileId, recruiter.userId);

  return {
    candidateName,
    tracking: saved
      ? { bookmarked: saved.bookmarked, status: saved.status, note: saved.note, updatedAt: saved.updated_at }
      : DEFAULT_CANDIDATE_TRACKING,
    profile,
  };
}

/** Only logs a view when `is_recruiter_visible` independently confirms it — never inferred from the profile fetch succeeding, so a crafted/invalid id never produces a phantom audit row. */
async function maybeLogView(profileId: string, recruiterId: string): Promise<void> {
  const supabase = await createClient();
  const { data: visible, error } = await supabase.rpc('is_recruiter_visible', { p_profile_id: profileId });
  if (error) {
    throw normalizeSupabaseError(error);
  }
  if (visible) {
    await logCandidateViewEvent(profileId, recruiterId);
  }
}

export async function setBookmark(profileId: string, bookmarked: boolean): Promise<void> {
  const recruiter = await getRecruiterSession();
  if (!recruiter) {
    return;
  }
  await upsertSavedCandidate(recruiter.userId, profileId, { bookmarked });
}

export async function setCandidateStatus(
  profileId: string,
  status: CandidateTracking['status'],
): Promise<void> {
  const recruiter = await getRecruiterSession();
  if (!recruiter) {
    return;
  }
  await upsertSavedCandidate(recruiter.userId, profileId, { status });
}

export async function setCandidateNote(profileId: string, note: string): Promise<void> {
  const recruiter = await getRecruiterSession();
  if (!recruiter) {
    return;
  }
  await upsertSavedCandidate(recruiter.userId, profileId, { note });
}

export async function listShortlist(): Promise<readonly CandidateListItem[]> {
  const items = await getCandidateList('recent');
  return items.filter((item) => item.bookmarked);
}
