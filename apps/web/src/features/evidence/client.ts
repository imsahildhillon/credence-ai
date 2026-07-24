import 'server-only';

import { GithubError } from '@/features/github';

import type {
  GhCommitDetail,
  GhCommitSummary,
  GhContributor,
  GhIssue,
  GhPullRequestDetail,
  GhPullRequestSummary,
  GhReadme,
  GhRelease,
  GhRepository,
  GhReview,
} from './types';

/**
 * GitHub REST access for the evidence pipeline. The only module here that
 * speaks HTTP; everything above it deals in typed values.
 *
 * It owns a small fetch wrapper of its own rather than reaching into the
 * `github` feature's private client — features don't share internals
 * (CLAUDE.md §4). The ~20 lines of duplicated status mapping is a deliberate
 * trade for that boundary; if a third consumer appears, extract a shared
 * `lib/github-http`.
 *
 * COST CONTROL: every list is capped and every "detail" fan-out is bounded
 * (see the constants below). A repository costs roughly 1 + 1 + 1 + N_commit
 * + 1 + 2·N_pr + 1 + 1 + 1 calls; with the defaults that is well under 60,
 * so a 10-repository analysis stays far inside GitHub's 5000/hour budget.
 */
const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_API_VERSION = '2022-11-28';

/** How many of each signal we ingest per repository. */
export const MAX_COMMITS = 100;
/** Commits we additionally fetch in full for additions/deletions/files. */
export const MAX_COMMIT_DETAILS = 20;
export const MAX_PULL_REQUESTS = 30;
/** PRs we additionally fetch in full (+ their reviews). Two calls each. */
export const MAX_PULL_REQUEST_DETAILS = 10;
export const MAX_ISSUES = 50;
export const MAX_RELEASES = 30;
export const MAX_CONTRIBUTORS = 30;
/** Stop issuing calls when GitHub says we are nearly out of budget. */
const RATE_LIMIT_FLOOR = 25;
/** README is stored as a bounded excerpt, never a full mirror (PRD §12.6). */
const README_EXCERPT_CHARS = 4000;

function githubHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': GITHUB_API_VERSION,
    'User-Agent': 'credence-ai',
  };
}

function isRateLimited(response: Response): boolean {
  const remaining = response.headers.get('x-ratelimit-remaining');
  return (response.status === 403 || response.status === 429) && remaining === '0';
}

/** Remaining budget reported by the last response, when GitHub sent it. */
let lastKnownRemaining: number | null = null;

export function remainingRateLimit(): number | null {
  return lastKnownRemaining;
}

/**
 * Cheap pre-flight guard so a large ingestion stops *before* exhausting the
 * hourly budget, leaving headroom for interactive requests (imports) rather
 * than starving them.
 */
export function hasRateLimitHeadroom(): boolean {
  return lastKnownRemaining === null || lastKnownRemaining > RATE_LIMIT_FLOOR;
}

async function githubGet(path: string, token: string): Promise<Response> {
  if (!hasRateLimitHeadroom()) {
    throw new GithubError('rate_limited', 'GitHub rate limit budget exhausted for this run.', 403);
  }

  let response: Response;
  try {
    response = await fetch(`${GITHUB_API_BASE}${path}`, {
      headers: githubHeaders(token),
      cache: 'no-store',
    });
  } catch {
    throw new GithubError('network', 'Could not reach GitHub.');
  }

  const remaining = response.headers.get('x-ratelimit-remaining');
  if (remaining !== null) {
    const parsed = Number(remaining);
    lastKnownRemaining = Number.isFinite(parsed) ? parsed : null;
  }

  if (response.ok) {
    return response;
  }
  if (isRateLimited(response)) {
    throw new GithubError('rate_limited', 'GitHub rate limit reached.', response.status);
  }
  if (response.status === 401) {
    throw new GithubError('unauthorized', 'GitHub authorization is no longer valid.', 401);
  }
  if (response.status === 404) {
    throw new GithubError('not_found', 'GitHub resource not found.', 404);
  }
  throw new GithubError('unknown', `GitHub request failed (${response.status}).`, response.status);
}

async function githubGetJson<T>(path: string, token: string): Promise<T> {
  const response = await githubGet(path, token);
  return (await response.json()) as T;
}

export async function fetchRepository(token: string, fullName: string): Promise<GhRepository> {
  // `topics` ships in this response under the current media type, so no
  // separate /topics call is needed.
  return githubGetJson<GhRepository>(`/repos/${fullName}`, token);
}

/** Returns null when the repository simply has no README (a 404, not an error). */
export async function fetchReadmeExcerpt(
  token: string,
  fullName: string,
): Promise<{ path: string; htmlUrl: string | null; excerpt: string; bytes: number } | null> {
  let readme: GhReadme;
  try {
    readme = await githubGetJson<GhReadme>(`/repos/${fullName}/readme`, token);
  } catch (error) {
    if (error instanceof GithubError && error.kind === 'not_found') {
      return null;
    }
    throw error;
  }

  const decoded =
    readme.encoding === 'base64'
      ? Buffer.from(readme.content, 'base64').toString('utf8')
      : readme.content;

  return {
    path: readme.path,
    htmlUrl: readme.html_url,
    excerpt: decoded.slice(0, README_EXCERPT_CHARS),
    bytes: readme.size,
  };
}

export async function listCommits(
  token: string,
  fullName: string,
  ref: string | null,
): Promise<GhCommitSummary[]> {
  const shaParam = ref ? `&sha=${encodeURIComponent(ref)}` : '';
  return githubGetJson<GhCommitSummary[]>(
    `/repos/${fullName}/commits?per_page=${MAX_COMMITS}${shaParam}`,
    token,
  );
}

export async function fetchCommitDetail(
  token: string,
  fullName: string,
  sha: string,
): Promise<GhCommitDetail> {
  return githubGetJson<GhCommitDetail>(`/repos/${fullName}/commits/${sha}`, token);
}

export async function listPullRequests(
  token: string,
  fullName: string,
): Promise<GhPullRequestSummary[]> {
  return githubGetJson<GhPullRequestSummary[]>(
    `/repos/${fullName}/pulls?state=all&per_page=${MAX_PULL_REQUESTS}&sort=updated&direction=desc`,
    token,
  );
}

export async function fetchPullRequestDetail(
  token: string,
  fullName: string,
  number: number,
): Promise<GhPullRequestDetail> {
  return githubGetJson<GhPullRequestDetail>(`/repos/${fullName}/pulls/${number}`, token);
}

export async function listPullRequestReviews(
  token: string,
  fullName: string,
  number: number,
): Promise<GhReview[]> {
  return githubGetJson<GhReview[]>(`/repos/${fullName}/pulls/${number}/reviews?per_page=50`, token);
}

/**
 * GitHub's issues endpoint also returns pull requests; those carry a
 * `pull_request` key and are filtered out so PR evidence isn't double-counted.
 */
export async function listIssues(token: string, fullName: string): Promise<GhIssue[]> {
  const issues = await githubGetJson<GhIssue[]>(
    `/repos/${fullName}/issues?state=all&per_page=${MAX_ISSUES}`,
    token,
  );
  return issues.filter((issue) => issue.pull_request === undefined);
}

export async function listReleases(token: string, fullName: string): Promise<GhRelease[]> {
  return githubGetJson<GhRelease[]>(`/repos/${fullName}/releases?per_page=${MAX_RELEASES}`, token);
}

export async function listContributors(token: string, fullName: string): Promise<GhContributor[]> {
  // 204 = empty repository; GitHub sends no body.
  const response = await githubGet(
    `/repos/${fullName}/contributors?per_page=${MAX_CONTRIBUTORS}`,
    token,
  );
  if (response.status === 204) {
    return [];
  }
  return (await response.json()) as GhContributor[];
}
