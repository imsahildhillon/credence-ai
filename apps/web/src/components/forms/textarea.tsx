import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Usage: `<Label htmlFor="notes">Notes</Label><Textarea id="notes" />`
 *
 * No variants; height grows from a `min-h-[60px]` baseline via `rows` or
 * `className`. Same labeling and `aria-invalid` conventions as `Input`.
 */
const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        'flex min-h-15 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-alert aria-invalid:ring-alert md:text-sm',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';

export { Textarea };
