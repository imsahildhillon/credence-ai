import Link from 'next/link';

import type { AnalysisMetadata } from '../types';

export interface ProvenanceBannerProps {
  readonly metadata: AnalysisMetadata;
}

/**
 * Section 9 trust improvement: every AI-generated section on this page
 * traces back to this one line — "Generated from: X repositories, Y
 * evidence items, Z assessment date" — plus a single, consistent entry
 * point into the full methodology (`#analysis-metadata`, this same
 * page's Section 9 detail). Counts are read straight off `AnalysisMetadata`
 * (CLAUDE.md §15.2: a bare number without provenance is a schema-review
 * rejection — these are the same counts persisted alongside the run, not
 * recomputed here), never invented client-side.
 */
export function ProvenanceBanner({ metadata }: ProvenanceBannerProps) {
  const assessedOn = metadata.completedAt
    ? new Date(metadata.completedAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'not yet complete';

  return (
    <div className="border-ai/30 bg-ai/5 flex flex-col gap-1 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-caption">
        Generated from{' '}
        <span className="text-foreground font-medium">
          {metadata.repositoryCount} repositor{metadata.repositoryCount === 1 ? 'y' : 'ies'}
        </span>
        ,{' '}
        <span className="text-foreground font-medium">
          {metadata.evidenceCount} evidence item{metadata.evidenceCount === 1 ? '' : 's'}
        </span>
        , assessed {assessedOn}.
      </p>
      <Link href="#analysis-metadata" className="text-ai text-caption font-medium hover:underline">
        Learn how this was generated
      </Link>
    </div>
  );
}
