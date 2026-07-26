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

/**
 * Raw, verifiable facts about a running analysis — every field is a direct
 * count or existence check against rows the worker actually wrote, never an
 * estimate or a fabricated percentage (CLAUDE.md §21.5: never fake progress).
 */
export interface AnalysisProgress {
  readonly status: AnalysisRow['status'];
  readonly startedAt: string | null;
  readonly repositoryCount: number;
  readonly hasRepositoryEvidence: boolean;
  readonly hasCommitEvidence: boolean;
  readonly hasExtractedEvidence: boolean;
  readonly hasSkillAssessments: boolean;
}

export type PipelineStageId =
  | 'queue_accepted'
  | 'fetching_repositories'
  | 'reading_commits'
  | 'extracting_evidence'
  | 'building_report'
  | 'complete';

export type PipelineStageState = 'pending' | 'active' | 'complete';

export interface PipelineStage {
  readonly id: PipelineStageId;
  readonly label: string;
  readonly state: PipelineStageState;
}

const STAGE_LABELS: Readonly<Record<PipelineStageId, string>> = {
  queue_accepted: 'Queue accepted',
  fetching_repositories: 'Fetching repositories',
  reading_commits: 'Reading commits',
  extracting_evidence: 'Extracting engineering evidence',
  building_report: 'Building engineering report',
  complete: 'Complete',
};

const STAGE_ORDER: readonly PipelineStageId[] = [
  'queue_accepted',
  'fetching_repositories',
  'reading_commits',
  'extracting_evidence',
  'building_report',
  'complete',
];

/**
 * Turns raw progress facts into a stage list. Each stage's state is derived
 * from something that actually happened — a row that exists, a status the
 * worker wrote — never from elapsed time or a guess. The mapping is
 * necessarily approximate at the boundary between two adjacent stages (e.g.
 * "fetching repositories" is inferred to be running the moment before any
 * repository evidence has landed, not because we observed a "fetch started"
 * event — no such event is persisted today), but every "complete" claim is
 * backed by a real, checkable fact, and nothing here ever renders a
 * percentage.
 */
export function deriveAnalysisStages(progress: AnalysisProgress): readonly PipelineStage[] {
  if (progress.status === 'failed') {
    return STAGE_ORDER.map((id) => ({ id, label: STAGE_LABELS[id], state: 'pending' }));
  }

  if (progress.status === 'completed' || progress.status === 'partial') {
    return STAGE_ORDER.map((id) => ({ id, label: STAGE_LABELS[id], state: 'complete' }));
  }

  if (progress.status === 'queued') {
    return STAGE_ORDER.map((id, index) => ({
      id,
      label: STAGE_LABELS[id],
      state: index === 0 ? 'active' : 'pending',
    }));
  }

  // 'processing': each boolean is a fact about rows that exist right now.
  const completedFlags: Readonly<Record<Exclude<PipelineStageId, 'complete'>, boolean>> = {
    queue_accepted: true,
    fetching_repositories: progress.hasRepositoryEvidence,
    reading_commits: progress.hasCommitEvidence,
    extracting_evidence: progress.hasExtractedEvidence,
    building_report: progress.hasSkillAssessments,
  };

  let activeAssigned = false;
  return STAGE_ORDER.map((id) => {
    if (id === 'complete') {
      return { id, label: STAGE_LABELS[id], state: 'pending' as const };
    }
    if (completedFlags[id]) {
      return { id, label: STAGE_LABELS[id], state: 'complete' as const };
    }
    if (!activeAssigned) {
      activeAssigned = true;
      return { id, label: STAGE_LABELS[id], state: 'active' as const };
    }
    return { id, label: STAGE_LABELS[id], state: 'pending' as const };
  });
}
