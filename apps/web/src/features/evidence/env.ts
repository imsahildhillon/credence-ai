import 'server-only';
import { z } from 'zod';

import { createLazyEnv } from '@/config/lazy-env';

/**
 * Shared secret authenticating the analysis-worker trigger endpoint.
 * Validated lazily so a missing value never blocks app boot — only the
 * trigger route refuses to run (CLAUDE.md §9.6).
 *
 * Generate with: `openssl rand -hex 32`.
 */
const EvidenceWorkerEnvSchema = z.object({
  WORKER_TRIGGER_SECRET: z.string().min(32, 'WORKER_TRIGGER_SECRET must be at least 32 characters'),
});

export type EvidenceWorkerEnv = Readonly<z.infer<typeof EvidenceWorkerEnvSchema>>;

export const getEvidenceWorkerEnv = createLazyEnv(EvidenceWorkerEnvSchema, 'analysis worker');
