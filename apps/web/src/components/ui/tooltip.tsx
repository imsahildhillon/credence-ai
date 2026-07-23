'use client';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Usage:
 * ```
 * <TooltipProvider>
 *   <Tooltip>
 *     <TooltipTrigger asChild><Button>Hover me</Button></TooltipTrigger>
 *     <TooltipContent>Helper text</TooltipContent>
 *   </Tooltip>
 * </TooltipProvider>
 * ```
 * Mount one `TooltipProvider` near the app root — it need not wrap every
 * individual tooltip.
 *
 * Icons never appear without an accessible label in this product
 * (Brand Guidelines §9) — a tooltip on an icon-only button is often the
 * label mechanism, not a decorative extra.
 *
 * Accessibility: Radix wires `aria-describedby` automatically between
 * trigger and content, and shows on both hover and keyboard focus (not
 * hover-only) — critical for keyboard users.
 */
const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-tooltip overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
