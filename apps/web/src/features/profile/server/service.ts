import 'server-only';

import { getCurrentUser } from '@/features/auth/server/service';

import type {
  AnalysisMetadata,
  EngineeringSummarySection,
  EvidenceEntry,
  ProfileResult,
  SkillCard,
  SupportedClaim,
} from '../types';

import {
  buildCollaboration,
  buildOwnership,
  buildRepositoryHighlights,
  buildTechnologyMap,
  buildTimeline,
  toEvidenceEntry,
} from './aggregator';
import {
  getGithubUsername,
  getLatestAnalysis,
  listAllEvidence,
  listAssessmentEvidenceLinks,
  listCurrentSkillAssessments,
  listRepositoriesByIds,
  type RepositoryRow,
} from './queries';

/**
 * Orchestrates the Candidate Engineering Profile: fetches every row the
 * page needs (a small, fixed set of batched queries — see `queries.ts`) and
 * assembles it into `ProfileData`. This is the only layer route handlers
 * and pages call (CLAUDE.md §14.1); it contains no Supabase client
 * construction of its own and no Claude calls — sections 1–2 render text
 * `features/analysis` already persisted, sections 3–7 call the pure
 * aggregator in this same directory.
 */

const READY_STATUSES = new Set(['completed', 'partial']);

function buildAnalysisMetadata(
  analysis: NonNullable<Awaited<ReturnType<typeof getLatestAnalysis>>>,
  repositoryCount: number,
  evidenceCount: number,
): AnalysisMetadata {
  return {
    analysisId: analysis.id,
    status: analysis.status,
    pipelineVersion: analysis.pipeline_version,
    promptVersion: analysis.prompt_version,
    model: analysis.model,
    completedAt: analysis.completed_at,
    confidence: analysis.confidence,
    partialMessage: analysis.status === 'partial' ? analysis.error_message : null,
    repositoryCount,
    evidenceCount,
  };
}

function buildEngineeringSummary(
  analysisSummary: string | null,
  skillCards: readonly SkillCard[],
): EngineeringSummarySection {
  const strengths: SupportedClaim[] = [];
  const growthAreas: SupportedClaim[] = [];

  for (const card of skillCards) {
    if (card.evidence.length === 0) {
      // Every persisted assessment carries at least one evidence link
      // (enforced by `persist_skill_assessment` — ADR-007); this branch
      // exists only so a data anomaly is silently excluded from the
      // summary rather than rendered as an unsupported claim.
      continue;
    }
    const groundedEvidence = card.evidence as readonly [EvidenceEntry, ...EvidenceEntry[]];
    for (const strength of card.strengths) {
      strengths.push({
        text: strength,
        skillName: card.skillName,
        confidence: card.confidence,
        evidence: groundedEvidence,
      });
    }
    for (const growthArea of card.growthAreas) {
      growthAreas.push({
        text: growthArea,
        skillName: card.skillName,
        confidence: card.confidence,
        evidence: groundedEvidence,
      });
    }
  }

  return {
    summary: analysisSummary ?? 'No summary is available for this analysis yet.',
    strengths,
    growthAreas,
  };
}

export async function getProfileForCurrentUser(): Promise<ProfileResult> {
  const user = await getCurrentUser();
  if (!user) {
    // The route itself redirects unauthenticated visitors (CLAUDE.md
    // §18.2 defense in depth); this function still fails closed rather
    // than assume the caller already checked.
    return { status: 'no_analysis' };
  }

  const analysis = await getLatestAnalysis();
  if (!analysis) {
    return { status: 'no_analysis' };
  }
  if (analysis.status === 'failed') {
    return { status: 'failed', errorMessage: analysis.error_message };
  }
  if (!READY_STATUSES.has(analysis.status)) {
    return { status: 'not_ready', analysisStatus: analysis.status };
  }

  const [candidateLogin, assessmentRows, evidenceRows] = await Promise.all([
    getGithubUsername(user.id),
    listCurrentSkillAssessments(user.id),
    listAllEvidence(user.id),
  ]);

  const repositoryIds = [
    ...new Set(evidenceRows.flatMap((row) => (row.repository_id ? [row.repository_id] : []))),
  ];
  const repositories = await listRepositoriesByIds(repositoryIds);
  const repositoriesById = new Map<string, RepositoryRow>(repositories.map((r) => [r.id, r]));

  const evidence = evidenceRows.map((row) => toEvidenceEntry(row, repositoriesById));
  const evidenceById = new Map<string, EvidenceEntry>(evidence.map((e) => [e.id, e]));

  const evidenceLinks = await listAssessmentEvidenceLinks(assessmentRows.map((a) => a.id));
  const evidenceIdsByAssessment = new Map<string, string[]>();
  for (const link of evidenceLinks) {
    const bucket = evidenceIdsByAssessment.get(link.assessment_id) ?? [];
    bucket.push(link.evidence_item_id);
    evidenceIdsByAssessment.set(link.assessment_id, bucket);
  }

  const skillCards: SkillCard[] = assessmentRows
    .map((row) => ({
      assessmentId: row.id,
      skillSlug: row.skill.slug,
      skillName: row.skill.name,
      skillDescription: row.skill.description,
      level: row.level,
      confidence: row.confidence,
      reasoning: row.reasoning,
      strengths: row.strengths,
      growthAreas: row.growth_areas,
      evidence: (evidenceIdsByAssessment.get(row.id) ?? []).flatMap((id) => {
        const entry = evidenceById.get(id);
        return entry ? [entry] : [];
      }),
    }))
    .sort((a, b) => a.skillName.localeCompare(b.skillName));

  return {
    status: 'ready',
    data: {
      candidateLogin,
      analysisMetadata: buildAnalysisMetadata(analysis, repositoryIds.length, evidence.length),
      engineeringSummary: buildEngineeringSummary(analysis.summary, skillCards),
      skillCards,
      technologyMap: buildTechnologyMap(evidenceRows),
      timeline: buildTimeline(evidenceRows, repositoriesById),
      collaboration: buildCollaboration(evidenceRows, candidateLogin),
      ownership: buildOwnership(evidenceRows, repositoriesById, candidateLogin),
      repositoryHighlights: buildRepositoryHighlights(evidenceRows, repositoriesById),
      evidence,
    },
  };
}
