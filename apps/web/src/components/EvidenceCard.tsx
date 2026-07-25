import { ExternalLink } from 'lucide-react';
import * as React from 'react';

import { AiContentMarker } from '@/components/AiContentMarker';
import { ConfidenceIndicator } from '@/components/ConfidenceIndicator';
import type { Database } from '@/lib/supabase/types';
import { cn } from '@/lib/utils';

type ConfidenceLevel = Database['public']['Enums']['confidence_level'];

const CONFIDENCE_LABEL: Readonly<Record<ConfidenceLevel, string>> = {
  high: 'High confidence',
  moderate: 'Moderate confidence',
  preliminary: 'Preliminary confidence',
};

/** The minimal shape a piece of evidence needs to be linkable from a claim. */
export interface EvidenceCardRef {
  readonly id: string;
  readonly label: string;
  readonly href: string | null;
}

export interface EvidenceCardProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly title?: string;
  readonly claim: string;
  readonly confidence: ConfidenceLevel;
  /** Non-empty by the type system — a claim cannot be rendered without at least one evidence reference. */
  readonly evidenceRefs: readonly [EvidenceCardRef, ...EvidenceCardRef[]];
  readonly strengths?: readonly string[];
  readonly growthAreas?: readonly string[];
}

/**
 * Renders a claim with its evidence and confidence together, in reasoning
 * order (context → evidence → interpretation → confidence), and makes it
 * *impossible* to render one without the other two (CLAUDE.md §11.1) — there
 * is no prop that lets a caller skip `evidenceRefs` or `confidence`, and
 * `evidenceRefs` is typed as a non-empty tuple, so an empty array is a
 * compile error, not a runtime check a caller could bypass.
 *
 * Accessibility: the claim, its confidence, and its evidence trail sit in
 * one landmark so a screen reader announces them together, matching the
 * explainability promise rather than a soup of disconnected fragments
 * (CLAUDE.md §13.4).
 */
export function EvidenceCard({
  title,
  claim,
  confidence,
  evidenceRefs,
  strengths,
  growthAreas,
  className,
  ...props
}: EvidenceCardProps) {
  return (
    <div className={cn('flex flex-col gap-4', className)} {...props}>
      {title ? <h3 className="text-title">{title}</h3> : null}

      <AiContentMarker
        context={`${evidenceRefs.length} evidence item${evidenceRefs.length === 1 ? '' : 's'} · ${CONFIDENCE_LABEL[confidence]}`}
      >
        <p>{claim}</p>

        {strengths && strengths.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-1">
            {strengths.map((strength) => (
              <li key={strength} className="flex items-start gap-2 text-sm">
                <span
                  aria-hidden="true"
                  className="bg-strength mt-1.5 size-1.5 shrink-0 rounded-full"
                />
                {strength}
              </li>
            ))}
          </ul>
        ) : null}

        {growthAreas && growthAreas.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-1">
            {growthAreas.map((growthArea) => (
              <li key={growthArea} className="flex items-start gap-2 text-sm">
                <span
                  aria-hidden="true"
                  className="bg-growth mt-1.5 size-1.5 shrink-0 rounded-full"
                />
                {growthArea}
              </li>
            ))}
          </ul>
        ) : null}
      </AiContentMarker>

      <ConfidenceIndicator confidence={confidence} />

      <div className="flex flex-col gap-1.5">
        <h4 className="text-caption font-medium">Evidence ({evidenceRefs.length})</h4>
        <ul className="flex flex-col gap-1">
          {evidenceRefs.map((ref) => (
            <li key={ref.id}>
              {ref.href ? (
                <a
                  href={ref.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-code hover:text-primary focus-visible:outline-focus inline-flex items-center gap-1.5 underline decoration-dotted underline-offset-2"
                >
                  {ref.label}
                  <ExternalLink aria-hidden="true" className="size-3 shrink-0" />
                  <span className="sr-only">(opens on GitHub in a new tab)</span>
                </a>
              ) : (
                <span className="text-code">{ref.label}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
