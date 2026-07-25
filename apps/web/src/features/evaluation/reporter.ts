import { computeMetrics, computeMetricsByArchetype } from './metrics';
import type {
  CaseResult,
  EvaluationMetrics,
  EvaluationRunReport,
  MetricComparison,
  MetricDirection,
  RegressionReport,
} from './types';

/**
 * Builds the JSON run report and its Markdown rendering, and detects
 * regressions against a previously accepted baseline.
 *
 * Regression policy: see the feature README. In short — a metric is
 * `regressed` only if it moved against its direction by more than a small
 * tolerance band, so ordinary run-to-run model variance isn't reported as a
 * false regression; everything else is `improved` or `unchanged`.
 */

export function buildRunReport(
  runId: string,
  startedAt: string,
  finishedAt: string,
  model: string,
  promptVersion: string,
  pipelineVersion: string,
  caseResults: readonly CaseResult[],
): EvaluationRunReport {
  return {
    runId,
    startedAt,
    finishedAt,
    model,
    promptVersion,
    pipelineVersion,
    metrics: computeMetrics(caseResults, model),
    metricsByArchetype: computeMetricsByArchetype(caseResults, model),
    caseResults,
  };
}

interface MetricSpec {
  readonly key: string;
  readonly label: string;
  readonly direction: MetricDirection;
  readonly extract: (metrics: EvaluationMetrics) => number;
  /** Absolute tolerance for ratio/score metrics; ignored when `relative` is true. */
  readonly tolerance: number;
  readonly relative?: boolean;
}

const METRIC_SPECS: readonly MetricSpec[] = [
  {
    key: 'overallScore',
    label: 'Overall score',
    direction: 'higher_is_better',
    extract: (m) => m.overallScore,
    tolerance: 2,
  },
  {
    key: 'passRate',
    label: 'Case pass rate',
    direction: 'higher_is_better',
    extract: (m) => (m.caseCount === 0 ? 0 : m.passedCaseCount / m.caseCount),
    tolerance: 0.02,
  },
  {
    key: 'skillPrecision',
    label: 'Skill precision',
    direction: 'higher_is_better',
    extract: (m) => m.skillPrecision,
    tolerance: 0.02,
  },
  {
    key: 'skillRecall',
    label: 'Skill recall',
    direction: 'higher_is_better',
    extract: (m) => m.skillRecall,
    tolerance: 0.02,
  },
  {
    key: 'missingSkillRate',
    label: 'Missing skill rate',
    direction: 'lower_is_better',
    extract: (m) => m.missingSkillRate,
    tolerance: 0.02,
  },
  {
    key: 'extraSkillRate',
    label: 'Extra skill rate',
    direction: 'lower_is_better',
    extract: (m) => m.extraSkillRate,
    tolerance: 0.02,
  },
  {
    key: 'citationPrecision',
    label: 'Citation precision',
    direction: 'higher_is_better',
    extract: (m) => m.citationPrecision,
    tolerance: 0.02,
  },
  {
    key: 'citationRecall',
    label: 'Citation recall',
    direction: 'higher_is_better',
    extract: (m) => m.citationRecall,
    tolerance: 0.02,
  },
  {
    key: 'hallucinatedCitationRate',
    label: 'Hallucinated citation rate',
    direction: 'lower_is_better',
    extract: (m) => m.hallucinatedCitationRate,
    tolerance: 0,
  },
  {
    key: 'calibrationAccuracy',
    label: 'Confidence calibration accuracy',
    direction: 'higher_is_better',
    extract: (m) => m.calibrationAccuracy,
    tolerance: 0.02,
  },
  {
    key: 'overconfidenceRate',
    label: 'Overconfidence rate',
    direction: 'lower_is_better',
    extract: (m) => m.overconfidenceRate,
    tolerance: 0.02,
  },
  {
    key: 'underconfidenceRate',
    label: 'Underconfidence rate',
    direction: 'lower_is_better',
    extract: (m) => m.underconfidenceRate,
    tolerance: 0.02,
  },
  {
    key: 'averageInputTokens',
    label: 'Average input tokens',
    direction: 'lower_is_better',
    extract: (m) => m.averageInputTokens,
    tolerance: 0.05,
    relative: true,
  },
  {
    key: 'averageOutputTokens',
    label: 'Average output tokens',
    direction: 'lower_is_better',
    extract: (m) => m.averageOutputTokens,
    tolerance: 0.05,
    relative: true,
  },
  {
    key: 'averageLatencyMs',
    label: 'Average latency (ms)',
    direction: 'lower_is_better',
    extract: (m) => m.averageLatencyMs,
    tolerance: 0.1,
    relative: true,
  },
  {
    key: 'estimatedCostUsd',
    label: 'Estimated cost (USD)',
    direction: 'lower_is_better',
    extract: (m) => m.estimatedCostUsd,
    tolerance: 0.05,
    relative: true,
  },
];

function withinTolerance(spec: MetricSpec, baseline: number, delta: number): boolean {
  if (spec.relative) {
    if (baseline === 0) {
      return delta === 0;
    }
    return Math.abs(delta) / Math.abs(baseline) <= spec.tolerance;
  }
  return Math.abs(delta) <= spec.tolerance;
}

function compareMetric(spec: MetricSpec, baseline: number, current: number): MetricComparison {
  const delta = current - baseline;
  const unchanged = withinTolerance(spec, baseline, delta);
  const improvedDirection = spec.direction === 'higher_is_better' ? delta > 0 : delta < 0;

  return {
    metric: spec.label,
    direction: spec.direction,
    baseline,
    current,
    delta,
    verdict: unchanged ? 'unchanged' : improvedDirection ? 'improved' : 'regressed',
  };
}

export function compareToBaseline(
  current: EvaluationRunReport,
  baseline: EvaluationRunReport | null,
): RegressionReport {
  if (!baseline) {
    return {
      hasBaseline: false,
      baselineRunId: null,
      comparisons: [],
      regressed: [],
      improved: [],
    };
  }

  const comparisons = METRIC_SPECS.map((spec) =>
    compareMetric(spec, spec.extract(baseline.metrics), spec.extract(current.metrics)),
  );

  return {
    hasBaseline: true,
    baselineRunId: baseline.runId,
    comparisons,
    regressed: comparisons.filter((c) => c.verdict === 'regressed'),
    improved: comparisons.filter((c) => c.verdict === 'improved'),
  };
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatMetricValue(spec: MetricSpec, value: number): string {
  if (spec.key === 'overallScore') {
    return value.toFixed(0);
  }
  if (spec.key === 'estimatedCostUsd') {
    return `$${value.toFixed(4)}`;
  }
  if (spec.key === 'averageLatencyMs') {
    return `${value.toFixed(0)} ms`;
  }
  if (spec.relative) {
    return value.toFixed(1);
  }
  return formatPercent(value);
}

function renderMetricsTable(metrics: EvaluationMetrics): string {
  const rows = METRIC_SPECS.map(
    (spec) => `| ${spec.label} | ${formatMetricValue(spec, spec.extract(metrics))} |`,
  );
  return ['| Metric | Value |', '|---|---|', ...rows].join('\n');
}

function renderRegressionSection(regression: RegressionReport): string {
  if (!regression.hasBaseline) {
    return '_No baseline found — this is the first recorded run. Promote it with `npm run eval -- --promote` once reviewed, to enable regression detection on the next run._';
  }

  const rows = regression.comparisons.map(
    (c) =>
      `| ${c.metric} | ${c.baseline.toFixed(4)} | ${c.current.toFixed(4)} | ${c.delta >= 0 ? '+' : ''}${c.delta.toFixed(4)} | ${c.verdict} |`,
  );

  const verdictSummary =
    regression.regressed.length > 0
      ? `**${regression.regressed.length} metric(s) regressed** — this prompt/model change does not meet the release gate (see Prompt Acceptance Criteria in the feature README).`
      : regression.improved.length > 0
        ? `${regression.improved.length} metric(s) improved, none regressed.`
        : 'No material change against the baseline.';

  return [
    `Baseline run: \`${regression.baselineRunId}\``,
    '',
    verdictSummary,
    '',
    '| Metric | Baseline | Current | Delta | Verdict |',
    '|---|---|---|---|---|',
    ...rows,
  ].join('\n');
}

function renderCaseTable(caseResults: readonly CaseResult[]): string {
  const rows = caseResults.map((c) => {
    const status = c.passed ? 'pass' : 'FAIL';
    const skillNote =
      c.missingSkillSlugs.length + c.extraSkillSlugs.length === 0
        ? '—'
        : [
            c.missingSkillSlugs.length > 0 ? `missing: ${c.missingSkillSlugs.join(', ')}` : null,
            c.extraSkillSlugs.length > 0 ? `extra: ${c.extraSkillSlugs.join(', ')}` : null,
          ]
            .filter((part): part is string => part !== null)
            .join('; ');
    const failureNote = c.failureReason ? ` — ${c.failureReason}` : '';
    return `| ${c.caseId} | ${c.archetype} | ${status}${failureNote} | ${skillNote} |`;
  });

  return ['| Case | Archetype | Status | Skill notes |', '|---|---|---|---|', ...rows].join('\n');
}

export function renderMarkdownReport(
  report: EvaluationRunReport,
  regression: RegressionReport,
): string {
  const archetypeSections = Object.entries(report.metricsByArchetype)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([archetype, metrics]) => `### ${archetype}\n\n${renderMetricsTable(metrics)}`);

  return [
    `# Evaluation Report — ${report.runId}`,
    '',
    `- Model: \`${report.model}\``,
    `- Prompt version: \`${report.promptVersion}\``,
    `- Pipeline version: \`${report.pipelineVersion}\``,
    `- Run window: ${report.startedAt} → ${report.finishedAt}`,
    `- Cases: ${report.metrics.caseCount} (${report.metrics.passedCaseCount} passed)`,
    '',
    '## Overall',
    '',
    renderMetricsTable(report.metrics),
    '',
    '## Regression vs. baseline',
    '',
    renderRegressionSection(regression),
    '',
    '## By archetype',
    '',
    ...archetypeSections,
    '',
    '## Cases',
    '',
    renderCaseTable(report.caseResults),
    '',
  ].join('\n');
}
