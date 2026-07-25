import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import type { Database } from '@/lib/supabase/types';
import { cn } from '@/lib/utils';

type ConfidenceLevel = Database['public']['Enums']['confidence_level'];

const CONFIDENCE_LABEL: Readonly<Record<ConfidenceLevel, string>> = {
  high: 'High confidence',
  moderate: 'Moderate confidence',
  preliminary: 'Preliminary confidence',
};

const CONFIDENCE_DESCRIPTION: Readonly<Record<ConfidenceLevel, string>> = {
  high: 'Backed by substantial, direct evidence.',
  moderate: 'Backed by some direct evidence, with room to grow.',
  preliminary: 'Backed by limited evidence so far.',
};

export interface ConfidenceIndicatorProps extends React.HTMLAttributes<HTMLSpanElement> {
  readonly confidence: ConfidenceLevel;
  /** Omit the description line for tight spaces (e.g. inline in a table cell). */
  readonly showDescription?: boolean;
}

/**
 * The only way confidence is ever displayed (CLAUDE.md §11.1) — no call
 * site restyles this per-instance. Confidence always renders with the `ai`
 * semantic token, never `strength`/`growth`/`alert`: CLAUDE.md §12.2
 * reserves violet specifically for "AI-generated-content markers and
 * confidence indicators," which is a deliberate choice to keep confidence
 * (a property of the *assessment process*) visually distinct from
 * `strength`/`growth` (properties of the *evidence itself*) — a reader
 * should never mistake "we are confident" for "this is a strong skill".
 *
 * Accessibility: the band name is always visible text, never color-only
 * (Brand Guidelines §7.5); `showDescription` surfaces the plain-language
 * methodology inline rather than behind a hover-only tooltip, so keyboard
 * and touch users get the same explanation without extra interaction.
 */
export function ConfidenceIndicator({
  confidence,
  showDescription = true,
  className,
  ...props
}: ConfidenceIndicatorProps) {
  return (
    <span className={cn('inline-flex flex-col gap-0.5', className)} {...props}>
      <Badge variant="ai" className="w-fit">
        {CONFIDENCE_LABEL[confidence]}
      </Badge>
      {showDescription ? (
        <span className="text-caption">{CONFIDENCE_DESCRIPTION[confidence]}</span>
      ) : null}
    </span>
  );
}
