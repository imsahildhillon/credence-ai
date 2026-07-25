import { ChevronDown } from 'lucide-react';

import { AiContentMarker } from '@/components/AiContentMarker';
import { ConfidenceIndicator } from '@/components/ConfidenceIndicator';
import { EvidenceCard } from '@/components/EvidenceCard';
import { Badge, type BadgeProps } from '@/components/ui/badge';

import type { AssessmentLevel, EvidenceEntry, SkillCard as SkillCardData } from '../types';

import { toEvidenceCardRefsOrNull } from './evidence-ref';
import { TrackedDetails } from './TrackedDetails';

const LEVEL_LABEL: Readonly<Record<AssessmentLevel, string>> = {
  strong: 'Strong',
  developing: 'Developing',
  not_yet_assessed: 'Not yet assessed',
};

const CONFIDENCE_LABEL: Readonly<Record<SkillCardData['confidence'], string>> = {
  high: 'High confidence',
  moderate: 'Moderate confidence',
  preliminary: 'Preliminary confidence',
};

/**
 * `strong` maps to the `strength` token and `developing` to `growth` —
 * both are the tokens' literal reserved meanings; `not_yet_assessed` is
 * neutral, not negative, so it gets no semantic color (CLAUDE.md §12.2 —
 * `alert` never represents any assessment of a person).
 */
const LEVEL_VARIANT: Readonly<Record<AssessmentLevel, BadgeProps['variant']>> = {
  strong: 'strength',
  developing: 'growth',
  not_yet_assessed: 'outline',
};

const MAX_REPRESENTATIVE_WORK = 3;

function repositoryBreakdown(
  evidence: readonly EvidenceEntry[],
): readonly { readonly repositoryFullName: string; readonly count: number }[] {
  const counts = new Map<string, number>();
  for (const item of evidence) {
    const name = item.repositoryFullName ?? 'Unknown repository';
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([repositoryFullName, count]) => ({ repositoryFullName, count }))
    .sort((a, b) => b.count - a.count);
}

function representativeWork(evidence: readonly EvidenceEntry[]): readonly EvidenceEntry[] {
  return [...evidence]
    .filter((item) => !item.linkDead && item.externalUrl)
    .sort((a, b) => (b.occurredAt ?? '').localeCompare(a.occurredAt ?? ''))
    .slice(0, MAX_REPRESENTATIVE_WORK);
}

export interface CapabilityMatrixProps {
  readonly skillCards: readonly SkillCardData[];
}

/**
 * Chapter 2 — Capability Matrix. Collapsed by default (native `<details>` —
 * no client JS for the toggle itself). Glance: level, confidence, evidence
 * count, repository distribution. Expand: observed behaviors, representative
 * work, supporting evidence, repository breakdown — every facet degrades to
 * nothing rather than a fabricated placeholder when the data isn't there
 * (mission: "no empty UI").
 */
export function CapabilityMatrix({ skillCards }: CapabilityMatrixProps) {
  if (skillCards.length === 0) {
    return (
      <p className="text-caption">No skills have been assessed from this analysis yet.</p>
    );
  }

  return (
    <div className="flex flex-col">
      {skillCards.map((card) => {
        const evidenceRefs = toEvidenceCardRefsOrNull(card.evidence);
        const repositories = repositoryBreakdown(card.evidence);
        const representative = representativeWork(card.evidence);

        return (
          <TrackedDetails
            key={card.assessmentId}
            skillSlug={card.skillSlug}
            className="group border-b py-5 last:border-b-0"
          >
            <summary className="flex cursor-pointer list-none items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-title">{card.skillName}</h3>
                  <Badge variant={LEVEL_VARIANT[card.level]}>{LEVEL_LABEL[card.level]}</Badge>
                </div>
                <ConfidenceIndicator confidence={card.confidence} showDescription={false} />
                <div className="text-caption flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>
                    {card.evidence.length} piece{card.evidence.length === 1 ? '' : 's'} of evidence
                  </span>
                  {repositories.length > 0 ? (
                    <span>
                      {repositories.length} repositor{repositories.length === 1 ? 'y' : 'ies'}
                    </span>
                  ) : null}
                </div>
              </div>
              <ChevronDown
                aria-hidden="true"
                className="mt-1 size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
              />
            </summary>

            <div className="flex flex-col gap-6 pt-5">
              <div className="flex flex-col gap-2">
                <h4 className="text-caption font-medium">Observed behaviors</h4>
                <AiContentMarker
                  context={`${card.evidence.length} evidence item${card.evidence.length === 1 ? '' : 's'} · ${CONFIDENCE_LABEL[card.confidence]}`}
                >
                  <p>{card.reasoning}</p>
                </AiContentMarker>
              </div>

              {representative.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <h4 className="text-caption font-medium">Representative work</h4>
                  <ul className="flex flex-col gap-1.5">
                    {representative.map((item) => (
                      <li key={item.id} className="flex flex-col gap-0.5">
                        <a
                          href={item.externalUrl ?? undefined}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-code hover:text-primary underline decoration-dotted underline-offset-2"
                        >
                          {item.title}
                        </a>
                        <span className="text-caption">
                          {item.repositoryFullName ?? 'Unknown repository'}
                          {item.detail ? ` · ${item.detail}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {repositories.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <h4 className="text-caption font-medium">Repository breakdown</h4>
                  <ul className="flex flex-col gap-1">
                    {repositories.map((repo) => (
                      <li
                        key={repo.repositoryFullName}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <span className="min-w-0 truncate">{repo.repositoryFullName}</span>
                        <span className="text-caption shrink-0">
                          {repo.count} item{repo.count === 1 ? '' : 's'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {card.evidence.some((item) => item.occurredAt) ? (
                <div className="flex flex-col gap-2">
                  <h4 className="text-caption font-medium">Evidence timeline</h4>
                  <ol className="flex flex-col gap-1">
                    {[...card.evidence]
                      .filter((item) => item.occurredAt)
                      .sort((a, b) => (b.occurredAt ?? '').localeCompare(a.occurredAt ?? ''))
                      .map((item) => (
                        <li key={item.id} className="flex items-baseline gap-2 text-sm">
                          <span className="text-code text-muted-foreground shrink-0">
                            {new Date(item.occurredAt as string).toLocaleDateString('en-US', {
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                          <span className="min-w-0 truncate">{item.title}</span>
                        </li>
                      ))}
                  </ol>
                </div>
              ) : null}

              <div className="flex flex-col gap-2">
                <h4 className="text-caption font-medium">Supporting evidence</h4>
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
              </div>
            </div>
          </TrackedDetails>
        );
      })}
    </div>
  );
}
