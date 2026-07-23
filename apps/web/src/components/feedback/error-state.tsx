import { AlertCircle } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  /** Typically a retry action, e.g. `<Button onClick={retry}>Try again</Button>`. */
  action?: React.ReactNode;
}

/**
 * Usage:
 * ```
 * <ErrorState
 *   title="We couldn't finish analyzing this repository"
 *   description="Usually this means it's private or was moved. Re-check access, or skip it — your other 4 repositories are unaffected."
 *   action={<Button onClick={retry}>Try again</Button>}
 * />
 * ```
 *
 * Follows the brand's error-copy register (Brand Guidelines §4, §17):
 * calm, accountable, actionable — say what happened, the likely cause,
 * and the next step. Never blame the user, never leak internals. This
 * component is presentation-only; write that copy at the call site.
 *
 * Uses `alert` (not a bare red) since this is a genuine error — the one
 * legitimate use of that reserved token (Brand Guidelines §7).
 *
 * Accessibility: the container is `role="alert"` so assistive tech
 * announces it as soon as it mounts, without requiring focus.
 */
const ErrorState = React.forwardRef<HTMLDivElement, ErrorStateProps>(
  ({ className, icon, title, description, action, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(
        'flex flex-col items-center gap-3 rounded-lg border border-border px-6 py-12 text-center',
        className,
      )}
      {...props}
    >
      <div className="text-alert [&_svg]:size-8" aria-hidden="true">
        {icon ?? <AlertCircle />}
      </div>
      <p className="text-title">{title}</p>
      {description ? <p className="text-caption max-w-sm">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  ),
);
ErrorState.displayName = 'ErrorState';

export { ErrorState };
