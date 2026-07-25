import { ChevronDown } from 'lucide-react';

import { AiContentMarker } from '@/components/AiContentMarker';
import { ConfidenceIndicator } from '@/components/ConfidenceIndicator';
import { EvidenceCard } from '@/components/EvidenceCard';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { AssessmentLevel, SkillCard as SkillCardData } from '../types';

import { toEvidenceCardRefsOrNull } from './evidence-ref';
import { TrackedDetails } from './TrackedDetails';

const LEVEL_LABEL: Readonly<Record<AssessmentLevel, string>> = {
  strong: 'Strong',
  developing: 'Developing',
  not_yet_assessed: 'Not yet assessed',
};

/**
 * `strong` maps to the `strength` token and `developing` to `growth` —
 * both are the tokens' literal reserved meanings (verified strong signal;
 * a gap framed as opportunity, never a warning). `not_yet_assessed` is
 * neutral, not negative, so it gets no semantic color at all (CLAUDE.md
 * §12.2 — `alert` never represents any assessment of a person).
 */
const LEVEL_VARIANT: Readonly<Record<AssessmentLevel, BadgeProps['variant']>> = {
  strong: 'strength',
  developing: 'growth',
  not_yet_assessed: 'outline',
};

export interface SkillCardsProps {
  readonly skillCards: readonly SkillCardData[];
}

/**
 * Section 2 — Skill Cards. Collapsed by default (native `<details>` — no
 * client JS needed for the expand/collapse itself, matching "minimal, no
 * flashy animations"); expanding a card reveals its `assessment_evidence`
 * directly, exactly as the spec requires, via the same `EvidenceCard` used
 * throughout the profile so a skill's claim can never be shown without its
 * evidence and confidence.
 */
export function SkillCards({ skillCards }: SkillCardsProps) {
  if (skillCards.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Skills</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-caption">No skills have been assessed from this analysis yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {skillCards.map((card) => {
        const evidenceRefs = toEvidenceCardRefsOrNull(card.evidence);
        return (
          <Card key={card.assessmentId}>
            <TrackedDetails skillSlug={card.skillSlug} className="group">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-6 [&::-webkit-details-marker]:hidden">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-title">{card.skillName}</h3>
                    <Badge variant={LEVEL_VARIANT[card.level]}>{LEVEL_LABEL[card.level]}</Badge>
                  </div>
                  <ConfidenceIndicator confidence={card.confidence} showDescription={false} />
                  <p className="text-caption">
                    {card.evidence.length} piece{card.evidence.length === 1 ? '' : 's'} of evidence
                  </p>
                </div>
                <ChevronDown
                  aria-hidden="true"
                  className="mt-1 size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                />
              </summary>

              <CardContent className="flex flex-col gap-4 pt-0">
                <AiContentMarker>
                  <p>{card.reasoning}</p>
                </AiContentMarker>

                {evidenceRefs ? (
                  <EvidenceCard
                    claim={`Cited evidence for ${card.skillName.toLowerCase()}`}
                    confidence={card.confidence}
                    evidenceRefs={evidenceRefs}
                    strengths={card.strengths}
                    growthAreas={card.growthAreas}
                  />
                ) : (
                  <p className="text-caption">
                    No linked evidence is available for this assessment — this shouldn&apos;t
                    happen; please contact support if you see this.
                  </p>
                )}
              </CardContent>
            </TrackedDetails>
          </Card>
        );
      })}
    </div>
  );
}
