'use client';

import * as ProgressPrimitive from '@radix-ui/react-progress';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Usage: `<Progress value={42} aria-label="Analyzing repositories" />`
 *
 * For long-running work (e.g. repository analysis), pair with real,
 * staged status text — "Analyzing repository 3 of 7" — rather than a bare
 * bar (Brand Guidelines §12: progress honesty; never a fake/indeterminate
 * bar when real stages are known).
 *
 * Accessibility: Radix sets `role="progressbar"` with `aria-valuenow` /
 * `aria-valuemin` / `aria-valuemax` from `value`. Always add `aria-label`
 * or `aria-labelledby` describing what's in progress.
 */
const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn('relative h-2 w-full overflow-hidden rounded-full bg-primary/20', className)}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 bg-primary transition-transform duration-medium ease-standard"
      style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
