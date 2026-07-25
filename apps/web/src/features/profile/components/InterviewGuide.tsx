import { ExternalLink } from 'lucide-react';

import type { InterviewSuggestion } from '../types';

export interface InterviewGuideProps {
  readonly suggestions: readonly InterviewSuggestion[];
}

/**
 * Chapter 5 — Interview Guide. Every topic is the exact growth-area text
 * `features/analysis` already persisted for a skill — never a generic
 * prompt and never re-generated here — paired with the evidence that
 * produced it, so an interviewer can open the same commits or pull requests
 * the assessment cites (mission: "never speculate; only derive from
 * evidence").
 */
export function InterviewGuide({ suggestions }: InterviewGuideProps) {
  if (suggestions.length === 0) {
    return (
      <p className="text-caption">
        No evidence-backed growth areas were identified — nothing to suggest here yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col divide-y">
      {suggestions.map((suggestion, index) => (
        <div
          key={`${suggestion.skillName}-${index}`}
          className="flex flex-col gap-2 py-5 first:pt-0"
        >
          <span className="text-caption">{suggestion.skillName}</span>
          <p className="text-title">{suggestion.topic}</p>
          <p className="text-caption">
            Reason: observed across {suggestion.evidence.length} evidence item
            {suggestion.evidence.length === 1 ? '' : 's'}
            {suggestion.repositoryFullName ? ` in ${suggestion.repositoryFullName}` : ''}.
          </p>
          <ul className="flex flex-col gap-1">
            {suggestion.evidence.slice(0, 3).map((item) =>
              item.linkDead || !item.externalUrl ? (
                <li key={item.id} className="text-code">
                  {item.title}
                </li>
              ) : (
                <li key={item.id}>
                  <a
                    href={item.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-code hover:text-primary inline-flex items-center gap-1.5 underline decoration-dotted underline-offset-2"
                  >
                    {item.title}
                    <ExternalLink aria-hidden="true" className="size-3 shrink-0" />
                  </a>
                </li>
              ),
            )}
          </ul>
        </div>
      ))}
    </div>
  );
}
