import { z } from 'zod';

/**
 * Client-safe environment configuration — the subset of `env.ts` that may
 * be read from code bundled for the browser. Deliberately has no
 * `server-only` import: the Supabase browser and middleware clients
 * (`lib/supabase/client.ts`, `lib/supabase/middleware.ts`) need these two
 * values while running outside the server-only module graph, where
 * `env.ts`'s guard would throw.
 *
 * These are the same two variables `env.ts` validates eagerly at boot;
 * revalidating here catches a missing `NEXT_PUBLIC_` value at Supabase
 * client construction time too, not only at server startup.
 */
const PublicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
});

export type PublicEnv = Readonly<z.infer<typeof PublicEnvSchema>>;

function loadPublicEnv(): PublicEnv {
  const parsed = PublicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(`Invalid public environment configuration:\n${issues}`);
  }

  return parsed.data;
}

export const publicEnv: PublicEnv = loadPublicEnv();
