import { isAuthError, type AuthError, type PostgrestError } from '@supabase/supabase-js';

/**
 * Stable, catalog-style codes for anything Supabase can fail with —
 * mirrors CLAUDE.md §19's "single error catalog" pattern, scoped to this
 * module. `src/lib/errors.ts` (the app-wide catalog) does not exist yet;
 * when it does, `SupabaseErrorCode` is designed to become one of its
 * families rather than needing a rewrite.
 */
export type SupabaseErrorCode =
  | 'AUTH_INVALID_CREDENTIALS'
  | 'AUTH_SESSION_MISSING'
  | 'AUTH_EMAIL_NOT_CONFIRMED'
  | 'AUTH_WEAK_PASSWORD'
  | 'AUTH_UNKNOWN'
  | 'DATABASE_CONSTRAINT_VIOLATION'
  | 'DATABASE_NOT_FOUND'
  | 'DATABASE_PERMISSION_DENIED'
  | 'DATABASE_UNKNOWN';

export interface SupabaseError {
  readonly code: SupabaseErrorCode;
  readonly message: string;
  /**
   * `unknown`, not `AuthError | PostgrestError` — `normalizeSupabaseError`
   * is total (CLAUDE.md §19.1 expected-vs-unexpected split still applies
   * one layer up, at the caller's `throw`) and must accept *any* shape a
   * client library, a network layer, or a misconfigured credential can
   * produce, never assume it matches the two recognized ones.
   */
  readonly cause: unknown;
}

// Postgrest/Postgres codes worth naming explicitly; anything else falls
// back to DATABASE_UNKNOWN rather than guessing at a mapping.
const POSTGRES_ERROR_CODE_MAP: Readonly<Record<string, SupabaseErrorCode>> = {
  '23505': 'DATABASE_CONSTRAINT_VIOLATION', // unique_violation
  '23503': 'DATABASE_CONSTRAINT_VIOLATION', // foreign_key_violation
  '23514': 'DATABASE_CONSTRAINT_VIOLATION', // check_violation
  PGRST116: 'DATABASE_NOT_FOUND', // no rows for .single()
  '42501': 'DATABASE_PERMISSION_DENIED', // insufficient_privilege (RLS denial)
};

function toAuthErrorCode(error: AuthError): SupabaseErrorCode {
  switch (error.code) {
    case 'invalid_credentials':
      return 'AUTH_INVALID_CREDENTIALS';
    case 'email_not_confirmed':
      return 'AUTH_EMAIL_NOT_CONFIRMED';
    case 'weak_password':
      return 'AUTH_WEAK_PASSWORD';
    case 'session_not_found':
    case 'refresh_token_not_found':
      return 'AUTH_SESSION_MISSING';
    default:
      return 'AUTH_UNKNOWN';
  }
}

function toDatabaseErrorCode(error: PostgrestError): SupabaseErrorCode {
  return POSTGRES_ERROR_CODE_MAP[error.code] ?? 'DATABASE_UNKNOWN';
}

function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'details' in error &&
    'hint' in error &&
    'message' in error
  );
}

/**
 * Walks an arbitrary error value into a plain, JSON-loggable object —
 * `name`/`message`/`stack` when it's an `Error`, plus any of
 * `status`/`statusCode`/`code`/`details`/`hint` it happens to carry (fetch
 * failures, PostgREST bodies, and Auth errors all use different subsets of
 * these), and recurses into `.cause` so a wrapped error never hides the
 * thing that actually failed. `seen` guards against a circular `.cause`.
 */
function describeError(error: unknown, seen: Set<unknown> = new Set()): unknown {
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
    description['cause'] = describeError(record['cause'], seen);
  }

  return description;
}

/**
 * Normalizes any error a Supabase call can produce into the typed
 * `SupabaseError` shape. Total: accepts `unknown` and never throws — an
 * unrecognized shape (a raw fetch failure, a misconfigured-credential
 * rejection, anything neither Auth nor Postgrest shaped) is preserved in
 * full (logged via `describeError`, kept verbatim as `cause`) and reported
 * as `DATABASE_UNKNOWN` rather than crashing the boundary that was trying
 * to handle the *original* failure. Call this at the boundary where a
 * Supabase call is made (route handler, server action, service, worker) —
 * per CLAUDE.md §19.3, only boundary layers decide presentation; this is
 * the one place that classification happens so it isn't duplicated per
 * call site.
 */
export function normalizeSupabaseError(error: unknown): SupabaseError {
  if (isAuthError(error)) {
    return { code: toAuthErrorCode(error), message: error.message, cause: error };
  }

  if (isPostgrestError(error)) {
    return { code: toDatabaseErrorCode(error), message: error.message, cause: error };
  }

  console.error(
    '[supabase] unrecognized error shape passed to normalizeSupabaseError:',
    JSON.stringify(describeError(error), null, 2),
  );

  return {
    code: 'DATABASE_UNKNOWN',
    message: error instanceof Error ? error.message : 'Unrecognized error from Supabase client',
    cause: error,
  };
}
