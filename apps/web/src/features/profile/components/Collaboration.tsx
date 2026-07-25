import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { CollaborationSection } from '../types';

export interface CollaborationProps {
  readonly data: CollaborationSection;
}

interface Stat {
  readonly label: string;
  readonly value: number;
}

/**
 * Section 5 — Collaboration. Every figure is a direct count of evidence
 * authored (or participated in) by the candidate's own GitHub login — no
 * derived judgement, no AI interpretation of "how collaborative" someone
 * is.
 */
export function Collaboration({ data }: CollaborationProps) {
  const stats: readonly Stat[] = [
    { label: 'Reviews given', value: data.reviewsGiven },
    { label: 'Pull requests opened', value: data.pullRequestsOpened },
    { label: 'Pull requests that received review', value: data.pullRequestsWithReview },
    { label: 'Issues opened', value: data.issuesOpened },
    { label: 'Issues participated in', value: data.issuesParticipated },
    { label: 'Repositories collaborated in', value: data.repositoriesCollaboratedIn },
  ];
  const hasAnyActivity = stats.some((stat) => stat.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Collaboration</CardTitle>
      </CardHeader>
      <CardContent>
        {hasAnyActivity ? (
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col gap-1 rounded-lg border p-4">
                <dt className="text-caption">{stat.label}</dt>
                <dd className="text-h3">{stat.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-caption">
            No collaboration activity — reviews, pull requests, or issues — was found in the
            analyzed repositories.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
