import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { normalizeSupabaseError } from '@/lib/supabase/errors';
import type { Database, Json } from '@/lib/supabase/types';

import { toEvidenceItemInsert } from './mapper';
import type {
  AnalysisRepositoryRow,
  AnalysisRow,
  IngestionFailure,
  NormalizedEvidence,
} from './types';

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

export interface EvidenceLivenessCandidate {
  readonly id: string;
  readonly profile_id: string;
  readonly source_type: Database['public']['Enums']['evidence_source_type'] | null;
  readonly author_login: string | null;
  readonly payload: Json;
  readonly github_id: string | null;
  readonly repository_full_name: string | null;
}

/**
 * The liveness worker's scan query — rows not yet confirmed dead, least-
 * recently (or never) checked first, matching `evidence_items_link_check_due_idx`
 * (`supabase/migrations/20260726130000_add_evidence_link_checked_at.sql`).
 */
export async function listEvidenceDueForLivenessCheck(
  limit: number,
): Promise<readonly EvidenceLivenessCandidate[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('evidence_items')
    .select(
      'id, profile_id, source_type, author_login, payload, github_id, repository:repositories(full_name)',
    )
    .is('link_dead_at', null)
    .not('external_url', 'is', null)
    .order('link_checked_at', { ascending: true, nullsFirst: true })
    .limit(limit);
  if (error) {
    throw normalizeSupabaseError(error);
  }
  return (data ?? []).map((row) => {
    const repository = Array.isArray(row.repository) ? row.repository[0] : row.repository;
    return {
      id: row.id,
      profile_id: row.profile_id,
      source_type: row.source_type,
      author_login: row.author_login,
      payload: row.payload,
      github_id: row.github_id,
      repository_full_name: repository?.full_name ?? null,
    };
  });
}

export async function markEvidenceLivenessChecked(evidenceId: string, alive: boolean): Promise<void> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin
    .from('evidence_items')
    .update({ link_checked_at: now, ...(alive ? {} : { link_dead_at: now }) })
    .eq('id', evidenceId);
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
