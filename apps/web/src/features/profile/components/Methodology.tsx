import { ConfidenceIndicator } from '@/components/ConfidenceIndicator';

import type { AnalysisMetadata as AnalysisMetadataData } from '../types';

export interface MethodologyProps {
  readonly metadata: AnalysisMetadataData;
}

const STATUS_LABEL: Readonly<Record<AnalysisMetadataData['status'], string>> = {
  queued: 'Queued',
  ingesting: 'Ingesting repositories',
  assessing: 'Assessing skills',
  finalizing: 'Finalizing report',
  processing: 'Processing',
  completed: 'Complete',
  partial: 'Partially complete',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

/**
 * Chapter 7 — Methodology. Every value here is a stored fact about the
 * analysis run — model, prompt version, pipeline version, and timestamp are
 * exactly what `features/analysis` persisted for reproducibility (CLAUDE.md
 * §14.4). The qualitative "what confidence means" explanation lives in
 * Assessment Boundaries instead — this chapter is facts only.
 */
export function Methodology({ metadata }: MethodologyProps) {
  const rows: readonly { readonly label: string; readonly value: string }[] = [
    { label: 'Analysis status', value: STATUS_LABEL[metadata.status] },
    { label: 'Repositories analyzed', value: String(metadata.repositoryCount) },
    { label: 'Evidence items', value: String(metadata.evidenceCount) },
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
    <div className="flex flex-col gap-4">
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
    </div>
  );
}
