import type {
  AnalysisRepositoryRow,
  AnalysisSnapshotItem,
  GithubApiRepository,
  RepositoryInsert,
  RepositoryRow,
  RepositorySummary,
} from './types';

/**
 * Pure mapping between GitHub API payloads, our persisted rows, and the UI
 * view model. No I/O, no side effects — trivially testable, and the single
 * place field-name translation lives (CLAUDE.md §6.1).
 */

/**
 * Default selection at import time (PRD FR-2.1): a student's own,
 * non-fork, non-archived repos are pre-selected; forks and archived repos
 * are imported but deselected, since they're excluded from originality-
 * weighted analysis by default. A caller re-importing passes the student's
 * existing choice instead, so a manual selection is never clobbered.
 */
export function defaultIncluded(apiRepo: GithubApiRepository): boolean {
  return !apiRepo.fork && !apiRepo.archived;
}

export function toRepositoryInsert(
  apiRepo: GithubApiRepository,
  githubAccountId: string,
  included: boolean,
): RepositoryInsert {
  return {
    github_account_id: githubAccountId,
    github_repo_id: apiRepo.id,
    full_name: apiRepo.full_name,
    description: apiRepo.description,
    is_private: apiRepo.private,
    is_fork: apiRepo.fork,
    is_archived: apiRepo.archived,
    primary_language: apiRepo.language,
    stargazers_count: apiRepo.stargazers_count,
    github_updated_at: apiRepo.updated_at,
    html_url: apiRepo.html_url,
    default_branch: apiRepo.default_branch,
    included,
  };
}

/** `owner/name` → `name`; falls back to the full string if unslashed. */
export function shortRepoName(fullName: string): string {
  const slash = fullName.lastIndexOf('/');
  return slash === -1 ? fullName : fullName.slice(slash + 1);
}

export function toRepositorySummary(row: RepositoryRow): RepositorySummary {
  return {
    id: row.id,
    githubRepoId: row.github_repo_id,
    name: shortRepoName(row.full_name),
    fullName: row.full_name,
    description: row.description,
    visibility: row.is_private ? 'private' : 'public',
    primaryLanguage: row.primary_language,
    stars: row.stargazers_count,
    githubUpdatedAt: row.github_updated_at,
    htmlUrl: row.html_url,
    isFork: row.is_fork,
    isArchived: row.is_archived,
    included: row.included,
  };
}

/** Snapshot row → view model. Mirrors `toRepositorySummary` for frozen data. */
export function toAnalysisSnapshotItem(row: AnalysisRepositoryRow): AnalysisSnapshotItem {
  return {
    repositoryId: row.repository_id,
    githubRepoId: row.github_repo_id,
    name: shortRepoName(row.full_name),
    fullName: row.full_name,
    defaultBranch: row.default_branch,
    visibility: row.is_private ? 'private' : 'public',
    primaryLanguage: row.primary_language,
    commitSha: row.commit_sha,
  };
}

/** Distinct, sorted primary languages present in a repo set — for the filter. */
export function distinctLanguages(summaries: readonly RepositorySummary[]): string[] {
  const set = new Set<string>();
  for (const summary of summaries) {
    if (summary.primaryLanguage) {
      set.add(summary.primaryLanguage);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}
