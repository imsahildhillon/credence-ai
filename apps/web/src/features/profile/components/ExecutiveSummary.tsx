import type { ConfidenceLevel, EngineeringSummarySection } from '../types';

import { Finding } from './Finding';

export interface ExecutiveSummaryProps {
  readonly data: EngineeringSummarySection;
}

const MAX_FINDINGS = 5;

const CONFIDENCE_RANK: Readonly<Record<ConfidenceLevel, number>> = {
  high: 2,
  moderate: 1,
  preliminary: 0,
};

/**
 * Chapter 1 — Executive Summary. Every finding is a single, evidence-backed
 * sentence — never the free-form AI paragraph the old Engineering Summary
 * rendered. Capped at five: the report leads with its strongest, best-
 * evidenced observations, not an exhaustive list (mission: "never write
 * long AI paragraphs").
 */
export function ExecutiveSummary({ data }: ExecutiveSummaryProps) {
  const findings = [...data.strengths, ...data.growthAreas]
    .sort((a, b) => {
      const confidenceDelta = CONFIDENCE_RANK[b.confidence] - CONFIDENCE_RANK[a.confidence];
      return confidenceDelta !== 0 ? confidenceDelta : b.evidence.length - a.evidence.length;
    })
    .slice(0, MAX_FINDINGS);

  if (findings.length === 0) {
    return (
      <p className="text-caption">
        No individually cited findings yet — see the capability matrix below for the full
        evidence-backed assessment.
      </p>
    );
  }

  return (
    <div className="flex flex-col">
      {findings.map((finding, index) => (
        <Finding
          key={`${finding.skillName}-${index}`}
          title={finding.text}
          skillName={finding.skillName}
          confidence={finding.confidence}
          evidence={finding.evidence}
        />
      ))}
    </div>
  );
}
