import 'server-only';

import { GithubError } from '@/features/github';

import {
  MAX_COMMIT_DETAILS,
  MAX_PULL_REQUEST_DETAILS,
  fetchCommitDetail,
  fetchPullRequestDetail,
  fetchReadmeExcerpt,
  fetchRepository,
  listCommits,
  listContributors,
  listIssues,
  listPullRequestReviews,
  listPullRequests,
  listReleases,
} from './client';
import {
  mapCommit,
  mapContributor,
  mapIssue,
  mapPullRequest,
  mapRelease,
  mapRepository,
  mapReview,
} from './mapper';
import type {
  AnalysisRepositoryRow,
  GhCommitDetail,
  GhPullRequestDetail,
  IngestionFailure,
  IngestionStage,
  NormalizedEvidence,
  RepositoryIngestionResult,
} from './types';

/**
 * Collects and normalizes every engineering signal for one repository.
 *
 * FAILURE ISOLATION is the design centre: each collection stage runs in its
 * own guarded block, so a repository with (say) issues disabled or an
 * unreadable README still yields its commits and pull requests. Stage
 * failures are returned as data, not thrown — the caller records them in
 * `analysis_errors` and keeps going (CLAUDE.md §19.1, §19.5).
 *
 * The one exception is an invalid token (`unauthorized`): that is not
 * repository-specific and will fail identically for every remaining
 * repository, so it is rethrown for the worker to handle once.
 */

const RETRYABLE_KINDS = new Set(['rate_limited', 'network', 'unknown']);

function toFailure(stage: IngestionStage, error: unknown): IngestionFailure {
  if (error instanceof GithubError) {
    return {
      stage,
      kind: error.kind,
      message: error.message,
      retryable: RETRYABLE_KINDS.has(error.kind),
    };
  }
  return {
    stage,
    kind: 'unknown',
    // Never surface raw internals; keep it operator-readable and PII-free.
    message: error instanceof Error ? error.message : 'Unexpected ingestion failure.',
    retryable: false,
  };
}

export async function ingestRepositoryEvidence(
  token: string,
  snapshot: AnalysisRepositoryRow,
): Promise<RepositoryIngestionResult> {
  const evidence: NormalizedEvidence[] = [];
  const failures: IngestionFailure[] = [];
  const fullName = snapshot.full_name;

  /** Runs one stage, converting failure into recorded data. Rethrows auth failures. */
  async function stage<T>(name: IngestionStage, run: () => Promise<T>): Promise<T | null> {
    try {
      return await run();
    } catch (error) {
      if (error instanceof GithubError && error.kind === 'unauthorized') {
        throw error;
      }
      failures.push(toFailure(name, error));
      return null;
    }
  }

  // ---- Repository metadata + README ------------------------------------
  const repository = await stage('repository', () => fetchRepository(token, fullName));

  if (repository) {
    const readme = await stage('readme', () => fetchReadmeExcerpt(token, fullName));
    evidence.push(mapRepository(repository, readme ?? null));
  }

  // Prefer the branch pinned in the snapshot so ingestion matches what the
  // student approved, not whatever the default branch is today.
  const ref = snapshot.default_branch ?? repository?.default_branch ?? null;

  // ---- Commits ----------------------------------------------------------
  const commits = await stage('commits', () => listCommits(token, fullName, ref));

  if (commits) {
    // Detail (additions/deletions/files) costs one call each, so only the
    // most recent slice is enriched; the rest carry null stats rather than
    // a fabricated zero.
    const detailTargets = commits.slice(0, MAX_COMMIT_DETAILS);
    const details = await Promise.allSettled(
      detailTargets.map((commit) => fetchCommitDetail(token, fullName, commit.sha)),
    );

    const detailBySha = new Map<string, GhCommitDetail>();
    details.forEach((result, index) => {
      const target = detailTargets[index];
      if (target && result.status === 'fulfilled') {
        detailBySha.set(target.sha, result.value);
      }
    });

    for (const commit of commits) {
      evidence.push(mapCommit(commit, detailBySha.get(commit.sha) ?? null));
    }
  }

  // ---- Pull requests (+ their reviews) ----------------------------------
  const pullRequests = await stage('pull_requests', () => listPullRequests(token, fullName));

  if (pullRequests) {
    const detailTargets = pullRequests.slice(0, MAX_PULL_REQUEST_DETAILS);

    const [detailResults, reviewResults] = await Promise.all([
      Promise.allSettled(
        detailTargets.map((pr) => fetchPullRequestDetail(token, fullName, pr.number)),
      ),
      Promise.allSettled(
        detailTargets.map((pr) => listPullRequestReviews(token, fullName, pr.number)),
      ),
    ]);

    const detailByNumber = new Map<number, GhPullRequestDetail>();
    detailResults.forEach((result, index) => {
      const target = detailTargets[index];
      if (target && result.status === 'fulfilled') {
        detailByNumber.set(target.number, result.value);
      }
    });

    const reviewCountByNumber = new Map<number, number>();
    reviewResults.forEach((result, index) => {
      const target = detailTargets[index];
      if (!target || result.status !== 'fulfilled') {
        return;
      }
      reviewCountByNumber.set(target.number, result.value.length);
      // Each review is evidence in its own right (reviewer, state, when).
      for (const review of result.value) {
        evidence.push(mapReview(review, target.number));
      }
    });

    for (const pr of pullRequests) {
      evidence.push(
        mapPullRequest(
          pr,
          detailByNumber.get(pr.number) ?? null,
          reviewCountByNumber.get(pr.number) ?? null,
        ),
      );
    }
  }

  // ---- Issues -----------------------------------------------------------
  const issues = await stage('issues', () => listIssues(token, fullName));
  if (issues) {
    for (const issue of issues) {
      evidence.push(mapIssue(issue));
    }
  }

  // ---- Releases ---------------------------------------------------------
  const releases = await stage('releases', () => listReleases(token, fullName));
  if (releases) {
    for (const release of releases) {
      evidence.push(mapRelease(release));
    }
  }

  // ---- Contributors -----------------------------------------------------
  const contributors = await stage('contributors', () => listContributors(token, fullName));
  if (contributors) {
    const ownerLogin = repository?.owner?.login ?? null;
    for (const contributor of contributors) {
      evidence.push(mapContributor(contributor, fullName, contributor.login === ownerLogin));
    }
  }

  return { evidence, failures };
}
