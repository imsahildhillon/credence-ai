/**
 * Public interface of the assessment feature (CLAUDE.md §4 — cross-feature
 * access goes through this file, never into internals).
 */
export { PIPELINE_VERSION, runSkillAssessment } from './service';
export { PROMPT_VERSION } from './prompt';
export type {
  AssessmentResult,
  AssessmentSuccess,
  AssessmentLevel,
  ConfidenceLevel,
  StageFailure,
} from './types';
