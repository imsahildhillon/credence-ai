import { ConfidenceIndicator } from '@/components/ConfidenceIndicator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { AnalysisMetadata as AnalysisMetadataData } from '../types';

export interface AnalysisMetadataProps {
  readonly metadata: AnalysisMetadataData;
}

const STATUS_LABEL: Readonly<Record<AnalysisMetadataData['status'], string>> = {
  queued: 'Queued',
  processing: 'Processing',
  completed: 'Complete',
  partial: 'Partially complete',
  failed: 'Failed',
};

/**
 * Section 9 — Analysis Metadata. Every value here is a stored fact about
 * the analysis run — model, prompt version, pipeline version, and
 * timestamp are exactly what `features/analysis` persisted for
 * reproducibility (CLAUDE.md §14.4). The confidence methodology paragraph
 * is static, human-written copy describing how confidence bands are
 * derived (see ADR-007) — it is not generated per profile.
 */
export function AnalysisMetadata({ metadata }: AnalysisMetadataProps) {
  const rows: readonly { readonly label: string; readonly value: string }[] = [
    { label: 'Analysis status', value: STATUS_LABEL[metadata.status] },
    { label: 'Pipeline version', value: metadata.pipelineVersion ?? 'not recorded' },
    { label: 'Prompt version', value: metadata.promptVersion ?? 'not recorded' },
    { label: 'Model', value: metadata.model ?? 'not recorded' },
    {
      label: 'Analyzed on',
      value: metadata.completedAt
        ? new Date(metadata.completedAt).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })
        : 'not yet complete',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Analysis metadata</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex justify-between gap-2 border-b py-1.5 sm:border-none sm:py-0"
            >
              <dt className="text-caption">{row.label}</dt>
              <dd className="text-code">{row.value}</dd>
            </div>
          ))}
        </dl>

        {metadata.confidence ? (
          <div className="flex flex-col gap-1">
            <span className="text-caption">Overall confidence</span>
            <ConfidenceIndicator confidence={metadata.confidence} />
          </div>
        ) : null}

        <div className="flex flex-col gap-1 border-t pt-4">
          <p className="text-caption">
            Confidence bands are derived from the model&apos;s graded self-assessment, capped by how
            much evidence actually supports each skill — a handful of commits can never produce a
            &quot;high&quot; confidence rating, regardless of how the model scores it.
          </p>
          <p className="text-body font-medium">
            Assessment generated using validated evaluation pipeline.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
