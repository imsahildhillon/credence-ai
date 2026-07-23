import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Usage: `<Spinner size="sm" label="Loading candidates" />`
 *
 * A standalone loading indicator for contexts `Button`'s built-in
 * `loading` prop doesn't cover (e.g. loading an entire panel/section).
 * Sizes: `sm` / `default` / `lg`. Color follows the current text color by
 * default (`currentColor`) so it matches its context; pass `className`
 * with a token color (e.g. `text-primary`) to override.
 *
 * Accessibility: `role="status"` with an always-present accessible name
 * (visually hidden by default via `label`) — a bare spinning icon
 * otherwise announces nothing to a screen reader.
 */
const spinnerVariants = cva('animate-spin text-current', {
  variants: {
    size: {
      sm: 'size-4',
      default: 'size-5',
      lg: 'size-6',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

export interface SpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof spinnerVariants> {
  /** Accessible name announced to screen readers (visually hidden). Defaults to "Loading". */
  label?: string;
}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size, label = 'Loading', ...props }, ref) => (
    <div ref={ref} role="status" className={cn('inline-flex', className)} {...props}>
      <Loader2 className={spinnerVariants({ size })} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  ),
);
Spinner.displayName = 'Spinner';

export { Spinner, spinnerVariants };
