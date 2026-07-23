import 'server-only';

import { normalizeSupabaseError } from '@/lib/supabase/errors';
import { createClient } from '@/lib/supabase/server';

import { toRepositorySummary } from './repository-mapper';
import type { AnalysisRow, GithubAccountRow, RepositorySummary } from './types';

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

export async function countSelectedRepositories(githubAccountId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('repositories')
    .select('*', { count: 'exact', head: true })
    .eq('github_account_id', githubAccountId)
    .eq('included', true);
  if (error) {
    throw normalizeSupabaseError(error);
  }
  return count ?? 0;
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
