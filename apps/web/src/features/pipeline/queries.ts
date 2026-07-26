import 'server-only';

import type { AssessmentSuccess, StageFailure } from '@/features/analysis';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizeSupabaseError } from '@/lib/supabase/errors';
import type { Database, Json } from '@/lib/supabase/types';

/**
 * Data access for the orchestrator. Service-role throughout: the worker is
 * a standalone process with no user session, so RLS has no `auth.uid()` to
 * key on — safety comes from the worker only ever acting on a specific
 * `analysisId` it claimed for itself, the same posture as
 * `features/evidence/queries.ts` and `features/analysis/queries.ts`.
 */

type AnalysisStatus = Database['public']['Enums']['analysis_status'];

/**
 * Claims either a fresh `queued` run or reclaims a `processing`-family run
 * whose heartbeat has gone stale — crash recovery, not a separate retry
 * path (`claim_next_analysis`, `supabase/migrations/20260726140100_*`).
 */
export async function claimNextAnalysis(
  workerId: string,
  staleAfterMs: number,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('claim_next_analysis', {
    p_worker_id: workerId,
    p_stale_after: `${Math.max(1, Math.round(staleAfterMs / 1000))} seconds`,
  });
  if (error) {
    // Raw, un-normalized, logged first — this is the exact object
    // supabase-js handed back for this specific call, before
    // normalizeSupabaseError's own (now total) handling touches it.
    console.error('[pipeline] raw claim_next_analysis error:', JSON.stringify(error, null, 2));
    throw normalizeSupabaseError(error);
  }
  return data;
}

export async function touchHeartbeat(analysisId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('analyses')
    .update({ heartbeat_at: new Date().toISOString() })
    .eq('id', analysisId);
  if (error) {
    throw normalizeSupabaseError(error);
  }
}

export async function isCancellationRequested(analysisId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('analyses')
    .select('cancellation_requested_at')
    .eq('id', analysisId)
    .maybeSingle();
  if (error) {
    throw normalizeSupabaseError(error);
  }
  return data?.cancellation_requested_at !== null && data?.cancellation_requested_at !== undefined;
}

/** Moves the run to the next lifecycle status without touching provenance/outcome fields — those are written only at the terminal transition. */
export async function transitionStatus(
  analysisId: string,
  status: Extract<AnalysisStatus, 'assessing' | 'finalizing'>,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('analyses')
    .update({ status, heartbeat_at: new Date().toISOString() })
    .eq('id', analysisId);
  if (error) {
    throw normalizeSupabaseError(error);
  }
}

export async function recordEvent(
  analysisId: string,
  eventType: string,
  metadata: Record<string, Json> = {},
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('analysis_events')
    .insert({ analysis_id: analysisId, event_type: eventType, metadata });
  if (error) {
    throw normalizeSupabaseError(error);
  }
}

export async function writeTerminalFailure(
  analysisId: string,
  failure: StageFailure,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('analyses')
    .update({
      status: 'failed',
      error_message: failure.message,
      pipeline_version: failure.pipelineVersion ?? null,
      prompt_version: failure.promptVersion ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', analysisId);
  if (error) {
    throw normalizeSupabaseError(error);
  }
}

export async function writeTerminalSuccess(
  analysisId: string,
  result: AssessmentSuccess,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('analyses')
    .update({
      status: result.status,
      summary: result.summary,
      confidence: result.confidence,
      model: result.model,
      pipeline_version: result.pipelineVersion,
      prompt_version: result.promptVersion,
      error_message: result.partialMessage,
      completed_at: new Date().toISOString(),
    })
    .eq('id', analysisId);
  if (error) {
    throw normalizeSupabaseError(error);
  }
}

export async function writeCancelled(analysisId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('analyses')
    .update({ status: 'cancelled', completed_at: new Date().toISOString() })
    .eq('id', analysisId);
  if (error) {
    throw normalizeSupabaseError(error);
  }
}
