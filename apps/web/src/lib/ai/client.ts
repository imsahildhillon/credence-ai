import 'server-only';

import OpenAI from 'openai';
import { z } from 'zod';

import { getAiEnv } from './env';
import { AiError } from './errors';
import { AI_TASKS, type AiTaskName } from './models';

/**
 * The single sanctioned seam for talking to the model (CLAUDE.md §17.1;
 * provider per ADR-010 — GitHub Models, via the official `openai` SDK,
 * rather than Anthropic).
 *
 * Features never import the `openai` SDK directly. Everything they need —
 * model selection, structured-output enforcement, and token accounting — is
 * applied here once, so no feature can accidentally ship an evaluation call
 * that trusts free text or silently swallows a refusal.
 *
 * **Structured output is mandatory, not optional** (§17.2/§17.4). The caller
 * supplies a Zod schema; it is converted to a JSON Schema that constrains
 * generation via `response_format: {type: 'json_schema'}` *and* is
 * re-validated on receipt. There is no code path that returns unvalidated
 * model text, so no caller can invent one.
 */

const GITHUB_MODELS_BASE_URL = 'https://models.github.ai/inference';

export interface AiUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
  /**
   * Per ADR-010: GitHub Models' Chat Completions surface reports prefix-cache
   * hits opportunistically (`usage.prompt_tokens_details`), unlike Anthropic's
   * explicit, request-time `cache_control` breakpoint this codebase used
   * previously. There is no equivalent way to *declare* a cache breakpoint
   * here — these fields simply reflect whatever the endpoint reports, and
   * default to 0 when it reports nothing.
   */
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
  /** Stable instructions and rubric. */
  readonly systemPrompt: string;
  /** Volatile, per-request payload. Untrusted content belongs here, never in `systemPrompt`. */
  readonly userContent: string;
  /** Validated on receipt; also constrains generation. Use `z.strictObject` at the root. */
  readonly schema: Schema;
}

let cachedClient: OpenAI | undefined;

function getClient(): OpenAI {
  if (!cachedClient) {
    cachedClient = new OpenAI({
      baseURL: GITHUB_MODELS_BASE_URL,
      apiKey: getAiEnv().GITHUB_TOKEN,
    });
  }
  return cachedClient;
}

/**
 * Anthropic's structured outputs required stripping unsupported JSON-Schema
 * keywords (`minLength`, etc.) that Zod emits — OpenAI's Structured Outputs
 * has its own restricted keyword subset, but `strict: true` below is what
 * actually enforces the schema at generation time; the Zod re-validation on
 * receipt (below) is what makes the exact keyword subset a non-issue either
 * way, so no stripping step is reproduced here.
 */
function toResponseSchema(schema: z.ZodType): Record<string, unknown> {
  const jsonSchema = z.toJSONSchema(schema, { target: 'draft-2020-12' }) as Record<string, unknown>;
  delete jsonSchema['$schema'];
  return jsonSchema;
}

function toAiError(error: unknown): AiError {
  if (error instanceof AiError) {
    return error;
  }
  if (error instanceof OpenAI.RateLimitError) {
    return new AiError('rate_limited', 'GitHub Models rate limit reached.', { cause: error });
  }
  if (error instanceof OpenAI.APIConnectionError) {
    return new AiError('unavailable', 'Could not reach GitHub Models.', { cause: error });
  }
  if (error instanceof OpenAI.APIError && error.status !== undefined && error.status >= 500) {
    return new AiError('unavailable', 'GitHub Models is temporarily unavailable.', {
      cause: error,
    });
  }
  return new AiError('unknown', 'The GitHub Models request failed.', { cause: error });
}

export async function completeStructured<Schema extends z.ZodType>(
  options: StructuredCallOptions<Schema>,
): Promise<StructuredCompletion<z.infer<Schema>>> {
  const task = AI_TASKS[options.task];
  const schemaForRequest = toResponseSchema(options.schema);

  // TEMPORARY — request-size logging while the 4000-token GitHub Models
  // limit is being tuned against (see MAX_EVIDENCE_PER_DIMENSION). Character
  // counts, not a real tokenizer — a rough proxy (~4 chars/token for English
  // text) to compare component sizes against each other and against the
  // limit, not an exact token count. Remove once the size is settled.
  const schemaChars = JSON.stringify(schemaForRequest).length;
  const systemPromptChars = options.systemPrompt.length;
  const userContentChars = options.userContent.length;
  console.warn('[ai-request-size]', {
    task: options.task,
    systemPromptChars,
    userContentChars,
    schemaChars,
    totalChars: systemPromptChars + userContentChars + schemaChars,
    approxTokens: Math.ceil((systemPromptChars + userContentChars + schemaChars) / 4),
  });

  let response;
  try {
    response = await getClient().chat.completions.create({
      model: task.model,
      max_completion_tokens: task.maxTokens,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: options.task,
          schema: schemaForRequest,
          strict: true,
        },
      },
      messages: [
        { role: 'system', content: options.systemPrompt },
        { role: 'user', content: options.userContent },
      ],
    });
  } catch (error) {
    throw toAiError(error);
  }

  const choice = response.choices[0];
  if (!choice) {
    throw new AiError('invalid_output', 'GitHub Models returned no completion choices.');
  }

  // Every finish reason is an explicit branch (CLAUDE.md §17.6) — a refusal
  // or a truncated response must never be mistaken for a usable assessment.
  if (choice.finish_reason === 'content_filter') {
    throw new AiError('refusal', 'The model declined to produce an assessment for this input.');
  }
  if (choice.finish_reason === 'length') {
    throw new AiError('incomplete', 'The assessment response was cut off before it finished.');
  }

  const text = choice.message.content;
  if (!text || text.trim().length === 0) {
    throw new AiError('invalid_output', 'The model returned no assessment content.');
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(text);
  } catch (error) {
    throw new AiError('invalid_output', 'The model returned content that was not valid JSON.', {
      cause: error,
    });
  }

  const validated = options.schema.safeParse(parsedJson);
  if (!validated.success) {
    // Deliberately terminal: a structurally invalid assessment is never
    // persisted partially (CLAUDE.md §17.5).
    throw new AiError(
      'invalid_output',
      `Model output did not match the required schema: ${validated.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ')}`,
    );
  }

  const usage = response.usage;
  return {
    output: validated.data as z.infer<Schema>,
    model: response.model,
    usage: {
      inputTokens: usage?.prompt_tokens ?? 0,
      outputTokens: usage?.completion_tokens ?? 0,
      cacheReadInputTokens: usage?.prompt_tokens_details?.cached_tokens ?? 0,
      cacheCreationInputTokens: usage?.prompt_tokens_details?.cache_write_tokens ?? 0,
    },
  };
}
