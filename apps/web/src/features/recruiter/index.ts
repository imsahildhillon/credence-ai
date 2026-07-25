import 'server-only';

/**
 * Public interface of the `recruiter` feature (CLAUDE.md §4).
 */
export { getRecruiterSession } from './server/auth';
export {
  setCandidateStatusAction,
  toggleBookmarkAction,
  updateNoteAction,
} from './server/actions';
export { getCandidateList, getCandidateProfile, listShortlist } from './server/service';
export { CandidateListSearchParamsSchema } from './schemas';
export type { CandidateListSearchParams } from './schemas';
export type {
  CandidateListItem,
  CandidateListSort,
  CandidateStatus,
  CandidateTracking,
} from './types';
export type { CandidateProfileForRecruiter } from './server/service';
