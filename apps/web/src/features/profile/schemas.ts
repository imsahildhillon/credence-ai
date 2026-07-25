import { z } from 'zod';

/**
 * Boundary validation for the Evidence Explorer's URL search params
 * (CLAUDE.md §6.7 — all external input, including query strings, is
 * Zod-validated once at the boundary). The explorer is server-rendered and
 * filters via plain links, so `searchParams` is the entire "form" a visitor
 * can manipulate — anything outside this schema is ignored, not trusted.
 */
export const EvidenceSourceTypeFilterSchema = z.enum([
  'repository',
  'commit',
  'pull_request',
  'review',
  'issue',
  'release',
  'contributor',
]);

export const EvidenceExplorerSearchParamsSchema = z.object({
  kind: EvidenceSourceTypeFilterSchema.optional(),
  repository: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export type EvidenceExplorerSearchParams = z.infer<typeof EvidenceExplorerSearchParamsSchema>;
