import 'server-only';

import { normalizeSupabaseError } from '@/lib/supabase/errors';
import { createClient } from '@/lib/supabase/server';

import { toAnalysisSnapshotItem, toRepositorySummary } from './repository-mapper';
import type {
  AnalysisRow,
  AnalysisSnapshotItem,
  GithubAccountRow,
  RepositoryRef,
  RepositorySummary,
} from './types';

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
