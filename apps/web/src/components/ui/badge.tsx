import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Usage: `<Badge variant="strength">Verified</Badge>`
 *
 * Variants: `default` (primary) · `secondary` · `outline` · the four
 * reserved semantic accents — `strength` / `growth` / `alert` / `ai` —
 * for evidence-bearing labels (verified signals, opportunity flags,
 * integrity/destructive flags, AI-generated markers). Reach for a
 * semantic variant instead of `default` whenever the badge is
 * communicating one of those specific meanings (Brand Guidelines §7).
 *
 * Accessibility: renders as a `<span>`; if the badge conveys status that
 * isn't otherwise in the surrounding text, pair it with a visually hidden
 * label or `aria-label` — color alone must never be the only signal.
 */
const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground shadow-sm hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline: 'text-foreground',
        strength: 'border-transparent bg-strength text-strength-foreground',
        growth: 'border-transparent bg-growth text-growth-foreground',
        alert: 'border-transparent bg-alert text-alert-foreground',
        ai: 'border-transparent bg-ai text-ai-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
