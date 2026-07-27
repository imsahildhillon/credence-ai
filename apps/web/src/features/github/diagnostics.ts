import 'server-only';

/**
 * TEMPORARY — answers one question with certainty: does `storeGithubAccessToken()`
 * actually execute during a GitHub reconnect, and if not, exactly where does
 * execution stop first? Every significant step from `/auth/callback` through
 * `storeGithubAccessToken()`'s return logs through this one function, tagged
 * with the request's correlation id and (once known) the GitHub account id.
 * Remove this file and every call site once the next reconnect gives a
 * definitive answer — this is not a permanent logging strategy.
 */
export function logOAuthStep(
  correlationId: string | undefined,
  githubAccountId: string | null | undefined,
  step: string,
  error?: unknown,
): void {
  console.warn('[oauth-trace]', {
    correlationId: correlationId ?? null,
    githubAccountId: githubAccountId ?? null,
    step,
    error: error === undefined ? undefined : describeErrorForTrace(error),
  });
}

/** Independent copy of the same error-description walk used elsewhere in this codebase (CLAUDE.md §4) — never logs secret material, only name/message/stack/status/code/details/hint and the `.cause` chain. */
function describeErrorForTrace(error: unknown, seen: Set<unknown> = new Set()): unknown {
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
  for (const key of ['status', 'statusCode', 'code', 'details', 'hint']) {
    if (record[key] !== undefined) {
      description[key] = record[key];
    }
  }
  if (record['cause'] !== undefined) {
    description['cause'] = describeErrorForTrace(record['cause'], seen);
  }

  return description;
}
