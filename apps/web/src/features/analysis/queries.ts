import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { normalizeSupabaseError } from '@/lib/supabase/errors';
import type { Database } from '@/lib/supabase/types';

import type { AggregatableEvidence, RepositoryContext, SkillRow } from './aggregator';
import type { AssessmentLevel, ConfidenceLevel, PersistableAssessment } from './types';

type AnalysisStatus = Database['public']['Enums']['analysis_status'];

/**
 * Data access for the assessment stage.
 *
 * Service-role throughout, for the same reason as the evidence pipeline: the
 * worker has no user session, so there is no `auth.uid()` for RLS to key on.
 * Safety comes from scope — every read is reachable only from the analysis's
 * own snapshot, whose ownership was validated in SQL when it was created
 * (ADR-005), and every write goes through `persist_skill_assessment`, which
 * re-derives the profile from the analysis rather than trusting a parameter.
 */

export interface AnalysisContextRow {
  readonly id: string;
  readonly profile_id: string;
  readonly status: AnalysisStatus;
}

export async function getAnalysisContext(analysisId: string): Promise<AnalysisContextRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('analyses')
    .select('id, profile_id, status')
    .eq('id', analysisId)
    .maybeSingle();
  if (error) {
    throw normalizeSupabaseError(error);
  }
  return data;
}

/** The repositories this run is defined over — the snapshot, never `included`. */
export async function listSnapshotRepositories(
  analysisId: string,
): Promise<readonly RepositoryContext[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('analysis_repositories')
    .select('repository_id, full_name, primary_language')
    .eq('analysis_id', analysisId);
  if (error) {
    throw normalizeSupabaseError(error);
  }
  return (data ?? []).map((row) => ({
    repositoryId: row.repository_id,
    fullName: row.full_name,
    primaryLanguage: row.primary_language,
  }));
}

/**
 * Evidence for this run only — scoped to the snapshot's repositories, not to
 * everything the profile has ever accumulated. An assessment must describe
 * the run it belongs to.
 */
export async function listEvidenceForRepositories(
  repositoryIds: readonly string[],
): Promise<readonly AggregatableEvidence[]> {
  if (repositoryIds.length === 0) {
    return [];
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('evidence_items')
    .select('id, source_type, title, occurred_at, author_login, repository_id, payload')
    .in('repository_id', [...repositoryIds])
    .not('source_type', 'is', null);
  if (error) {
    throw normalizeSupabaseError(error);
  }
  return data ?? [];
}

export async function listSkills(): Promise<readonly SkillRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('skills')
    .select('slug, name, description')
    .order('display_order', { ascending: true });
  if (error) {
    throw normalizeSupabaseError(error);
  }
  return data ?? [];
}

export async function getCandidateGithubLogin(profileId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('github_accounts')
    .select('github_username')
    .eq('profile_id', profileId)
    .maybeSingle();
  if (error) {
    throw normalizeSupabaseError(error);
  }
  return data?.github_username ?? null;
}

/** Repositories the ingestion stage could not fully read — drives honest hedging. */
export async function countRepositoriesWithErrors(analysisId: string): Promise<number> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('analysis_errors')
    .select('repository_id')
    .eq('analysis_id', analysisId);
  if (error) {
    throw normalizeSupabaseError(error);
  }
  return new Set(
    (data ?? []).flatMap((row) => (row.repository_id === null ? [] : [row.repository_id])),
  ).size;
}

/**
 * Persists one assessment and its evidence links atomically. The RPC is the
 * only write path: it re-derives the profile from the analysis, resolves the
 * skill slug against the taxonomy, and refuses citations that do not exist or
 * belong to another profile — so a fabricated claim cannot be written even if
 * every check above it were removed (CLAUDE.md §15.2).
 */
export async function persistAssessment(
  analysisId: string,
  assessment: PersistableAssessment,
): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('persist_skill_assessment', {
    p_analysis_id: analysisId,
    p_skill_slug: assessment.skillSlug,
    p_level: assessment.level satisfies AssessmentLevel,
    p_confidence: assessment.confidence satisfies ConfidenceLevel,
    p_reasoning: assessment.reasoning,
    p_strengths: [...assessment.strengths],
    p_growth_areas: [...assessment.growthAreas],
    p_evidence_item_ids: [...assessment.evidenceIds],
  });
  if (error) {
    throw normalizeSupabaseError(error);
  }
  return data;
}

export interface AnalysisCompletion {
  readonly status: AnalysisStatus;
  readonly summary: string | null;
  readonly confidence: ConfidenceLevel | null;
  readonly model: string | null;
  readonly pipelineVersion: string;
  readonly promptVersion: string;
  readonly errorMessage: string | null;
}

/**
 * Writes the analysis's terminal state together with the provenance that
 * makes it reproducible: model, pipeline version, and prompt version
 * (CLAUDE.md §14.4). A `completed` analysis is also required by CHECK
 * constraint to carry a summary, a confidence, a model, and a pipeline
 * version — so an assessment that produced nothing cannot claim completion.
 */
export async function completeAnalysis(
  analysisId: string,
  completion: AnalysisCompletion,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('analyses')
    .update({
      status: completion.status,
      summary: completion.summary,
      confidence: completion.confidence,
      model: completion.model,
      pipeline_version: completion.pipelineVersion,
      prompt_version: completion.promptVersion,
      error_message: completion.errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq('id', analysisId);
  if (error) {
    throw normalizeSupabaseError(error);
  }
}

export async function recordAssessmentError(
  analysisId: string,
  kind: string,
  message: string,
  retryable: boolean,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from('analysis_errors').insert({
    analysis_id: analysisId,
    repository_id: null,
    stage: 'assessment',
    kind,
    message,
    retryable,
  });
  if (error) {
    throw normalizeSupabaseError(error);
  }
}
