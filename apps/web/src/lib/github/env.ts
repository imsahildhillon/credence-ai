import 'server-only';
import { z } from 'zod';

import { createLazyEnv } from '@/config/lazy-env';

/**
 * GitHub integration environment configuration — validated lazily, not at
 * boot.
 *
 * These are the GitHub OAuth application's own client credentials (used
 * both for GitHub sign-in and for reading a candidate's repositories on
 * their behalf — CLAUDE.md §3: "GitHub identity is core to the product").
 * Auth.js's own session/JWT core (`NEXTAUTH_URL`, `NEXTAUTH_SECRET`) stays
 * in the eager `env.ts` schema so the app always boots; the GitHub
 * provider specifically can be configured after boot without blocking it.
 * Call `getGithubEnv()` wherever the GitHub OAuth provider or repository
 * client is actually constructed.
 */
const GithubEnvSchema = z.object({
  GITHUB_CLIENT_ID: z.string().min(1, 'GITHUB_CLIENT_ID is required'),
  GITHUB_CLIENT_SECRET: z.string().min(1, 'GITHUB_CLIENT_SECRET is required'),
});

export type GithubEnv = Readonly<z.infer<typeof GithubEnvSchema>>;

export const getGithubEnv = createLazyEnv(GithubEnvSchema, 'GitHub integration');
