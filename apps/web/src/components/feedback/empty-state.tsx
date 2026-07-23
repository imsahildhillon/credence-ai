import * as React from 'react';

import { cn } from '@/lib/utils';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  /** Primary call to action, e.g. a `<Button>`. */
  action?: React.ReactNode;
  /** Secondary, lower-emphasis action rendered below `action`. */
  secondaryAction?: React.ReactNode;
}

/**
 * Usage:
 * ```
 * <EmptyState
 *   icon={<FolderGit2 />}
 *   title="No repositories connected yet"
 *   description="Connect GitHub to see which of your projects light up your credibility report."
 *   action={<Button>Connect GitHub</Button>}
 * />
 * ```
 *
 * A designed state, not a placeholder (Brand Guidelines §11: "the empty
 * state of a student profile is a motivational onboarding moment"). This
 * component is presentation-only — it takes no opinion on *what* is
 * empty; supply the specific, evidence-oriented copy for that context at
 * the call site.
 *
 * Accessibility: `title` renders as a heading-weight element; `icon` is
 * decorative (`aria-hidden`) — any meaning it carries must also be in
 * `title`/`description`, never conveyed by the icon alone.
 */
const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, icon, title, description, action, secondaryAction, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-12 text-center',
        className,
      )}
      {...props}
    >
      {icon ? (
        <div className="text-muted-foreground [&_svg]:size-8" aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <p className="text-title">{title}</p>
      {description ? <p className="text-caption max-w-sm">{description}</p> : null}
      {action || secondaryAction ? (
        <div className="mt-2 flex flex-col items-center gap-2">
          {action}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  ),
);
EmptyState.displayName = 'EmptyState';

export { EmptyState };
