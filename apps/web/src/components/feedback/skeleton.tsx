import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/**
 * Usage: `<Skeleton className="h-4 w-48" />` — size it to match the
 * content it's standing in for.
 *
 * Uses `muted`, not a tinted `primary` — a loading placeholder is neutral
 * chrome, not a brand moment (Brand Guidelines §7: "one primary action per
 * view; if everything is blue, nothing is").
 *
 * Note: prefer a real loading state that explains *what* is loading where
 * one is available (Brand Guidelines §12 "progress honesty" — e.g. "the
 * loading state of an analysis explains what is being analyzed"; see
 * `EmptyState`/`Progress` for staged, truthful progress). `Skeleton` is
 * for short, generic waits where per-stage messaging isn't meaningful.
 */
function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      role="status"
      aria-label="Loading"
      {...props}
    />
  );
}

export { Skeleton };
