import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Usage: `<Label htmlFor="email">Email</Label><Input id="email" type="email" />`
 *
 * No variants. Always pair with a `Label` (CLAUDE.md §13.7) — a
 * placeholder is not a label. For validation errors, set
 * `aria-invalid="true"` and `aria-describedby` pointing at the error
 * message element (CLAUDE.md §13.7: errors must be described in text and
 * announced, not shown by color alone).
 *
 * Accessibility: native `<input>` — inherits all standard keyboard and
 * screen-reader behavior. `disabled` uses the native attribute.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-alert aria-invalid:ring-alert md:text-sm',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export { Input };
