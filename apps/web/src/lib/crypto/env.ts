import 'server-only';
import { z } from 'zod';

import { createLazyEnv } from '@/config/lazy-env';

const KEY_BYTES = 32;

/**
 * Encryption key for secrets we persist (currently GitHub OAuth access
 * tokens). Validated lazily so a missing key never blocks app boot — only
 * the code path that actually encrypts/decrypts fails, and callers degrade
 * gracefully (see `features/github/service.ts`).
 *
 * The key lives only in the environment, never in the database, so a
 * database dump alone cannot yield a usable token (CLAUDE.md §18.5/§18.6).
 * Generate with: `openssl rand -base64 32`.
 */
const SecretsEnvSchema = z.object({
  GITHUB_TOKEN_ENCRYPTION_KEY: z
    .string()
    .min(1, 'GITHUB_TOKEN_ENCRYPTION_KEY is required')
    .refine(
      (value) => Buffer.from(value, 'base64').length === KEY_BYTES,
      `GITHUB_TOKEN_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes (generate: openssl rand -base64 32)`,
    ),
});

export type SecretsEnv = Readonly<z.infer<typeof SecretsEnvSchema>>;

export const getSecretsEnv = createLazyEnv(SecretsEnvSchema, 'secret encryption');
