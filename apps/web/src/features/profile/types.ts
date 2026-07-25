import type { Database } from '@/lib/supabase/types';

/**
 * Domain types for the Candidate Engineering Profile.
 *
 * Every type here is a read-model shape derived from persisted rows
 * (`analyses`, `skill_assessments`, `assessment_evidence`, `evidence_items`,
 * `repositories`) — nothing in this feature calls Claude or computes a new
 * judgement. Sections 3–7 (Technology Map, Timeline, Collaboration,
 * Ownership, Repository Highlights) are pure aggregation over already-
 * ingested evidence; only sections 1–2 (Engineering Summary, Skill Cards)
 * render AI-authored text, and that text is exactly what
 * `features/analysis` already persisted — never regenerated here.
 */

export type AssessmentLevel = Database['public']['Enums']['assessment_level'];
export type ConfidenceLevel = Database['public']['Enums']['confidence_level'];
export type EvidenceSourceType = Database['public']['Enums']['evidence_source_type'];

/**
 * One evidence item, reduced to what the profile UI renders. `externalUrl`
 * is the direct GitHub link every evidence row carries (CLAUDE.md's
 * evidence pipeline sets this from the source API response) — the
 * Evidence Explorer's "direct GitHub links" requirement falls out of this
 * field, not anything computed here.
 */
export interface EvidenceEntry {
  readonly id: string;
  readonly sourceType: EvidenceSourceType | null;
  readonly title: string;
  readonly occurredAt: string | null;
  readonly authorLogin: string | null;
  readonly externalUrl: string | null;
  readonly repositoryId: string | null;
  readonly repositoryFullName: string | null;
  /** Short structural descriptor (e.g. "+120/-34 · 4 files"), or null when unknown. Never a generated summary. */
  readonly detail: string | null;
}

/** Section 1 — Engineering Summary. */
export interface EngineeringSummarySection {
  readonly summary: string;
  /** Every distinct strength/growth area recorded across all assessed skills, each with the evidence that grounds it. */
  readonly strengths: readonly SupportedClaim[];
  readonly growthAreas: readonly SupportedClaim[];
}

export interface SupportedClaim {
  readonly text: string;
  readonly skillName: string;
  readonly confidence: ConfidenceLevel;
  readonly evidence: readonly [EvidenceEntry, ...EvidenceEntry[]];
}

/** Section 2 — Skill Cards. */
export interface SkillCard {
  readonly assessmentId: string;
  readonly skillSlug: string;
  readonly skillName: string;
  readonly skillDescription: string | null;
  readonly level: AssessmentLevel;
  readonly confidence: ConfidenceLevel;
  readonly reasoning: string;
  readonly strengths: readonly string[];
  readonly growthAreas: readonly string[];
  readonly evidence: readonly EvidenceEntry[];
}

/** Section 3 — Technology Map. One row per language or per topic/tool tag. */
export interface TechnologyMapEntry {
  readonly name: string;
  readonly kind: 'language' | 'topic';
  readonly repositoryCount: number;
  readonly evidenceCount: number;
  readonly lastActivityAt: string | null;
}

/** Section 4 — Engineering Timeline. */
export interface TimelineMonth {
  /** `YYYY-MM`, ascending. */
  readonly month: string;
  readonly commitCount: number;
  readonly pullRequestCount: number;
  readonly reviewCount: number;
  readonly issueCount: number;
  readonly releaseCount: number;
  readonly activeRepositories: readonly string[];
}

export interface LanguageAdoptionEvent {
  readonly language: string;
  readonly repositoryFullName: string;
  readonly firstObservedAt: string;
}

export interface ReleaseEvent {
  readonly repositoryFullName: string;
  readonly tag: string;
  readonly occurredAt: string;
  readonly externalUrl: string | null;
}

export interface EngineeringTimelineSection {
  readonly months: readonly TimelineMonth[];
  readonly languageAdoption: readonly LanguageAdoptionEvent[];
  readonly releases: readonly ReleaseEvent[];
}

/** Section 5 — Collaboration. */
export interface CollaborationSection {
  readonly reviewsGiven: number;
  readonly pullRequestsOpened: number;
  readonly pullRequestsWithReview: number;
  readonly issuesOpened: number;
  readonly issuesParticipated: number;
  readonly repositoriesCollaboratedIn: number;
}

/** Section 6 — Code Ownership. One row per repository. */
export interface RepositoryOwnership {
  readonly repositoryId: string;
  readonly repositoryFullName: string;
  readonly isRepositoryOwner: boolean;
  readonly candidateCommitCount: number | null;
  readonly totalCommitCount: number | null;
  /** 0–1, or null when the underlying counts are unavailable (never a guessed value). */
  readonly commitShare: number | null;
  readonly reviewsGiven: number;
}

/** Section 7 — Repository Highlights. */
export interface RepositoryHighlight {
  readonly repositoryId: string;
  readonly fullName: string;
  readonly description: string | null;
  readonly readmeExcerpt: string | null;
  readonly primaryLanguage: string | null;
  readonly topics: readonly string[];
  readonly externalUrl: string | null;
  readonly evidenceCount: number;
  readonly evidenceCountBySourceType: Readonly<Partial<Record<EvidenceSourceType, number>>>;
}

/** Section 9 — Analysis Metadata. */
export interface AnalysisMetadata {
  readonly analysisId: string;
  readonly status: Database['public']['Enums']['analysis_status'];
  readonly pipelineVersion: string | null;
  readonly promptVersion: string | null;
  readonly model: string | null;
  readonly completedAt: string | null;
  readonly confidence: ConfidenceLevel | null;
  /** Set only when `status` is `partial` — what was excluded and why (CLAUDE.md §19.5, honest partial failure). */
  readonly partialMessage: string | null;
  readonly repositoryCount: number;
  readonly evidenceCount: number;
}

/** The full page's data, assembled by `server/service.ts`. */
export interface ProfileData {
  readonly candidateLogin: string | null;
  readonly analysisMetadata: AnalysisMetadata;
  readonly engineeringSummary: EngineeringSummarySection;
  readonly skillCards: readonly SkillCard[];
  readonly technologyMap: readonly TechnologyMapEntry[];
  readonly timeline: EngineeringTimelineSection;
  readonly collaboration: CollaborationSection;
  readonly ownership: readonly RepositoryOwnership[];
  readonly repositoryHighlights: readonly RepositoryHighlight[];
  /** All evidence for the Evidence Explorer, most-recent-first. */
  readonly evidence: readonly EvidenceEntry[];
}

/** Discriminated result so the page can render the right empty/error state (CLAUDE.md §8.7). */
export type ProfileResult =
  | { readonly status: 'no_analysis' }
  | {
      readonly status: 'not_ready';
      readonly analysisStatus: Database['public']['Enums']['analysis_status'];
    }
  | { readonly status: 'failed'; readonly errorMessage: string | null }
  | { readonly status: 'ready'; readonly data: ProfileData };
