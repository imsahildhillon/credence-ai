import { Sparkles } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

export interface AiContentMarkerProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly children: React.ReactNode;
}

/**
 * Wraps every AI-generated string end to end (CLAUDE.md §11.1, §17.12) — no
 * AI text renders outside it anywhere in the product. The pipeline marks
 * generated content (`ai_generated`), and this component is the one place
 * that marker becomes visible, so the schema, the service layer, and the UI
 * always agree on what's AI-authored and what's structural fact.
 *
 * `strength`/`growth`/`alert` are reserved for evidence-derived signals
 * (Brand Guidelines §7) — this uses `ai` (violet), the one token reserved
 * for AI-generated content, matching `ConfidenceIndicator`.
 *
 * Accessibility: the "AI-generated" label is real text (not an icon-only
 * marker), so it survives without color and is announced by screen readers
 * without extra ARIA.
 */
export function AiContentMarker({ className, children, ...props }: AiContentMarkerProps) {
  return (
    <div
      className={cn('border-ai/30 bg-ai/5 rounded-lg border py-3 pr-4 pl-3', className)}
      {...props}
    >
      <div className="text-ai mb-2 flex items-center gap-1.5 text-xs font-medium">
        <Sparkles aria-hidden="true" className="size-3.5" />
        AI-generated
      </div>
      <div className="text-body">{children}</div>
    </div>
  );
}
