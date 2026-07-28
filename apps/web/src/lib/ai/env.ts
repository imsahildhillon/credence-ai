import 'server-only';
import { z } from 'zod';

import { createLazyEnv } from '@/config/lazy-env';

/**
 * AI service environment configuration — validated lazily, not at boot.
 *
 * Per ADR-010, GitHub Models (via the official `openai` SDK, pointed at
 * `https://models.github.ai/inference`) is the sanctioned provider; all
 * model calls go through this module. The application must be able to
 * start without an AI credential configured (e.g. local dev without AI
 * work, or a deployment where AI features are temporarily disabled) — so
 * `GITHUB_TOKEN` is intentionally excluded from the core, eager `env.ts`
 * schema. Every AI-calling code path must call `getAiEnv()` before
 * constructing a client; a missing token then fails loudly and
 * specifically at the point of use, not silently or generically at boot.
 *
 * This `GITHUB_TOKEN` is a GitHub Models inference token — unrelated to
 * this codebase's per-student GitHub OAuth credentials (`github_credentials`,
 * ADR-004). The shared name is a coincidence; never conflate the two.
 */
const AiEnvSchema = z.object({
  GITHUB_TOKEN: z.string().min(1, 'GITHUB_TOKEN is required'),
});

export type AiEnv = Readonly<z.infer<typeof AiEnvSchema>>;

export const getAiEnv = createLazyEnv(AiEnvSchema, 'AI services (Anthropic)');
