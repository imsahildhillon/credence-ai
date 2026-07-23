import * as SeparatorPrimitive from '@radix-ui/react-separator';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Usage: `<Separator />` (horizontal, default) or `<Separator orientation="vertical" />`.
 *
 * A quiet content divider (Brand Guidelines §10: "the grid is quiet") —
 * uses `--border`, deliberately subtle. No variants.
 *
 * Accessibility: `decorative` defaults to `true` (removed from the
 * accessibility tree via `role="none"`, per Radix). Set `decorative={false}`
 * only when the separator carries real semantic meaning for a screen
 * reader (rare — most dividers are purely visual).
 */
const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(({ className, orientation = 'horizontal', decorative = true, ...props }, ref) => (
  <SeparatorPrimitive.Root
    ref={ref}
    decorative={decorative}
    orientation={orientation}
    className={cn(
      'shrink-0 bg-border',
      orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
      className,
    )}
    {...props}
  />
));
Separator.displayName = SeparatorPrimitive.Root.displayName;

export { Separator };
