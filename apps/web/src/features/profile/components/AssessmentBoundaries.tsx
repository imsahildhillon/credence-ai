import type { AnalysisMetadata, EvidenceEntry } from '../types';

export interface AssessmentBoundariesProps {
  readonly metadata: AnalysisMetadata;
  readonly evidence: readonly EvidenceEntry[];
}

/**
 * Chapter 6 — Assessment Boundaries. Every honest limit of this report,
 * gathered in one place instead of scattered across sections — transparency
 * builds trust, so this deliberately never uses the reserved `alert` token
 * and never frames a limit as a failure (mission: "never call these
 * risks").
 */
export function AssessmentBoundaries({ metadata, evidence }: AssessmentBoundariesProps) {
  const deadLinkCount = evidence.filter((item) => item.linkDead).length;

  return (
    <div className="flex flex-col gap-4">
      {metadata.partialMessage ? (
        <p className="text-body">
          <span className="text-foreground font-medium">This report is partially complete.</span>{' '}
          {metadata.partialMessage}
        </p>
      ) : null}

      {deadLinkCount > 0 ? (
        <p className="text-body">
          {deadLinkCount} piece{deadLinkCount === 1 ? '' : 's'} of evidence{' '}
          {deadLinkCount === 1 ? 'is' : 'are'} no longer reachable on GitHub — the underlying
          repository or content has since changed or been removed. These items still appear above
          for completeness, without a live link.
        </p>
      ) : null}

      <p className="text-body">
        Confidence bands reflect how much direct evidence supports a finding, not how well the
        candidate performed — a handful of commits can never produce a &quot;high&quot; confidence
        rating, regardless of the model&apos;s own self-assessment.
      </p>

      <p className="text-body">
        This report only reflects evidence from the repositories connected at analysis time.
        Work done outside those repositories, in private forks, or before account history began is
        not represented here.
      </p>
    </div>
  );
}
