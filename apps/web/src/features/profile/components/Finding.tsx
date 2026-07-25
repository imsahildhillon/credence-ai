import { ChevronDown } from 'lucide-react';

import { ConfidenceIndicator } from '@/components/ConfidenceIndicator';
import { EvidenceCard } from '@/components/EvidenceCard';

import type { ConfidenceLevel, EvidenceEntry } from '../types';

import { toEvidenceCardRefs } from './evidence-ref';

export interface FindingProps {
  readonly title: string;
  readonly skillName: string;
  readonly confidence: ConfidenceLevel;
  readonly evidence: readonly [EvidenceEntry, ...EvidenceEntry[]];
}

/**
 * One executive-summary finding: Title → Confidence → Evidence count →
 * Repository count at a glance, expanding to the same `EvidenceCard` used
 * everywhere else in the report — so a finding can never be shown without
 * the evidence and confidence behind it (CLAUDE.md §11.1). Native
 * `<details>`: no client JS for the disclosure itself.
 */
export function Finding({ title, skillName, confidence, evidence }: FindingProps) {
  const repositoryCount = new Set(
    evidence.flatMap((item) => (item.repositoryFullName ? [item.repositoryFullName] : [])),
  ).size;

  return (
    <details className="group border-b py-4 last:border-b-0">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
        <div className="flex flex-col gap-1.5">
          <span className="text-caption">{skillName}</span>
          <p className="text-title">{title}</p>
          <div className="text-caption flex flex-wrap items-center gap-x-3 gap-y-1">
            <ConfidenceIndicator confidence={confidence} showDescription={false} />
            <span>
              {evidence.length} evidence item{evidence.length === 1 ? '' : 's'}
            </span>
            {repositoryCount > 0 ? (
              <span>
                {repositoryCount} repositor{repositoryCount === 1 ? 'y' : 'ies'}
              </span>
            ) : null}
          </div>
        </div>
        <ChevronDown
          aria-hidden="true"
          className="mt-1 size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
        />
      </summary>

      <div className="pt-4">
        <EvidenceCard claim={title} confidence={confidence} evidenceRefs={toEvidenceCardRefs(evidence)} />
      </div>
    </details>
  );
}
