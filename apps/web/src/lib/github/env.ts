import 'server-only';
import { z } from 'zod';

import { createLazyEnv } from '@/config/lazy-env';

/**
 * GitHub integration environment configuration — validated lazily, not at
 * boot.
 *
 * These are a *separate* GitHub OAuth application's credentials, used only
 * for reading a candidate's repositories on their behalf once granted
 * (PRD FR-1.2's private-repo escalation and the github-analysis pipeline)
 * — not the student sign-in flow, which goes through the GitHub provider
 * configured directly in the Supabase dashboard (ADR-001,
 * apps/web/src/features/auth/README.md). Kept lazy so a missing
 * repository-access credential never blocks app boot.
 * Call `getGithubEnv()` wherever that repository client is constructed.
 */
const GithubEnvSchema = z.object({
  GITHUB_CLIENT_ID: z.string().min(1, 'GITHUB_CLIENT_ID is required'),
  GITHUB_CLIENT_SECRET: z.string().min(1, 'GITHUB_CLIENT_SECRET is required'),
});

export type GithubEnv = Readonly<z.infer<typeof GithubEnvSchema>>;

export const getGithubEnv = createLazyEnv(GithubEnvSchema, 'GitHub integration');
