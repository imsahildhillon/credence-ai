import 'server-only';
import { z } from 'zod';

import { createLazyEnv } from '@/config/lazy-env';

/**
 * AI service environment configuration — validated lazily, not at boot.
 *
 * CLAUDE.md §17.1: Anthropic is the only sanctioned LLM provider; all
 * Claude calls go through this module. The application must be able to
 * start without an AI credential configured (e.g. local dev without AI
 * work, or a deployment where AI features are temporarily disabled) — so
 * `ANTHROPIC_API_KEY` is intentionally excluded from the core, eager
 * `env.ts` schema. Every AI-calling code path must call `getAiEnv()`
 * before constructing a client; a missing key then fails loudly and
 * specifically at the point of use, not silently or generically at boot.
 */
const AiEnvSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
});

export type AiEnv = Readonly<z.infer<typeof AiEnvSchema>>;

export const getAiEnv = createLazyEnv(AiEnvSchema, 'AI services (Anthropic)');
