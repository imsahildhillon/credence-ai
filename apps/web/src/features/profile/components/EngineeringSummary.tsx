import { AiContentMarker } from '@/components/AiContentMarker';
import { EvidenceCard } from '@/components/EvidenceCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { EngineeringSummarySection as EngineeringSummarySectionData } from '../types';

import { toEvidenceCardRefs } from './evidence-ref';

export interface EngineeringSummaryProps {
  readonly data: EngineeringSummarySectionData;
}

/**
 * Section 1 — Engineering Summary. The narrative paragraph is
 * AI-authored (wrapped in `AiContentMarker`); every strength and growth
 * area beneath it is rendered through the shared `EvidenceCard`, so none
 * of them can appear without the evidence that grounds them (CLAUDE.md
 * §11.1 — "no unsupported claims" is enforced by the component's type,
 * not by review discipline).
 */
export function EngineeringSummary({ data }: EngineeringSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Engineering summary</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <AiContentMarker>
          <p>{data.summary}</p>
        </AiContentMarker>

        {data.strengths.length > 0 ? (
          <div className="flex flex-col gap-3">
            <h3 className="text-title">Strengths</h3>
            <div className="flex flex-col gap-4">
              {data.strengths.map((claim, index) => (
                <EvidenceCard
                  // A claim's identity is the (skill, text) pair — stable
                  // across renders of this same analysis, and unique
                  // within this list since a skill's strengths are
                  // themselves distinct sentences.
                  key={`${claim.skillName}-${index}`}
                  title={claim.skillName}
                  claim={claim.text}
                  confidence={claim.confidence}
                  evidenceRefs={toEvidenceCardRefs(claim.evidence)}
                />
              ))}
            </div>
          </div>
        ) : null}

        {data.growthAreas.length > 0 ? (
          <div className="flex flex-col gap-3">
            <h3 className="text-title">Growth areas</h3>
            <div className="flex flex-col gap-4">
              {data.growthAreas.map((claim, index) => (
                <EvidenceCard
                  key={`${claim.skillName}-${index}`}
                  title={claim.skillName}
                  claim={claim.text}
                  confidence={claim.confidence}
                  evidenceRefs={toEvidenceCardRefs(claim.evidence)}
                />
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
