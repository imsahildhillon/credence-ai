import type { Database } from '@/lib/supabase/types';

/**
 * GitHub REST shapes this pipeline consumes — only the fields we actually
 * read. A boundary declares exactly what it depends on (CLAUDE.md §6.7), and
 * none of these types ever leave the server: they are normalized into
 * `NormalizedEvidence` before anything is persisted or rendered.
 */

export interface GhOwnerRef {
  readonly login: string;
}

export interface GhRepository {
  readonly id: number;
  readonly name: string;
  readonly full_name: string;
  readonly description: string | null;
  readonly private: boolean;
  readonly fork: boolean;
  readonly archived: boolean;
  readonly language: string | null;
  readonly default_branch: string;
  readonly topics?: string[];
  readonly stargazers_count: number;
  readonly forks_count: number;
  readonly open_issues_count: number;
  readonly size: number;
  readonly created_at: string | null;
  readonly pushed_at: string | null;
  readonly html_url: string;
  readonly owner: GhOwnerRef | null;
}

export interface GhReadme {
  readonly name: string;
  readonly path: string;
  readonly size: number;
  readonly html_url: string | null;
  readonly content: string;
  readonly encoding: string;
}

export interface GhCommitSummary {
  readonly sha: string;
  readonly html_url: string;
  readonly commit: {
    readonly message: string;
    readonly author: { readonly name: string | null; readonly date: string | null } | null;
  };
  readonly author: GhOwnerRef | null;
}

export interface GhCommitFile {
  readonly filename: string;
  readonly additions: number;
  readonly deletions: number;
  readonly status: string;
}

export interface GhCommitDetail extends GhCommitSummary {
  readonly stats?: { readonly additions: number; readonly deletions: number };
  readonly files?: GhCommitFile[];
}

export interface GhLabel {
  readonly name: string;
}

export interface GhPullRequestSummary {
  readonly id: number;
  readonly number: number;
  readonly title: string;
  readonly body: string | null;
  readonly state: string;
  readonly draft?: boolean;
  readonly created_at: string;
  readonly merged_at: string | null;
  readonly closed_at: string | null;
  readonly html_url: string;
  readonly user: GhOwnerRef | null;
  readonly labels: GhLabel[];
}

export interface GhPullRequestDetail extends GhPullRequestSummary {
  readonly merged?: boolean;
  readonly comments?: number;
  readonly review_comments?: number;
  readonly commits?: number;
  readonly additions?: number;
  readonly deletions?: number;
  readonly changed_files?: number;
}

export interface GhReview {
  readonly id: number;
  readonly state: string;
  readonly submitted_at: string | null;
  readonly html_url: string;
  readonly user: GhOwnerRef | null;
}

export interface GhIssue {
  readonly id: number;
  readonly number: number;
  readonly title: string;
  readonly state: string;
  readonly created_at: string;
  readonly closed_at: string | null;
  readonly html_url: string;
  readonly user: GhOwnerRef | null;
  readonly labels: GhLabel[];
  readonly assignees: GhOwnerRef[];
  /** Present only when the "issue" is really a pull request — such rows are skipped. */
  readonly pull_request?: unknown;
}

export interface GhRelease {
  readonly id: number;
  readonly tag_name: string;
  readonly name: string | null;
  readonly draft: boolean;
  readonly prerelease: boolean;
  readonly created_at: string | null;
  readonly published_at: string | null;
  readonly html_url: string;
  readonly author: GhOwnerRef | null;
}

export interface GhContributor {
  readonly id: number;
  readonly login: string;
  readonly contributions: number;
  readonly html_url: string;
  readonly type: string;
}

/* ------------------------------------------------------------------ */
/* Normalized domain                                                    */
/* ------------------------------------------------------------------ */

export type EvidenceSourceType = Database['public']['Enums']['evidence_source_type'];
export type EvidenceItemInsert = Database['public']['Tables']['evidence_items']['Insert'];
export type AnalysisRow = Database['public']['Tables']['analyses']['Row'];
export type AnalysisRepositoryRow = Database['public']['Tables']['analysis_repositories']['Row'];

/**
 * One normalized engineering signal, independent of GitHub's wire format.
 * `githubId` is the deterministic upstream identity (numeric id, or commit
 * SHA) that makes ingestion idempotent.
 */
export interface NormalizedEvidence {
  readonly sourceType: EvidenceSourceType;
  readonly githubId: string;
  readonly title: string;
  readonly occurredAt: string | null;
  readonly authorLogin: string | null;
  readonly rawUrl: string | null;
  readonly payload: Record<string, unknown>;
}

/** Which collection step failed, for `analysis_errors.stage`. */
export type IngestionStage =
  | 'repository'
  | 'readme'
  | 'commits'
  | 'pull_requests'
  | 'reviews'
  | 'issues'
  | 'releases'
  | 'contributors'
  | 'persistence'
  | 'credentials';

export interface IngestionFailure {
  readonly stage: IngestionStage;
  readonly kind: string;
  readonly message: string;
  readonly retryable: boolean;
}

export interface RepositoryIngestionResult {
  readonly evidence: NormalizedEvidence[];
  readonly failures: IngestionFailure[];
}

export interface AnalysisRunSummary {
  readonly analysisId: string;
  readonly status: Database['public']['Enums']['analysis_status'];
  readonly repositoriesProcessed: number;
  readonly evidenceUpserted: number;
  readonly failures: number;
}
