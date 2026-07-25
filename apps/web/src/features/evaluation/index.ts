/**
 * Public interface of the AI evaluation framework (CLAUDE.md §4).
 *
 * Consumers (the `scripts/eval*.ts` CLIs) only ever import from here.
 */
export { runCase, runDataset } from './runner';
export type {
  CompleteStructuredFn,
  DatasetRunResult,
  RunCaseOptions,
  RunDatasetOptions,
} from './runner';

export { computeMetrics, computeMetricsByArchetype } from './metrics';

export { buildRunReport, compareToBaseline, renderMarkdownReport } from './reporter';

export type {
  CalibrationOutcome,
  CaseResult,
  EngineeringArchetype,
  EvaluationMetrics,
  EvaluationRunReport,
  ExpectedSkillOutcome,
  GoldenCase,
  GoldenDataset,
  HallucinatedCitation,
  MetricComparison,
  MetricDirection,
  RegressionReport,
  SkillCitationOutcome,
} from './types';
