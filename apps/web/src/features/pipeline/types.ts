/**
 * `IngestionResult`/`AssessmentResult` are declared where they're produced —
 * `features/evidence/types.ts` and `features/analysis/types.ts` — and this
 * module imports them, never the reverse (CLAUDE.md §4: this feature may
 * depend on evidence/analysis's public interfaces; they may never depend
 * on this one or on each other).
 */

export interface LifecycleSummary {
  readonly analysisId: string;
  readonly outcome: 'completed' | 'partial' | 'failed' | 'cancelled';
}
