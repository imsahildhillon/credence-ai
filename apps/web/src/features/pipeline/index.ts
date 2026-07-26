import 'server-only';

/**
 * Public interface of the pipeline orchestrator (CLAUDE.md §4). This is the
 * only module `workers/analysis-worker.ts` (and the manual `/run` escape
 * hatch route) may call — everything else in this feature is internal.
 */
export { runAnalysisLifecycle, runNextAnalysis } from './orchestrator';
export type { LifecycleSummary } from './types';
