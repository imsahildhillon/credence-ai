import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { normalizeSupabaseError } from '@/lib/supabase/errors';
import type { Database } from '@/lib/supabase/types';

import { toEvidenceItemInsert } from './mapper';
import type {
  AnalysisRepositoryRow,
  AnalysisRow,
  IngestionFailure,
  NormalizedEvidence,
} from './types';

type AnalysisStatus = Database['public']['Enums']['analysis_status'];

/**
 * Data access for the evidence pipeline.
 *
 * Everything here uses the **service-role** client, deliberately: the worker
 * runs with no user session, so there is no `auth.uid()` for RLS to key on.
 * Safety therefore comes from *what* it reads, not from RLS — the worker only
 * ever acts on rows reachable from an analysis snapshot, which was itself
 * ownership-validated in SQL when it was created (ADR-005). No repository
 * identifier ever originates from a client.
 */

export async function claimNextQueuedAnalysis(): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('claim_next_queued_analysis');
  if (error) {
    throw normalizeSupabaseError(error);
  }
  return data ?? null;
}

export async function getAnalysis(analysisId: string): Promise<AnalysisRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('analyses')
    .select('*')
    .eq('id', analysisId)
    .maybeSingle();
  if (error) {
    throw normalizeSupabaseError(error);
  }
  return data;
}

/** The immutable definition of what this run analyzes (never `included`). */
export async function listAnalysisSnapshotRows(
  analysisId: string,
): Promise<AnalysisRepositoryRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('analysis_repositories')
    .select('*')
    .eq('analysis_id', analysisId)
    .order('full_name', { ascending: true });
  if (error) {
    throw normalizeSupabaseError(error);
  }
  return data ?? [];
}

export async function getGithubAccountIdForProfile(profileId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('github_accounts')
    .select('id')
    .eq('profile_id', profileId)
    .maybeSingle();
  if (error) {
    throw normalizeSupabaseError(error);
  }
  return data?.id ?? null;
}

export async function markAnalysisProcessing(analysisId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('analyses')
    .update({ status: 'processing', started_at: new Date().toISOString() })
    .eq('id', analysisId);
  if (error) {
    throw normalizeSupabaseError(error);
  }
}

export async function finishAnalysis(
  analysisId: string,
  status: AnalysisStatus,
  errorMessage?: string | null,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('analyses')
    .update({
      status,
      completed_at: new Date().toISOString(),
      error_message: errorMessage ?? null,
    })
    .eq('id', analysisId);
  if (error) {
    throw normalizeSupabaseError(error);
  }
}

/**
 * Idempotent persistence: one batched upsert keyed on
 * `(repository_id, source_type, github_id)`. Re-running an analysis
 * re-observes the same signals and refreshes them in place — it never
 * duplicates, which is what makes the pipeline safe to retry.
 */
export async function upsertEvidence(
  profileId: string,
  repositoryId: string,
  evidence: readonly NormalizedEvidence[],
): Promise<number> {
  if (evidence.length === 0) {
    return 0;
  }

  const rows = evidence.map((item) => toEvidenceItemInsert(item, profileId, repositoryId));

  const admin = createAdminClient();
  const { error } = await admin
    .from('evidence_items')
    .upsert(rows, { onConflict: 'repository_id,source_type,github_id' });
  if (error) {
    throw normalizeSupabaseError(error);
  }
  return rows.length;
}

export async function recordAnalysisError(
  analysisId: string,
  repositoryId: string | null,
  failure: IngestionFailure,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from('analysis_errors').insert({
    analysis_id: analysisId,
    repository_id: repositoryId,
    stage: failure.stage,
    kind: failure.kind,
    message: failure.message,
    retryable: failure.retryable,
  });
  if (error) {
    throw normalizeSupabaseError(error);
  }
}

export async function countEvidenceForAnalysisRepositories(
  repositoryIds: readonly string[],
): Promise<number> {
  if (repositoryIds.length === 0) {
    return 0;
  }
  const admin = createAdminClient();
  const { count, error } = await admin
    .from('evidence_items')
    .select('*', { count: 'exact', head: true })
    .in('repository_id', [...repositoryIds]);
  if (error) {
    throw normalizeSupabaseError(error);
  }
  return count ?? 0;
}
