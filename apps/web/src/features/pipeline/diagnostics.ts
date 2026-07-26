/**
 * Structured failure logging for the orchestrator's three stages
 * (ingest/assess/finalize). Diagnostics-only: this module never changes
 * control flow — `logStageFailure` logs and returns; callers still
 * re-throw the original error unchanged, so behavior is identical to
 * before this file existed.
 */

export type PipelineStageName = 'ingest' | 'assess' | 'finalize';

/** Walks an arbitrary error's `.cause` chain into a plain, JSON-loggable object. Mirrors `lib/supabase/errors.ts`'s `describeError` — duplicated rather than imported, since this feature must not depend on another feature's internals (CLAUDE.md §4) and `lib/supabase/errors.ts` is a `lib/` module, not a feature, but keeping the shape independent avoids coupling this diagnostic tool to that module's evolution. */
function describeCauseChain(error: unknown, seen: Set<unknown> = new Set()): unknown {
  if (error === null || typeof error !== 'object') {
    return error;
  }
  if (seen.has(error)) {
    return '[circular]';
  }
  seen.add(error);

  const record = error as Record<string, unknown>;
  const description: Record<string, unknown> = {};

  if (error instanceof Error) {
    description['name'] = error.name;
    description['message'] = error.message;
    description['stack'] = error.stack;
  }
  for (const key of ['status', 'statusCode', 'code', 'details', 'hint', 'kind', 'retryable']) {
    if (record[key] !== undefined) {
      description[key] = record[key];
    }
  }
  if (record['cause'] !== undefined) {
    description['cause'] = describeCauseChain(record['cause'], seen);
  }

  return description;
}

/** Matches both a raw PostgrestError (`code`/`details`/`hint`/`message`) and this codebase's own `SupabaseError` (`code`/`message`/`cause`) — whichever shape reached this catch. */
function extractSupabaseDetails(error: unknown): Record<string, unknown> | null {
  if (error === null || typeof error !== 'object') {
    return null;
  }
  const record = error as Record<string, unknown>;
  const looksSupabaseShaped =
    'code' in record && 'message' in record && ('details' in record || 'hint' in record || 'cause' in record);
  if (!looksSupabaseShaped) {
    return null;
  }
  return {
    code: record['code'],
    message: record['message'],
    details: record['details'] ?? null,
    hint: record['hint'] ?? null,
  };
}

/** Matches `AiError` (`lib/ai/errors.ts`) by name rather than importing the class — same independence reasoning as `describeCauseChain`. */
function extractAnthropicDetails(error: unknown): Record<string, unknown> | null {
  if (!(error instanceof Error) || error.name !== 'AiError') {
    return null;
  }
  const record = error as unknown as Record<string, unknown>;
  return {
    kind: record['kind'] ?? null,
    retryable: record['retryable'] ?? null,
    message: error.message,
  };
}

/**
 * Logs everything available about a stage failure — analysis id, the
 * lifecycle status at the moment it failed, the exception's name/message/
 * stack, its full `.cause` chain, and (when present) Supabase- or
 * Anthropic-shaped error details pulled from anywhere in that chain.
 * Callers re-throw the original `error` unchanged immediately after —
 * this function only observes.
 */
export function logStageFailure(
  stage: PipelineStageName,
  analysisId: string,
  status: string,
  error: unknown,
): void {
  const cause = error instanceof Error ? error.cause : undefined;

  const diagnostics = {
    analysisId,
    stage,
    status,
    exceptionName: error instanceof Error ? error.name : null,
    exceptionMessage: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? (error.stack ?? null) : null,
    cause: cause !== undefined ? describeCauseChain(cause) : null,
    supabase: extractSupabaseDetails(error) ?? extractSupabaseDetails(cause),
    anthropic: extractAnthropicDetails(error) ?? extractAnthropicDetails(cause),
  };

  console.error(`[pipeline] ${stage} stage failed:`, JSON.stringify(diagnostics, null, 2));
}
