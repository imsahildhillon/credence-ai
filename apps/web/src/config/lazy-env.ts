import 'server-only';
import { z } from 'zod';

/**
 * Shared helper for module-scoped environment validation.
 *
 * Unlike `env.ts` (validated eagerly at boot — CLAUDE.md §9.6), some
 * integrations are optional at startup and should only fail when the
 * module that needs them is actually invoked (e.g. AI calls, GitHub API
 * access). `createLazyEnv` builds a memoized getter: the schema is parsed
 * on first call, the result is cached, and a missing/invalid variable
 * throws a clearly-labeled error naming which integration is affected.
 */
export function createLazyEnv<Schema extends z.ZodTypeAny>(
  schema: Schema,
  label: string,
): () => Readonly<z.infer<Schema>> {
  let cached: z.infer<Schema> | undefined;

  return function getLazyEnv(): Readonly<z.infer<Schema>> {
    if (cached !== undefined) {
      return cached;
    }

    const parsed = schema.safeParse(process.env);

    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
        .join('\n');

      throw new Error(
        `Invalid environment configuration for ${label}. Fix the following and retry:\n${issues}`,
      );
    }

    cached = parsed.data;
    return cached;
  };
}
