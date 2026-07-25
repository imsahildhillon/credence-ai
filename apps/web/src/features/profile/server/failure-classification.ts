import 'server-only';

import { requiresGithubReconnect, type GithubErrorKind } from '@/features/github/types';
import { normalizeSupabaseError } from '@/lib/supabase/errors';
import { createClient } from '@/lib/supabase/server';

/**
 * Classifies why an analysis is `failed`/`partial`, so `/analysis` and the
 * profile's partial banner can offer the right recovery action instead of a
 * generic "something went wrong" (this sprint's Error Recovery + Empty
 * States requirements). Reads `analysis_errors` under the owner's own RLS
 * session — no service-role access, and no new logic in the protected
 * evidence/assessment engines that write those rows.
 */

export interface AnalysisFailureClassification {
  /** True when reconnecting GitHub is the correct next step (a revoked or unavailable token). */
  readonly requiresGithubReconnect: boolean;
  /** True when GitHub rate-limited the run — the right advice is "wait", not "reconnect". */
  readonly rateLimited: boolean;
  /** Every distinct failure kind recorded for this analysis, for the metadata/debug view. */
  readonly kinds: readonly string[];
}

const GITHUB_ERROR_KINDS: ReadonlySet<string> = new Set<GithubErrorKind>([
  'token_unavailable',
  'unauthorized',
  'rate_limited',
  'not_found',
  'network',
  'unknown',
]);

function isGithubErrorKind(kind: string): kind is GithubErrorKind {
  return GITHUB_ERROR_KINDS.has(kind);
}

export async function classifyAnalysisFailure(
  analysisId: string,
): Promise<AnalysisFailureClassification> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('analysis_errors')
    .select('kind')
    .eq('analysis_id', analysisId);
  if (error) {
    throw normalizeSupabaseError(error);
  }

  const kinds = [...new Set((data ?? []).map((row) => row.kind))];

  return {
    requiresGithubReconnect: kinds.some((kind) => isGithubErrorKind(kind) && requiresGithubReconnect(kind)),
    rateLimited: kinds.includes('rate_limited'),
    kinds,
  };
}
