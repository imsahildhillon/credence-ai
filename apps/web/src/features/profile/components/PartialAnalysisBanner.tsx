import { AlertTriangle } from 'lucide-react';

export interface PartialAnalysisBannerProps {
  readonly message: string;
}

/**
 * CLAUDE.md §19.5: "partial failure is honest failure" — when an analysis
 * completed with `status: 'partial'`, the profile says exactly what was
 * excluded and why, in place, rather than presenting a degraded report as
 * complete. `message` is `analyses.error_message`, the same persisted text
 * `/analysis` would show — never re-derived or paraphrased here.
 *
 * This is a process fact about the run, not an assessment of the person
 * (Brand Guidelines §7), so it stays off the reserved `alert` token; the
 * icon alone signals "reduced," with the label carrying the meaning for
 * anyone who can't see color.
 */
export function PartialAnalysisBanner({ message }: PartialAnalysisBannerProps) {
  return (
    <div
      role="status"
      className="border-border bg-muted/40 flex items-start gap-3 rounded-lg border px-4 py-3"
    >
      <AlertTriangle aria-hidden="true" className="text-muted-foreground mt-0.5 size-4 shrink-0" />
      <p className="text-caption">
        <span className="text-foreground font-medium">This profile is partially complete.</span>{' '}
        {message}
      </p>
    </div>
  );
}
