import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { RepositoryOwnership } from '../types';

export interface CodeOwnershipProps {
  readonly ownership: readonly RepositoryOwnership[];
}

/**
 * Section 6 — Code Ownership. Contribution level is computed from GitHub's
 * own per-repository contributor stats (`contributor` evidence), never
 * from the capped `commit` evidence sample — see
 * `server/aggregator.ts#buildOwnership` for why. When the underlying
 * counts are unavailable, `commitShare` is `null` and rendered as "not
 * available" rather than guessed.
 */
export function CodeOwnership({ ownership }: CodeOwnershipProps) {
  if (ownership.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Code ownership</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-caption">No contributor data is available yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Code ownership</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col divide-y rounded-lg border">
          {ownership.map((repo) => (
            <li key={repo.repositoryId} className="flex flex-col gap-2 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-body min-w-0 font-medium break-words">
                  {repo.repositoryFullName}
                </span>
                {repo.isRepositoryOwner ? <Badge variant="outline">Owner</Badge> : null}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {repo.commitShare !== null ? (
                  <>
                    <div
                      className="bg-muted h-2 w-32 overflow-hidden rounded-full"
                      role="presentation"
                    >
                      <div
                        className="bg-chart-2 h-full rounded-full"
                        style={{ width: `${Math.round(repo.commitShare * 100)}%` }}
                      />
                    </div>
                    <span className="text-caption">
                      {Math.round(repo.commitShare * 100)}% of commits ({repo.candidateCommitCount}{' '}
                      of {repo.totalCommitCount})
                    </span>
                  </>
                ) : (
                  <span className="text-caption">Commit share not available</span>
                )}
                {repo.reviewsGiven > 0 ? (
                  <span className="text-caption">
                    · {repo.reviewsGiven} review{repo.reviewsGiven === 1 ? '' : 's'} given
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
