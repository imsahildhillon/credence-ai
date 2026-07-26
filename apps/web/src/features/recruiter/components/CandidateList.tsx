import Link from 'next/link';

import { EmptyState } from '@/components/feedback/empty-state';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

import type { CandidateListItem, CandidateListSort } from '../types';

export interface CandidateListProps {
  readonly candidates: readonly CandidateListItem[];
  readonly sort: CandidateListSort;
}

const PROFILE_STATUS_LABEL: Record<CandidateListItem['profileStatus'], string> = {
  no_analysis: 'Not analyzed yet',
  queued: 'Queued',
  ingesting: 'Analyzing',
  assessing: 'Analyzing',
  finalizing: 'Analyzing',
  processing: 'Analyzing',
  completed: 'Ready',
  partial: 'Partly complete',
  failed: 'Analysis failed',
  cancelled: 'Cancelled',
};

const CANDIDATE_STATUS_LABEL: Record<CandidateListItem['status'], string> = {
  new: 'New',
  reviewing: 'Reviewing',
  interviewing: 'Interviewing',
  archived: 'Archived',
};

function formatDate(iso: string | null): string {
  if (!iso) {
    return 'never';
  }
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function sortHref(sort: CandidateListSort): string {
  return `/recruiter/candidates?sort=${sort}`;
}

/**
 * The Candidate List (spec: name, headline, top 3 skills, last analysis,
 * profile status — "No ranking. No AI sorting." — plain recent/alphabetical
 * only). Sorting is two server-rendered links, matching the Evidence
 * Explorer's link-based filtering elsewhere in this app: every view is a
 * real, bookmarkable URL, no client-side re-sort.
 */
export function CandidateList({ candidates, sort }: CandidateListProps) {
  if (candidates.length === 0) {
    return (
      <EmptyState
        title="No candidates visible yet"
        description="Candidates appear here once they've completed analysis and opted into recruiter visibility."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4" role="group" aria-label="Sort candidates">
        <Link
          href={sortHref('recent')}
          aria-current={sort === 'recent' ? 'true' : undefined}
          className={sort === 'recent' ? 'text-foreground font-medium' : 'text-muted-foreground'}
        >
          Recently analyzed
        </Link>
        <Link
          href={sortHref('alphabetical')}
          aria-current={sort === 'alphabetical' ? 'true' : undefined}
          className={sort === 'alphabetical' ? 'text-foreground font-medium' : 'text-muted-foreground'}
        >
          Alphabetical
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <ul className="flex flex-col divide-y">
            {candidates.map((candidate) => (
              <li key={candidate.profileId}>
                <Link
                  href={`/recruiter/candidate/${candidate.profileId}`}
                  className="hover:bg-muted/40 flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-title break-words">{candidate.name}</span>
                      {candidate.bookmarked ? <Badge variant="secondary">Shortlisted</Badge> : null}
                      <Badge variant="outline">{CANDIDATE_STATUS_LABEL[candidate.status]}</Badge>
                    </div>
                    {candidate.headline ? (
                      <p className="text-caption">{candidate.headline}</p>
                    ) : (
                      <p className="text-caption">No assessed skills yet</p>
                    )}
                    {candidate.topSkills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {candidate.topSkills.map((skill) => (
                          <Badge key={skill} variant="outline">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-caption flex shrink-0 flex-col items-start gap-1 sm:items-end">
                    <Badge variant={candidate.profileStatus === 'failed' ? 'outline' : 'default'}>
                      {PROFILE_STATUS_LABEL[candidate.profileStatus]}
                    </Badge>
                    <span>Last analyzed {formatDate(candidate.lastAnalyzedAt)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
