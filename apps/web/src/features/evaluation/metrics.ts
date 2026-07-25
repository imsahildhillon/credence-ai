import type { CaseResult, EvaluationMetrics } from './types';

/**
 * Pure metric computation over a completed evaluation run. Nothing here
 * calls the API, touches the filesystem, or has side effects — every
 * function is a straight reduction over `CaseResult[]`, which is what
 * makes the whole framework "deterministic" for a fixed set of model
 * responses (CLAUDE.md §22.1 — pure domain logic gets unit tests, no I/O).
 *
 * Precision/recall/citation figures below are **micro-averaged** (sum the
 * intersections and totals across every case, then divide once) rather
 * than averaged per-case-then-averaged-again — that keeps a handful of
 * large, evidence-rich cases from being drowned out by many small ones,
 * and avoids division-by-zero noise from cases with an empty expected set.
 */

/** Published per-token pricing, USD per million tokens (cached: 2026-06-24). */
const MODEL_PRICING: Readonly<Record<string, { readonly input: number; readonly output: number }>> =
  {
    'claude-opus-4-8': { input: 5.0, output: 25.0 },
    'claude-opus-4-7': { input: 5.0, output: 25.0 },
    'claude-opus-4-6': { input: 5.0, output: 25.0 },
    'claude-sonnet-5': { input: 3.0, output: 15.0 },
    'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
    'claude-haiku-4-5': { input: 1.0, output: 5.0 },
  };

/** Fallback used only when a model id isn't in the table above — keep it conservative (Opus-tier). */
const DEFAULT_PRICING = { input: 5.0, output: 25.0 };

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function estimateCaseCostUsd(caseResult: CaseResult, model: string): number {
  if (!caseResult.usage) {
    return 0;
  }
  const pricing = MODEL_PRICING[model] ?? DEFAULT_PRICING;
  const { inputTokens, outputTokens, cacheReadInputTokens, cacheCreationInputTokens } =
    caseResult.usage;
  // Cache reads run at ~0.1x input price, cache writes at ~1.25x — see
  // shared/prompt-caching.md. `inputTokens` from the SDK already excludes
  // cached tokens, so no double-count.
  const effectiveInputCost =
    (inputTokens * pricing.input) / 1_000_000 +
    (cacheReadInputTokens * pricing.input * 0.1) / 1_000_000 +
    (cacheCreationInputTokens * pricing.input * 1.25) / 1_000_000;
  const outputCost = (outputTokens * pricing.output) / 1_000_000;
  return effectiveInputCost + outputCost;
}

/**
 * The 0–100 composite score. Deliberately punitive on integrity: any
 * hallucinated citation anywhere in the run collapses the score to zero,
 * because CLAUDE.md §17.9 treats evidence-grounding as a release gate, not
 * one input among several — a prompt that hallucinates less often but still
 * hallucinates has not passed, whatever its other metrics show.
 *
 * Also scaled by the case pass rate: a run where half the cases failed
 * outright (a model-call error, or an empty aggregation) must not score
 * well just because the handful of cases that *did* run went cleanly — the
 * zero-assessment ratio metrics below would otherwise read as a trivial
 * "no false positives" pass.
 */
function computeOverallScore(metrics: Omit<EvaluationMetrics, 'overallScore'>): number {
  if (metrics.hallucinatedCitationCount > 0) {
    return 0;
  }

  const passRate = metrics.caseCount === 0 ? 0 : metrics.passedCaseCount / metrics.caseCount;
  const skillF1 = harmonicMean(metrics.skillPrecision, metrics.skillRecall);
  const citationF1 = harmonicMean(metrics.citationPrecision, metrics.citationRecall);

  const weighted =
    passRate *
    (skillF1 * 0.35 +
      citationF1 * 0.35 +
      metrics.calibrationAccuracy * 0.2 +
      (1 - metrics.extraSkillRate) * 0.1);

  return Math.round(weighted * 100);
}

function harmonicMean(precision: number, recall: number): number {
  return precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
}

export function computeMetrics(
  caseResults: readonly CaseResult[],
  model: string,
): EvaluationMetrics {
  let expectedSkillTotal = 0;
  let assessedSkillTotal = 0;
  let matchedSkillTotal = 0;
  let missingSkillTotal = 0;
  let extraSkillTotal = 0;

  let citedTotal = 0;
  let expectedEvidenceTotal = 0;
  let citationTruePositiveTotal = 0;

  let hallucinatedCitationCount = 0;

  let calibratedCount = 0;
  let overconfidentCount = 0;
  let underconfidentCount = 0;
  let calibrationJudgedCount = 0;

  for (const caseResult of caseResults) {
    expectedSkillTotal += caseResult.expectedSkillSlugs.length;
    assessedSkillTotal += caseResult.assessedSkillSlugs.length;
    missingSkillTotal += caseResult.missingSkillSlugs.length;
    extraSkillTotal += caseResult.extraSkillSlugs.length;
    matchedSkillTotal += caseResult.expectedSkillSlugs.length - caseResult.missingSkillSlugs.length;

    hallucinatedCitationCount += caseResult.hallucinatedCitations.length;

    for (const outcome of caseResult.skillCitationOutcomes) {
      if (!outcome.matchedExpected) {
        continue;
      }
      citedTotal += outcome.citedEvidenceIds.length;
      expectedEvidenceTotal += outcome.expectedEvidenceIds.length;
      citationTruePositiveTotal += outcome.truePositives;

      if (outcome.calibration !== null) {
        calibrationJudgedCount += 1;
        if (outcome.calibration === 'calibrated') {
          calibratedCount += 1;
        } else if (outcome.calibration === 'overconfident') {
          overconfidentCount += 1;
        } else {
          underconfidentCount += 1;
        }
      }
    }
  }

  const passedCaseCount = caseResults.filter((c) => c.passed).length;
  const usages = caseResults.flatMap((c) => (c.usage ? [c.usage] : []));
  const latencies = caseResults.flatMap((c) => (c.latencyMs !== null ? [c.latencyMs] : []));

  const base: Omit<EvaluationMetrics, 'overallScore'> = {
    caseCount: caseResults.length,
    passedCaseCount,
    skillPrecision: ratio(matchedSkillTotal, assessedSkillTotal),
    skillRecall: ratio(matchedSkillTotal, expectedSkillTotal),
    missingSkillRate: ratio(missingSkillTotal, expectedSkillTotal),
    extraSkillRate: ratio(extraSkillTotal, assessedSkillTotal),
    citationPrecision: ratio(citationTruePositiveTotal, citedTotal),
    citationRecall: ratio(citationTruePositiveTotal, expectedEvidenceTotal),
    hallucinatedCitationRate: ratio(
      hallucinatedCitationCount,
      caseResults.reduce((sum, c) => sum + c.assessedSkillSlugs.length, 0) || 1,
    ),
    hallucinatedCitationCount,
    calibrationAccuracy: ratio(calibratedCount, calibrationJudgedCount),
    overconfidenceRate: ratio(overconfidentCount, calibrationJudgedCount),
    underconfidenceRate: ratio(underconfidentCount, calibrationJudgedCount),
    averageInputTokens: mean(usages.map((u) => u.inputTokens)),
    averageOutputTokens: mean(usages.map((u) => u.outputTokens)),
    averageLatencyMs: mean(latencies),
    estimatedCostUsd: caseResults.reduce((sum, c) => sum + estimateCaseCostUsd(c, model), 0),
  };

  return { ...base, overallScore: computeOverallScore(base) };
}

export function computeMetricsByArchetype(
  caseResults: readonly CaseResult[],
  model: string,
): Readonly<Record<string, EvaluationMetrics>> {
  const byArchetype = new Map<string, CaseResult[]>();
  for (const caseResult of caseResults) {
    const bucket = byArchetype.get(caseResult.archetype);
    if (bucket) {
      bucket.push(caseResult);
    } else {
      byArchetype.set(caseResult.archetype, [caseResult]);
    }
  }

  const result: Record<string, EvaluationMetrics> = {};
  for (const [archetype, results] of byArchetype) {
    result[archetype] = computeMetrics(results, model);
  }
  return result;
}
