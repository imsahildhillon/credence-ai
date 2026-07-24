import type { Database } from '@/lib/supabase/types';

/**
 * The subset of GitHub's REST API shapes this feature consumes. Only the
 * fields we actually use are typed — GitHub returns far more, but a
 * boundary should declare exactly what it depends on (CLAUDE.md §6.7).
 */
export interface GithubApiUser {
  readonly id: number;
  readonly login: string;
  readonly name: string | null;
  readonly avatar_url: string;
  readonly html_url: string;
}

export interface GithubApiRepository {
  readonly id: number;
  readonly name: string;
  readonly full_name: string;
  readonly description: string | null;
  readonly private: boolean;
  readonly fork: boolean;
  readonly archived: boolean;
  readonly language: string | null;
  readonly stargazers_count: number;
  readonly updated_at: string | null;
  readonly html_url: string;
  readonly default_branch: string | null;
}

/** `GET /repos/{owner}/{repo}/commits/{ref}` — only the field we need. */
export interface GithubApiCommit {
  readonly sha: string;
}

/** Rows/inserts for the tables this feature owns, named for readability. */
export type RepositoryRow = Database['public']['Tables']['repositories']['Row'];
export type RepositoryInsert = Database['public']['Tables']['repositories']['Insert'];
export type GithubAccountRow = Database['public']['Tables']['github_accounts']['Row'];
export type AnalysisRow = Database['public']['Tables']['analyses']['Row'];
export type AnalysisRepositoryRow = Database['public']['Tables']['analysis_repositories']['Row'];

/**
 * The view model the UI renders — derived from a persisted `RepositoryRow`,
 * never from the raw GitHub payload, so the selection screen and the review
 * screen are guaranteed to show the same stored data.
 */
export interface RepositorySummary {
  readonly id: string;
  readonly githubRepoId: number;
  readonly name: string;
  readonly fullName: string;
  readonly description: string | null;
  readonly visibility: 'public' | 'private';
  readonly primaryLanguage: string | null;
  readonly stars: number;
  readonly githubUpdatedAt: string | null;
  readonly htmlUrl: string | null;
  readonly isFork: boolean;
  readonly isArchived: boolean;
  readonly included: boolean;
}

/** Minimal repository reference used to resolve a HEAD commit before snapshotting. */
export interface RepositoryRef {
  readonly id: string;
  readonly fullName: string;
  readonly defaultBranch: string | null;
}

/**
 * One row of an analysis's immutable repository snapshot — what the worker
 * will analyze, frozen at enqueue time (never `repositories.included`).
 */
export interface AnalysisSnapshotItem {
  readonly repositoryId: string;
  readonly githubRepoId: number;
  readonly name: string;
  readonly fullName: string;
  readonly defaultBranch: string | null;
  readonly visibility: 'public' | 'private';
  readonly primaryLanguage: string | null;
  readonly commitSha: string | null;
}

/**
 * Why a GitHub call failed, in product terms — each kind maps to a distinct
 * designed UI state (CLAUDE.md §19.1: expected failures are modeled values).
 */
export type GithubErrorKind =
  'token_unavailable' | 'unauthorized' | 'rate_limited' | 'not_found' | 'network' | 'unknown';

/**
 * Whether a failure means the student must re-authorize GitHub (as opposed
 * to simply retrying). Drives the "Reconnect GitHub" affordance.
 */
export function requiresGithubReconnect(kind: GithubErrorKind): boolean {
  return kind === 'token_unavailable' || kind === 'unauthorized';
}

export class GithubError extends Error {
  readonly kind: GithubErrorKind;
  readonly status: number | undefined;

  constructor(kind: GithubErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'GithubError';
    this.kind = kind;
    this.status = status;
  }
}

/** Discriminated result returned by Server Actions the client renders inline. */
export type ImportResult =
  | { readonly status: 'success'; readonly imported: number }
  | { readonly status: 'error'; readonly kind: GithubErrorKind; readonly message: string };
