import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { EngineeringTimelineSection } from '../types';

export interface EngineeringTimelineProps {
  readonly data: EngineeringTimelineSection;
}

function formatMonth(month: string): string {
  const [year, monthNumber] = month.split('-');
  const date = new Date(Number(year), Number(monthNumber) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Section 4 — Engineering Timeline. Every row is a direct count of dated
 * evidence for that month — no hallucinated milestones. Language-adoption
 * and release markers are each backed by one specific evidence item (a
 * `repository` row's `primaryLanguage`, or a `release` row).
 */
export function EngineeringTimeline({ data }: EngineeringTimelineProps) {
  if (data.months.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Engineering timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-caption">No dated activity is available yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Engineering timeline</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <ol className="flex flex-col divide-y rounded-lg border">
          {[...data.months].reverse().map((month) => (
            <li key={month.month} className="flex flex-col gap-1 px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-body font-medium">{formatMonth(month.month)}</span>
                <span className="text-caption">
                  {month.activeRepositories.length} repositor
                  {month.activeRepositories.length === 1 ? 'y' : 'ies'} active
                </span>
              </div>
              <div className="text-caption flex flex-wrap gap-x-4 gap-y-1">
                {month.commitCount > 0 ? <span>{month.commitCount} commits</span> : null}
                {month.pullRequestCount > 0 ? (
                  <span>{month.pullRequestCount} pull requests</span>
                ) : null}
                {month.reviewCount > 0 ? <span>{month.reviewCount} reviews</span> : null}
                {month.issueCount > 0 ? <span>{month.issueCount} issues</span> : null}
                {month.releaseCount > 0 ? <span>{month.releaseCount} releases</span> : null}
              </div>
            </li>
          ))}
        </ol>

        {data.languageAdoption.length > 0 ? (
          <div className="flex flex-col gap-2">
            <h3 className="text-title">Languages adopted</h3>
            <ul className="flex flex-col gap-1">
              {data.languageAdoption.map((event) => (
                <li key={event.language} className="text-caption flex justify-between gap-2">
                  <span className="text-foreground font-medium">{event.language}</span>
                  <span>
                    first seen in {event.repositoryFullName} ·{' '}
                    {new Date(event.firstObservedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {data.releases.length > 0 ? (
          <div className="flex flex-col gap-2">
            <h3 className="text-title">Delivery cadence — releases</h3>
            <ul className="flex flex-col gap-1">
              {data.releases.map((release) => (
                <li
                  key={`${release.repositoryFullName}-${release.tag}`}
                  className="text-caption flex justify-between gap-2"
                >
                  {release.externalUrl ? (
                    <a
                      href={release.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-code hover:text-primary underline decoration-dotted underline-offset-2"
                    >
                      {release.repositoryFullName} — {release.tag}
                    </a>
                  ) : (
                    <span className="text-code">
                      {release.repositoryFullName} — {release.tag}
                    </span>
                  )}
                  <span>
                    {new Date(release.occurredAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
