import 'server-only';

/**
 * Public interface of the evidence pipeline (CLAUDE.md §4). The only
 * consumer is `features/pipeline`'s orchestrator — everything else in this
 * feature (client, mapper, service, queries, link-liveness) stays internal.
 */
export { ingestAnalysisEvidence } from './worker';
export type { IngestionResult, StageFailure } from './types';
