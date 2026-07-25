import 'server-only';

/**
 * Public interface of the `profile` feature (CLAUDE.md §4).
 */
export { getProfileForCurrentUser, getProfileForRecruiter } from './server/service';
export { EvidenceExplorerSearchParamsSchema } from './schemas';
export type { EvidenceExplorerSearchParams } from './schemas';
export type { ProfileData, ProfileResult } from './types';
