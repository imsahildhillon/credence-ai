import { Sparkles } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

export interface AiContentMarkerProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly children: React.ReactNode;
  /**
   * The evidence-grounded context for this specific assessment — e.g.
   * "4 evidence items · High confidence". Callers with that data on hand
   * should always pass it; it is what a reader should see instead of a bare
   * "AI-generated" badge (AI Principles: explain confidence, not AI).
   */
  readonly context?: string;
}

/**
 * Wraps every AI-generated string end to end (CLAUDE.md §11.1, §17.12) — no
 * AI text renders outside it anywhere in the product. The pipeline marks
 * generated content (`ai_generated`), and this component is the one place
 * that marker becomes visible, so the schema, the service layer, and the UI
 * always agree on what's AI-authored and what's structural fact.
 *
 * The visible label reads "Assessment" (the product's own domain word,
 * CLAUDE.md §5), not "AI-generated" — the violet `ai` token and icon are
 * themselves the AI-content marker (Brand Guidelines §7); the *words* lead
 * with the evidence that grounds the assessment instead of the fact that a
 * model wrote it. Disclosure is preserved via `aria-label`.
 *
 * `strength`/`growth`/`alert` are reserved for evidence-derived signals
 * (Brand Guidelines §7) — this uses `ai` (violet), the one token reserved
 * for AI-generated content, matching `ConfidenceIndicator`.
 */
export function AiContentMarker({ className, children, context, ...props }: AiContentMarkerProps) {
  return (
    <div
      className={cn('border-ai/30 bg-ai/5 rounded-lg border py-3 pr-4 pl-3', className)}
      {...props}
    >
      <div className="text-ai mb-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs font-medium">
        <Sparkles aria-hidden="true" className="size-3.5" />
        Assessment
        {context ? <span className="text-muted-foreground font-normal">· {context}</span> : null}
        <span className="sr-only"> (AI-generated)</span>
      </div>
      <div className="text-body">{children}</div>
    </div>
  );
}
