import 'server-only';

import { normalizeSupabaseError } from '@/lib/supabase/errors';
import { createClient } from '@/lib/supabase/server';

import { toAnalysisSnapshotItem, toRepositorySummary } from './repository-mapper';
import type {
  AnalysisProgress,
  AnalysisRow,
  AnalysisSnapshotItem,
  GithubAccountRow,
  RepositoryRef,
  RepositorySummary,
} from './types';

const EXTRACTED_EVIDENCE_SOURCE_TYPES = [
  'pull_request',
  'review',
  'issue',
  'release',
  'contributor',
] as const;

/**
 * Read-side data access for the onboarding feature. Every query runs
 * through the user-scoped server client, so Row Level Security is the
 * ownership boundary — a student can only ever read their own GitHub
 * account, repositories, and analyses (CLAUDE.md §18.2). These functions
 * contain no business rules (CLAUDE.md §14.1).
 */

export async function getGithubAccountForCurrentUser(): Promise<GithubAccountRow | null> {
  const supabase = await createClient();
  // RLS returns only the caller's own row; `.maybeSingle()` tolerates none.
  const { data, error } = await supabase.from('github_accounts').select('*').maybeSingle();
  if (error) {
    throw normalizeSupabaseError(error);
  }
  return data;
}

export async function listRepositorySummaries(
  githubAccountId: string,
): Promise<RepositorySummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('repositories')
    .select('*')
    .eq('github_account_id', githubAccountId)
    .order('github_updated_at', { ascending: false, nullsFirst: false });
  if (error) {
    throw normalizeSupabaseError(error);
  }
  return (data ?? []).map(toRepositorySummary);
}

/**
 * Selected repositories reduced to what snapshot creation needs (id + the
 * branch to resolve a HEAD commit against).
 */
export async function listSelectedRepositoryRefs(
  githubAccountId: string,
): Promise<RepositoryRef[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('repositories')
    .select('id, full_name, default_branch')
    .eq('github_account_id', githubAccountId)
    .eq('included', true);
  if (error) {
    throw normalizeSupabaseError(error);
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    defaultBranch: row.default_branch,
  }));
}

/**
 * The immutable snapshot an analysis was queued against — what the worker
 * will analyze. Read this, never `repositories.included`, when describing or
 * executing a job.
 */
export async function listAnalysisSnapshot(analysisId: string): Promise<AnalysisSnapshotItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('analysis_repositories')
    .select('*')
    .eq('analysis_id', analysisId)
    .order('full_name', { ascending: true });
  if (error) {
    throw normalizeSupabaseError(error);
  }
  return (data ?? []).map(toAnalysisSnapshotItem);
}

/**
 * The real, checkable facts behind a running analysis — every field a
 * direct row-existence check against what the worker has actually
 * persisted so far, scoped to exactly the repositories this run's
 * (immutable) snapshot covers. Nothing here is estimated or interpolated
 * (CLAUDE.md §21.5: never fake progress, never an indeterminate spinner
 * where stages are knowable).
 */
export async function getAnalysisProgress(analysis: AnalysisRow): Promise<AnalysisProgress> {
  const supabase = await createClient();

  const { data: snapshotRows, error: snapshotError } = await supabase
    .from('analysis_repositories')
    .select('repository_id')
    .eq('analysis_id', analysis.id);
  if (snapshotError) {
    throw normalizeSupabaseError(snapshotError);
  }
  const repositoryIds = (snapshotRows ?? []).map((row) => row.repository_id);

  if (repositoryIds.length === 0) {
    return {
      status: analysis.status,
      startedAt: analysis.started_at,
      repositoryCount: 0,
      hasRepositoryEvidence: false,
      hasCommitEvidence: false,
      hasExtractedEvidence: false,
      hasSkillAssessments: false,
    };
  }

  const [repositoryEvidence, commitEvidence, extractedEvidence, skillAssessments] =
    await Promise.all([
      supabase
        .from('evidence_items')
        .select('id', { count: 'exact', head: true })
        .in('repository_id', repositoryIds)
        .eq('source_type', 'repository'),
      supabase
        .from('evidence_items')
        .select('id', { count: 'exact', head: true })
        .in('repository_id', repositoryIds)
        .eq('source_type', 'commit'),
      supabase
        .from('evidence_items')
        .select('id', { count: 'exact', head: true })
        .in('repository_id', repositoryIds)
        .in('source_type', [...EXTRACTED_EVIDENCE_SOURCE_TYPES]),
      supabase
        .from('skill_assessments')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', analysis.profile_id)
        .eq('analysis_id', analysis.id),
    ]);

  for (const result of [repositoryEvidence, commitEvidence, extractedEvidence, skillAssessments]) {
    if (result.error) {
      throw normalizeSupabaseError(result.error);
    }
  }

  return {
    status: analysis.status,
    startedAt: analysis.started_at,
    repositoryCount: repositoryIds.length,
    hasRepositoryEvidence: (repositoryEvidence.count ?? 0) > 0,
    hasCommitEvidence: (commitEvidence.count ?? 0) > 0,
    hasExtractedEvidence: (extractedEvidence.count ?? 0) > 0,
    hasSkillAssessments: (skillAssessments.count ?? 0) > 0,
  };
}

export async function getLatestAnalysis(profileId: string): Promise<AnalysisRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    throw normalizeSupabaseError(error);
  }
  return data;
}

/** RLS (`analyses_select_own`) is the ownership boundary — a caller who doesn't own `analysisId` gets `null`, same as a not-found. */
export async function getAnalysisById(analysisId: string): Promise<AnalysisRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('id', analysisId)
    .maybeSingle();
  if (error) {
    throw normalizeSupabaseError(error);
  }
  return data;
}
