'use client';

import type { ComponentPropsWithoutRef } from 'react';

import { trackEvidenceExpandedAction } from '@/features/analytics/server/actions';

export interface TrackedDetailsProps extends ComponentPropsWithoutRef<'details'> {
  readonly skillSlug: string;
}

/**
 * A `<details>` that records `evidence_expanded` the first time it opens —
 * the one client-side interaction the analytics spec asks for (beta-
 * readiness §8). `useEffect` isn't involved: this reports a genuine user
 * action (opening), not a render, so a plain event handler is correct
 * (CLAUDE.md §8.3).
 */
export function TrackedDetails({ skillSlug, onToggle, ...props }: TrackedDetailsProps) {
  return (
    <details
      {...props}
      onToggle={(event) => {
        onToggle?.(event);
        if (event.currentTarget.open) {
          void trackEvidenceExpandedAction(skillSlug);
        }
      }}
    />
  );
}
