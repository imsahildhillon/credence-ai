import type { Json } from '@/lib/supabase/types';

import type {
  EvidenceItemInsert,
  GhCommitDetail,
  GhCommitSummary,
  GhContributor,
  GhIssue,
  GhPullRequestDetail,
  GhPullRequestSummary,
  GhRelease,
  GhRepository,
  GhReview,
  NormalizedEvidence,
} from './types';

/**
 * Normalization: GitHub wire objects → domain evidence. Pure functions, no
 * I/O — trivially testable and the single place field translation lives.
 *
 * The rule this module exists to enforce: **a raw GitHub object is never
 * persisted or exposed.** Every signal becomes the same shape (source type,
 * deterministic id, timestamp, author, url, payload), so downstream
 * consumers — and eventually the Evidence Engine — read one vocabulary
 * instead of seven API schemas.
 *
 * Payloads keep only fields with engineering meaning. Anything we don't
 * interpret is dropped rather than mirrored (PRD §12.6 data minimization).
 */

const COMMIT_MESSAGE_LIMIT = 2000;
const BODY_EXCERPT_LIMIT = 2000;
/** Per-commit file list is a signal, not an archive; keep it bounded. */
const MAX_FILES_PER_COMMIT = 50;

function truncate(value: string | null | undefined, limit: number): string | null {
  if (!value) {
    return null;
  }
  return value.length > limit ? value.slice(0, limit) : value;
}

/** First line of a commit message — the conventional summary. */
function commitSubject(message: string): string {
  const [firstLine] = message.split('\n');
  return (firstLine ?? message).slice(0, 200) || 'Commit';
}

export function mapRepository(
  repo: GhRepository,
  readme: { path: string; htmlUrl: string | null; excerpt: string; bytes: number } | null,
): NormalizedEvidence {
  return {
    sourceType: 'repository',
    githubId: String(repo.id),
    title: repo.full_name,
    occurredAt: repo.pushed_at ?? repo.created_at,
    authorLogin: repo.owner?.login ?? null,
    rawUrl: repo.html_url,
    payload: {
      name: repo.name,
      fullName: repo.full_name,
      description: truncate(repo.description, BODY_EXCERPT_LIMIT),
      defaultBranch: repo.default_branch,
      topics: repo.topics ?? [],
      primaryLanguage: repo.language,
      isPrivate: repo.private,
      isFork: repo.fork,
      isArchived: repo.archived,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      openIssues: repo.open_issues_count,
      sizeKb: repo.size,
      createdAt: repo.created_at,
      pushedAt: repo.pushed_at,
      readme: readme
        ? { path: readme.path, url: readme.htmlUrl, bytes: readme.bytes, excerpt: readme.excerpt }
        : null,
    },
  };
}

export function mapCommit(
  commit: GhCommitSummary,
  detail: GhCommitDetail | null,
): NormalizedEvidence {
  const files = detail?.files?.slice(0, MAX_FILES_PER_COMMIT) ?? null;

  return {
    sourceType: 'commit',
    // The SHA *is* the deterministic identity — no numeric id exists.
    githubId: commit.sha,
    title: commitSubject(commit.commit.message),
    occurredAt: commit.commit.author?.date ?? null,
    authorLogin: commit.author?.login ?? null,
    rawUrl: commit.html_url,
    payload: {
      sha: commit.sha,
      message: truncate(commit.commit.message, COMMIT_MESSAGE_LIMIT),
      authorName: commit.commit.author?.name ?? null,
      authoredAt: commit.commit.author?.date ?? null,
      // Null (not 0) when we did not fetch the detail — absence of data is
      // never reported as a measured zero (Brand Guidelines: honest limits).
      additions: detail?.stats?.additions ?? null,
      deletions: detail?.stats?.deletions ?? null,
      filesChanged: detail?.files?.length ?? null,
      files:
        files?.map((file) => ({
          path: file.filename,
          additions: file.additions,
          deletions: file.deletions,
          status: file.status,
        })) ?? null,
      detailFetched: detail !== null,
    },
  };
}

export function mapPullRequest(
  pr: GhPullRequestSummary,
  detail: GhPullRequestDetail | null,
  reviewCount: number | null,
): NormalizedEvidence {
  return {
    sourceType: 'pull_request',
    githubId: String(pr.id),
    title: pr.title,
    // Merge time is the meaningful engineering moment; fall back to creation.
    occurredAt: pr.merged_at ?? pr.closed_at ?? pr.created_at,
    authorLogin: pr.user?.login ?? null,
    rawUrl: pr.html_url,
    payload: {
      number: pr.number,
      description: truncate(pr.body, BODY_EXCERPT_LIMIT),
      state: pr.state,
      isDraft: pr.draft ?? false,
      merged: detail?.merged ?? pr.merged_at !== null,
      mergedAt: pr.merged_at,
      closedAt: pr.closed_at,
      createdAt: pr.created_at,
      labels: pr.labels.map((label) => label.name),
      comments: detail?.comments ?? null,
      reviewComments: detail?.review_comments ?? null,
      commits: detail?.commits ?? null,
      additions: detail?.additions ?? null,
      deletions: detail?.deletions ?? null,
      changedFiles: detail?.changed_files ?? null,
      reviewCount,
      detailFetched: detail !== null,
    },
  };
}

export function mapReview(review: GhReview, pullRequestNumber: number): NormalizedEvidence {
  return {
    sourceType: 'review',
    githubId: String(review.id),
    title: `Review on #${pullRequestNumber}`,
    occurredAt: review.submitted_at,
    authorLogin: review.user?.login ?? null,
    rawUrl: review.html_url,
    payload: {
      pullRequestNumber,
      reviewer: review.user?.login ?? null,
      state: review.state,
      submittedAt: review.submitted_at,
    },
  };
}

export function mapIssue(issue: GhIssue): NormalizedEvidence {
  return {
    sourceType: 'issue',
    githubId: String(issue.id),
    title: issue.title,
    occurredAt: issue.closed_at ?? issue.created_at,
    authorLogin: issue.user?.login ?? null,
    rawUrl: issue.html_url,
    payload: {
      number: issue.number,
      state: issue.state,
      labels: issue.labels.map((label) => label.name),
      creator: issue.user?.login ?? null,
      assignees: issue.assignees.map((assignee) => assignee.login),
      createdAt: issue.created_at,
      closedAt: issue.closed_at,
    },
  };
}

export function mapRelease(release: GhRelease): NormalizedEvidence {
  return {
    sourceType: 'release',
    githubId: String(release.id),
    title: release.name ?? release.tag_name,
    occurredAt: release.published_at ?? release.created_at,
    authorLogin: release.author?.login ?? null,
    rawUrl: release.html_url,
    payload: {
      tag: release.tag_name,
      name: release.name,
      isDraft: release.draft,
      isPrerelease: release.prerelease,
      publishedAt: release.published_at,
      createdAt: release.created_at,
    },
  };
}

export function mapContributor(
  contributor: GhContributor,
  repositoryFullName: string,
  isOwner: boolean,
): NormalizedEvidence {
  return {
    sourceType: 'contributor',
    // Contributors have no event id — identity is (repo, user), and the
    // upsert key already includes the repository, so the user id suffices.
    githubId: String(contributor.id),
    title: `${contributor.login} — ${repositoryFullName}`,
    // A contribution tally is a standing fact, not a point-in-time event.
    occurredAt: null,
    authorLogin: contributor.login,
    rawUrl: contributor.html_url,
    payload: {
      login: contributor.login,
      commits: contributor.contributions,
      // GitHub's cheap contributors endpoint does not expose line counts;
      // "when available" is honestly null rather than guessed.
      additions: null,
      deletions: null,
      accountType: contributor.type,
      isRepositoryOwner: isOwner,
    },
  };
}

/**
 * Normalized evidence → a database row. `confidence` is left to the column
 * default (1.0): every row here was read directly from the GitHub API, so
 * the observation is exact. Ownership fields (`profile_id`, `repository_id`)
 * come from the analysis snapshot, never from anything client-supplied.
 */
export function toEvidenceItemInsert(
  evidence: NormalizedEvidence,
  profileId: string,
  repositoryId: string,
): EvidenceItemInsert {
  return {
    profile_id: profileId,
    repository_id: repositoryId,
    evidence_type: 'github_repository',
    source_type: evidence.sourceType,
    github_id: evidence.githubId,
    title: evidence.title,
    occurred_at: evidence.occurredAt,
    author_login: evidence.authorLogin,
    external_url: evidence.rawUrl,
    // Safe cast: every payload in this module is built here from JSON
    // primitives, arrays and plain objects. `Record<string, unknown>` is only
    // the authoring-friendly type — the value is structurally `Json`
    // (CLAUDE.md §7.2: casts carry a justification).
    payload: evidence.payload as unknown as Json,
    verified: true,
  };
}
