import type {
  AggregatableEvidence,
  RepositoryContext,
  SkillRow,
} from '@/features/analysis/aggregator';
import type { AssessmentLevel, ConfidenceLevel } from '@/features/analysis/types';
import type { AiUsage } from '@/lib/ai/client';

/**
 * Types for the deterministic AI evaluation framework.
 *
 * This feature measures assessment-engine quality against a fixed golden
 * dataset (CLAUDE.md §17.9 / §22.5 — a regression suite that must run before
 * any prompt/model/pipeline change ships). It is read-only with respect to
 * `features/analysis`: it imports pure functions and types from that
 * feature's internal modules (not only its public `index.ts`) so it can
 * exercise the *real* aggregation, prompt, and citation-validation logic
 * against fixture data instead of live database rows. See the feature
 * README for why this is a deliberate, documented exception to the usual
 * "cross-feature access goes through index.ts" rule (CLAUDE.md §4) — it
 * changes nothing in `features/analysis`, it only reads from it.
 */

export type EngineeringArchetype =
  'frontend' | 'backend' | 'fullstack' | 'ml' | 'mobile' | 'oss_maintainer' | 'beginner' | 'senior';

/**
 * Ground truth for one skill within a golden case.
 *
 * `expectedEvidenceIds` is the fixture author's judgement of which evidence
 * *legitimately* supports this skill — it is what citation precision/recall
 * are measured against, not what the model happens to cite.
 */
export interface ExpectedSkillOutcome {
  readonly skillSlug: string;
  readonly expectedLevel: AssessmentLevel;
  readonly expectedConfidenceBand: ConfidenceLevel;
  readonly expectedEvidenceIds: readonly string[];
}

/**
 * One golden-dataset case: a synthetic engineering portfolio plus the
 * assessment a careful human reviewer would expect from it.
 *
 * Evidence ids are fixture-defined strings (not database UUIDs) — the
 * dataset never touches Supabase, so it is portable, fast, and safe to run
 * anywhere (including CI) without seeding or cleaning up rows.
 */
export interface GoldenCase {
  readonly id: string;
  readonly archetype: EngineeringArchetype;
  readonly description: string;
  readonly candidateLogin: string;
  readonly repositories: readonly RepositoryContext[];
  readonly evidence: readonly AggregatableEvidence[];
  readonly repositoriesWithErrors?: number;
  readonly expectedSkills: readonly ExpectedSkillOutcome[];
  /**
   * Skills the fixture deliberately does NOT support — asserting one of
   * these confidently is a stronger signal than an ordinary "extra" skill
   * (CLAUDE.md §17.10 — the model must not infer beyond the evidence).
   */
  readonly unsupportedSkills?: readonly string[];
}

export interface GoldenDataset {
  readonly cases: readonly GoldenCase[];
  readonly skills: readonly SkillRow[];
}

/** One rejected raw citation, kept only for reporting — never persisted anywhere. */
export interface HallucinatedCitation {
  readonly skillSlug: string;
  readonly evidenceId: string;
}

export type CalibrationOutcome = 'calibrated' | 'overconfident' | 'underconfident';

export interface SkillCitationOutcome {
  readonly skillSlug: string;
  readonly matchedExpected: boolean;
  readonly citedEvidenceIds: readonly string[];
  readonly expectedEvidenceIds: readonly string[];
  readonly truePositives: number;
  readonly falsePositives: number;
  readonly falseNegatives: number;
  readonly actualConfidence: ConfidenceLevel | null;
  readonly expectedConfidence: ConfidenceLevel | null;
  readonly calibration: CalibrationOutcome | null;
}

/**
 * The outcome of running one golden case through the real assessment
 * pipeline (aggregation → prompt → model → mapper).
 *
 * `passed` is a hard gate, independent of the composite score: it is false
 * whenever the model call itself failed, or a raw citation named an
 * evidence id that does not exist in this case's evidence set (CLAUDE.md
 * §17.9 — evidence-grounding is a release gate, not a dashboard number).
 */
export interface CaseResult {
  readonly caseId: string;
  readonly archetype: EngineeringArchetype;
  readonly passed: boolean;
  readonly failureReason: string | null;
  readonly latencyMs: number | null;
  readonly usage: AiUsage | null;
  readonly assessedSkillSlugs: readonly string[];
  readonly expectedSkillSlugs: readonly string[];
  readonly missingSkillSlugs: readonly string[];
  readonly extraSkillSlugs: readonly string[];
  readonly forbiddenSkillSlugs: readonly string[];
  readonly hallucinatedCitations: readonly HallucinatedCitation[];
  readonly skillCitationOutcomes: readonly SkillCitationOutcome[];
}

export interface EvaluationMetrics {
  readonly caseCount: number;
  readonly passedCaseCount: number;
  readonly skillPrecision: number;
  readonly skillRecall: number;
  readonly missingSkillRate: number;
  readonly extraSkillRate: number;
  readonly citationPrecision: number;
  readonly citationRecall: number;
  readonly hallucinatedCitationRate: number;
  readonly hallucinatedCitationCount: number;
  readonly calibrationAccuracy: number;
  readonly overconfidenceRate: number;
  readonly underconfidenceRate: number;
  readonly averageInputTokens: number;
  readonly averageOutputTokens: number;
  readonly averageLatencyMs: number;
  readonly estimatedCostUsd: number;
  /** 0–100 composite; 0 whenever any hallucination occurred (integrity dominates). */
  readonly overallScore: number;
}

export interface EvaluationRunReport {
  readonly runId: string;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly model: string;
  readonly promptVersion: string;
  readonly pipelineVersion: string;
  readonly metrics: EvaluationMetrics;
  readonly metricsByArchetype: Readonly<Record<string, EvaluationMetrics>>;
  readonly caseResults: readonly CaseResult[];
}

export type MetricDirection = 'higher_is_better' | 'lower_is_better';

export interface MetricComparison {
  readonly metric: string;
  readonly direction: MetricDirection;
  readonly baseline: number;
  readonly current: number;
  readonly delta: number;
  readonly verdict: 'improved' | 'regressed' | 'unchanged';
}

export interface RegressionReport {
  readonly hasBaseline: boolean;
  readonly baselineRunId: string | null;
  readonly comparisons: readonly MetricComparison[];
  readonly regressed: readonly MetricComparison[];
  readonly improved: readonly MetricComparison[];
}
