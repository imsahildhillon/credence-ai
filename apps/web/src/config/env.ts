import 'server-only';
import { z } from 'zod';

/**
 * Core environment configuration — validated eagerly at import time
 * (fail-fast, CLAUDE.md §9.6). This covers only what the application needs
 * to boot and serve any request at all:
 *
 *   - Supabase   (database, auth backend, storage)
 *   - Public configuration (client-safe base URL)
 *
 * Authentication has no eager env requirement of its own: Supabase Auth
 * (ADR-001) is configured entirely in the Supabase project (dashboard —
 * see apps/web/src/features/auth/README.md) and reuses the Supabase
 * variables above; there is no separate session/JWT secret to validate
 * here the way Auth.js would have needed.
 *
 * AI (src/lib/ai/env.ts) and GitHub integration (src/lib/github/env.ts)
 * credentials are deliberately excluded — the application must be able to
 * boot without them, and those modules validate their own requirements the
 * moment they're actually invoked. See README.md "Environment strategy".
 */
const CoreEnvSchema = z.object({
  // Optional — has a default, never blocks startup.
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Supabase — database, auth, and storage backend.
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // Database — direct Postgres connection to the Supabase-hosted instance.
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Public configuration — client-safe, NEXT_PUBLIC_-prefixed only
  // (CLAUDE.md §9.6).
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL'),
});

export type Env = Readonly<z.infer<typeof CoreEnvSchema>>;

function loadEnv(): Env {
  const parsed = CoreEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(`Invalid environment configuration. Fix the following and restart:\n${issues}`);
  }

  return parsed.data;
}

export const env: Env = loadEnv();
