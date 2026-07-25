import { Download } from 'lucide-react';

import { ConfidenceIndicator } from '@/components/ConfidenceIndicator';
import { Button } from '@/components/ui/button';

import type { AnalysisMetadata } from '../types';

import { CopyReportLinkButton } from './CopyReportLinkButton';

export interface ReportHeaderProps {
  readonly candidateLogin: string | null;
  readonly metadata: AnalysisMetadata;
}

interface Stat {
  readonly label: string;
  readonly value: string;
}

/**
 * The report's cover: everything a recruiter needs in one glance before
 * reading further — who this is, how much evidence backs it, how confident
 * the assessment is, and when it was produced. No card, no border — this is
 * the top of a document, not a widget.
 */
export function ReportHeader({ candidateLogin, metadata }: ReportHeaderProps) {
  const lastAnalysis = metadata.completedAt
    ? new Date(metadata.completedAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Not yet complete';

  const stats: readonly Stat[] = [
    {
      label: 'Repositories',
      value: String(metadata.repositoryCount),
    },
    {
      label: 'Evidence items',
      value: String(metadata.evidenceCount),
    },
    { label: 'Last analysis', value: lastAnalysis },
  ];

  return (
    <header className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-caption font-mono">Engineering report</span>
          <h1 className="text-h1">
            {candidateLogin ? candidateLogin : 'Candidate engineering report'}
          </h1>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <CopyReportLinkButton />
          <Button type="button" variant="outline" size="sm" disabled title="Coming soon">
            <Download aria-hidden="true" />
            Export
          </Button>
        </div>
      </div>

      <dl className="flex flex-wrap gap-x-8 gap-y-3 border-y py-4">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col gap-0.5">
            <dt className="text-caption">{stat.label}</dt>
            <dd className="text-title">{stat.value}</dd>
          </div>
        ))}
        {metadata.confidence ? (
          <div className="flex flex-col gap-0.5">
            <dt className="text-caption">Assessment confidence</dt>
            <dd>
              <ConfidenceIndicator confidence={metadata.confidence} showDescription={false} />
            </dd>
          </div>
        ) : null}
      </dl>
    </header>
  );
}
