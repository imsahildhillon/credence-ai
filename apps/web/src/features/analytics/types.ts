/**
 * Privacy-preserving product analytics (beta-readiness spec §8). Every
 * event name here has a matching `check` constraint on
 * `analytics_events.event_name` — the two lists must stay in sync.
 */
export type AnalyticsEventName =
  | 'profile_viewed'
  | 'evidence_expanded'
  | 'analysis_completed'
  | 'repository_connected';

/**
 * Metadata is intentionally small and structural — counts, kinds, IDs —
 * never repository contents, code, evidence text, or any candidate PII
 * (CLAUDE.md §20.4). Each event name's shape below is exhaustive; no event
 * accepts an arbitrary free-text field.
 */
export interface AnalyticsEventMetadata {
  readonly profile_viewed: {
    readonly analysisStatus: string;
  };
  readonly evidence_expanded: {
    readonly skillSlug: string;
  };
  readonly analysis_completed: {
    readonly analysisStatus: 'completed' | 'partial';
    readonly repositoryCount: number;
  };
  readonly repository_connected: {
    readonly repositoryCount: number;
  };
}
