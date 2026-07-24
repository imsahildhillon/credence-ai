/**
 * Named failure modes for Claude calls (CLAUDE.md §19.2 — typed errors with
 * stable codes, never a bare `Error` with a string).
 *
 * The distinction that matters to callers is *retryable vs terminal*: an
 * overloaded API should be retried, a schema-invalid response should not be
 * (the same prompt will produce the same shape of failure).
 */
export type AiFailureKind =
  /** Safety classifiers declined the request. Terminal. */
  | 'refusal'
  /** Output hit `max_tokens` before finishing. Terminal without a prompt change. */
  | 'incomplete'
  /** Response did not satisfy the declared schema. Terminal — the contract broke. */
  | 'invalid_output'
  /** 429. Retryable. */
  | 'rate_limited'
  /** 5xx, timeout, or connection failure. Retryable. */
  | 'unavailable'
  /** Anything else, including a missing API key. Terminal. */
  | 'unknown';

const RETRYABLE: ReadonlySet<AiFailureKind> = new Set<AiFailureKind>([
  'rate_limited',
  'unavailable',
]);

export class AiError extends Error {
  readonly kind: AiFailureKind;
  readonly retryable: boolean;

  constructor(kind: AiFailureKind, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'AiError';
    this.kind = kind;
    this.retryable = RETRYABLE.has(kind);
  }
}
