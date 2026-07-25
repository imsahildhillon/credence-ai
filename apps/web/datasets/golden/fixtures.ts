import type { AggregatableEvidence, RepositoryContext } from '@/features/analysis/aggregator';
import type { EvidenceSourceType } from '@/features/analysis/types';
import type { Json } from '@/lib/supabase/types';

/**
 * Fixture builders for the golden dataset.
 *
 * Every case anchors its dates to a fixed reference point rather than
 * `Date.now()` — the whole point of this framework is a *deterministic*
 * evaluation; a dataset whose evidence ages every day it runs would make
 * "did the metrics change" ambiguous between "the prompt changed" and "time
 * passed" (the same reasoning `shared/prompt-caching.md` gives for keeping
 * `Date.now()` out of stable prompt content, applied to test data instead).
 */
export const REFERENCE_DATE = new Date('2026-06-01T00:00:00.000Z');

export function daysAgo(days: number): string {
  return new Date(REFERENCE_DATE.getTime() - days * 86_400_000).toISOString();
}

export function makeRepository(
  repositoryId: string,
  fullName: string,
  primaryLanguage: string | null,
): RepositoryContext {
  return { repositoryId, fullName, primaryLanguage };
}

interface FilePatch {
  readonly path: string;
  readonly additions: number;
  readonly deletions: number;
  readonly status: 'added' | 'modified' | 'removed';
}

interface CommitInput {
  readonly repositoryId: string;
  readonly sha: string;
  readonly message: string;
  readonly daysAgo: number;
  readonly files?: readonly FilePatch[];
  readonly additions?: number;
  readonly deletions?: number;
  readonly authorLogin?: string;
}

interface PullRequestInput {
  readonly repositoryId: string;
  readonly number: number;
  readonly title: string;
  readonly daysAgo: number;
  readonly merged: boolean;
  readonly labels?: readonly string[];
  readonly reviewCount?: number;
  readonly additions?: number;
  readonly deletions?: number;
  readonly changedFiles?: number;
  readonly authorLogin?: string;
}

interface ReviewInput {
  readonly repositoryId: string;
  readonly pullRequestNumber: number;
  readonly daysAgo: number;
  readonly state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED';
  /** Top-level author — the reviewer. Set to the candidate's login to count as their leadership signal. */
  readonly authorLogin: string;
}

interface IssueInput {
  readonly repositoryId: string;
  readonly number: number;
  readonly title: string;
  readonly daysAgo: number;
  readonly state: 'open' | 'closed';
  readonly labels?: readonly string[];
  readonly authorLogin: string;
}

interface ReleaseInput {
  readonly repositoryId: string;
  readonly tag: string;
  readonly daysAgo: number;
  readonly authorLogin: string;
}

interface ContributorInput {
  readonly repositoryId: string;
  readonly repositoryFullName: string;
  readonly login: string;
  readonly commits: number;
  readonly isOwner: boolean;
}

interface RepositoryEvidenceInput {
  readonly repositoryId: string;
  readonly fullName: string;
  readonly description: string;
  readonly primaryLanguage: string | null;
  readonly daysAgo: number;
  readonly hasReadme: boolean;
  readonly ownerLogin: string;
}

/**
 * A per-case, id-scoped evidence factory. Ids are readable
 * (`<casePrefix>-ev-NNN`) and unique within the case, which is all
 * `citableEvidenceIds` membership checks require.
 */
export function createEvidenceFactory(casePrefix: string) {
  let sequence = 0;

  function nextId(): string {
    sequence += 1;
    return `${casePrefix}-ev-${String(sequence).padStart(3, '0')}`;
  }

  return {
    repository(input: RepositoryEvidenceInput): AggregatableEvidence {
      return {
        id: nextId(),
        source_type: 'repository' satisfies EvidenceSourceType,
        title: input.fullName,
        occurred_at: daysAgo(input.daysAgo),
        author_login: input.ownerLogin,
        repository_id: input.repositoryId,
        payload: {
          name: input.fullName.split('/')[1] ?? input.fullName,
          fullName: input.fullName,
          description: input.description,
          primaryLanguage: input.primaryLanguage,
          readme: input.hasReadme
            ? { path: 'README.md', url: null, bytes: 2400, excerpt: input.description }
            : null,
        } satisfies Json,
      };
    },

    commit(input: CommitInput): AggregatableEvidence {
      const files = input.files ?? [];
      return {
        id: nextId(),
        source_type: 'commit' satisfies EvidenceSourceType,
        title: input.message,
        occurred_at: daysAgo(input.daysAgo),
        author_login: input.authorLogin ?? null,
        repository_id: input.repositoryId,
        payload: {
          sha: input.sha,
          message: input.message,
          additions: input.additions ?? null,
          deletions: input.deletions ?? null,
          filesChanged: files.length > 0 ? files.length : null,
          files: files.length > 0 ? files.map((file) => ({ ...file })) : null,
          detailFetched: files.length > 0,
        } satisfies Json,
      };
    },

    pullRequest(input: PullRequestInput): AggregatableEvidence {
      return {
        id: nextId(),
        source_type: 'pull_request' satisfies EvidenceSourceType,
        title: input.title,
        occurred_at: daysAgo(input.daysAgo),
        author_login: input.authorLogin ?? null,
        repository_id: input.repositoryId,
        payload: {
          number: input.number,
          state: input.merged ? 'closed' : 'open',
          merged: input.merged,
          labels: [...(input.labels ?? [])],
          reviewCount: input.reviewCount ?? null,
          additions: input.additions ?? null,
          deletions: input.deletions ?? null,
          changedFiles: input.changedFiles ?? null,
          detailFetched: input.additions !== undefined,
        } satisfies Json,
      };
    },

    review(input: ReviewInput): AggregatableEvidence {
      return {
        id: nextId(),
        source_type: 'review' satisfies EvidenceSourceType,
        title: `Review on PR #${input.pullRequestNumber}`,
        occurred_at: daysAgo(input.daysAgo),
        author_login: input.authorLogin,
        repository_id: input.repositoryId,
        payload: {
          pullRequestNumber: input.pullRequestNumber,
          state: input.state,
        } satisfies Json,
      };
    },

    issue(input: IssueInput): AggregatableEvidence {
      return {
        id: nextId(),
        source_type: 'issue' satisfies EvidenceSourceType,
        title: input.title,
        occurred_at: daysAgo(input.daysAgo),
        author_login: input.authorLogin,
        repository_id: input.repositoryId,
        payload: {
          number: input.number,
          state: input.state,
          labels: [...(input.labels ?? [])],
        } satisfies Json,
      };
    },

    release(input: ReleaseInput): AggregatableEvidence {
      return {
        id: nextId(),
        source_type: 'release' satisfies EvidenceSourceType,
        title: input.tag,
        occurred_at: daysAgo(input.daysAgo),
        author_login: input.authorLogin,
        repository_id: input.repositoryId,
        payload: { tag: input.tag, isDraft: false, isPrerelease: false } satisfies Json,
      };
    },

    contributor(input: ContributorInput): AggregatableEvidence {
      return {
        id: nextId(),
        source_type: 'contributor' satisfies EvidenceSourceType,
        title: `${input.login} — ${input.repositoryFullName}`,
        occurred_at: null,
        author_login: input.login,
        repository_id: input.repositoryId,
        payload: {
          login: input.login,
          commits: input.commits,
          additions: null,
          deletions: null,
          isOwner: input.isOwner,
        } satisfies Json,
      };
    },
  };
}

export type EvidenceFactory = ReturnType<typeof createEvidenceFactory>;
