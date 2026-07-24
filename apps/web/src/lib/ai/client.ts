import 'server-only';

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

import { getAiEnv } from './env';
import { AiError } from './errors';
import { AI_TASKS, type AiTaskName } from './models';

/**
 * The single sanctioned seam for talking to Claude (CLAUDE.md §17.1).
 *
 * Features never import `@anthropic-ai/sdk` directly. Everything they need —
 * model selection, structured-output enforcement, stop-reason handling, and
 * token accounting — is applied here once, so no feature can accidentally
 * ship an evaluation call that trusts free text or silently swallows a
 * refusal.
 *
 * Two design decisions are load-bearing:
 *
 * 1. **Structured output is mandatory, not optional** (§17.2/§17.4). The
 *    caller supplies a Zod schema; it is converted to a JSON schema that
 *    constrains generation *and* re-validated on receipt. There is no code
 *    path that returns unvalidated model text, so no caller can invent one.
 *
 * 2. **The prompt is split at the cache boundary** (§17.7). `systemPrompt`
 *    is the stable rubric and carries the cache breakpoint; `userContent`
 *    is the volatile per-candidate payload and sits after it. Nothing
 *    volatile (timestamps, ids) may enter the system prompt or the cache
 *    silently never hits.
 */

export interface AiUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheReadInputTokens: number;
  readonly cacheCreationInputTokens: number;
}

export interface StructuredCompletion<Output> {
  readonly output: Output;
  /** The model that actually produced this response — recorded as provenance. */
  readonly model: string;
  readonly usage: AiUsage;
}

export interface StructuredCallOptions<Schema extends z.ZodType> {
  readonly task: AiTaskName;
  /** Stable, cacheable instructions and rubric. Must contain no volatile values. */
  readonly systemPrompt: string;
  /** Volatile, per-request payload. Untrusted content belongs here, never in `systemPrompt`. */
  readonly userContent: string;
  /** Validated on receipt; also constrains generation. Use `z.strictObject` at the root. */
  readonly schema: Schema;
}

let cachedClient: Anthropic | undefined;

function getClient(): Anthropic {
  if (!cachedClient) {
    cachedClient = new Anthropic({ apiKey: getAiEnv().ANTHROPIC_API_KEY });
  }
  return cachedClient;
}

/**
 * JSON-Schema keywords structured outputs does not support. Zod emits them
 * from `.min()`/`.max()`, and sending them is a 400.
 *
 * Stripping them here does not weaken the contract: the same Zod schema
 * re-validates the response, so a bound the API cannot enforce during
 * generation is still enforced on receipt. Only the enforcement point moves
 * (this mirrors what the SDK's own Zod helper does).
 */
const UNSUPPORTED_SCHEMA_KEYWORDS = [
  'minLength',
  'maxLength',
  'pattern',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'multipleOf',
  'minItems',
  'maxItems',
  'uniqueItems',
  'minProperties',
  'maxProperties',
] as const;

function stripUnsupported(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map(stripUnsupported);
  }
  if (node === null || typeof node !== 'object') {
    return node;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if ((UNSUPPORTED_SCHEMA_KEYWORDS as readonly string[]).includes(key)) {
      continue;
    }
    result[key] = stripUnsupported(value);
  }
  return result;
}

/**
 * Anthropic's structured outputs require `additionalProperties: false` on
 * every object, which Zod emits only for `strictObject`. `$schema` is
 * metadata the API has no use for, so it is dropped rather than sent.
 */
function toResponseSchema(schema: z.ZodType): Record<string, unknown> {
  const jsonSchema = z.toJSONSchema(schema, { target: 'draft-2020-12' }) as Record<string, unknown>;
  delete jsonSchema['$schema'];
  return stripUnsupported(jsonSchema) as Record<string, unknown>;
}

function toAiError(error: unknown): AiError {
  if (error instanceof AiError) {
    return error;
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new AiError('rate_limited', 'Claude rate limit reached.', { cause: error });
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return new AiError('unavailable', 'Could not reach the Claude API.', { cause: error });
  }
  if (error instanceof Anthropic.APIError && error.status !== undefined && error.status >= 500) {
    return new AiError('unavailable', 'The Claude API is temporarily unavailable.', {
      cause: error,
    });
  }
  return new AiError('unknown', 'The Claude request failed.', { cause: error });
}

export async function completeStructured<Schema extends z.ZodType>(
  options: StructuredCallOptions<Schema>,
): Promise<StructuredCompletion<z.infer<Schema>>> {
  const task = AI_TASKS[options.task];

  let response;
  try {
    response = await getClient().messages.create({
      model: task.model,
      max_tokens: task.maxTokens,
      // Adaptive thinking is the current idiom; `budget_tokens` is rejected
      // on this model generation (CLAUDE.md §17.3).
      thinking: { type: 'adaptive' },
      output_config: {
        effort: task.effort,
        format: { type: 'json_schema', schema: toResponseSchema(options.schema) },
      },
      system: [
        {
          type: 'text',
          text: options.systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: options.userContent }],
    });
  } catch (error) {
    throw toAiError(error);
  }

  // Every stop reason is an explicit branch (CLAUDE.md §17.6) — a refusal or
  // a truncated response must never be mistaken for a usable assessment.
  if (response.stop_reason === 'refusal') {
    throw new AiError('refusal', 'Claude declined to produce an assessment for this input.');
  }
  if (response.stop_reason === 'max_tokens') {
    throw new AiError('incomplete', 'The assessment response was cut off before it finished.');
  }

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  if (text.trim().length === 0) {
    throw new AiError('invalid_output', 'Claude returned no assessment content.');
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(text);
  } catch (error) {
    throw new AiError('invalid_output', 'Claude returned content that was not valid JSON.', {
      cause: error,
    });
  }

  const validated = options.schema.safeParse(parsedJson);
  if (!validated.success) {
    // Deliberately terminal: a structurally invalid assessment is never
    // persisted partially (CLAUDE.md §17.5).
    throw new AiError(
      'invalid_output',
      `Claude output did not match the required schema: ${validated.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ')}`,
    );
  }

  return {
    output: validated.data as z.infer<Schema>,
    model: response.model,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cacheReadInputTokens: response.usage.cache_read_input_tokens ?? 0,
      cacheCreationInputTokens: response.usage.cache_creation_input_tokens ?? 0,
    },
  };
}
