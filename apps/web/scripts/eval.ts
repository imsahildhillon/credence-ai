import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { GOLDEN_DATASET } from '@datasets/golden';

import {
  buildRunReport,
  compareToBaseline,
  renderMarkdownReport,
  runDataset,
  type EvaluationRunReport,
} from '@/features/evaluation';

/**
 * `npm run eval` — runs the golden dataset against the real Claude API and
 * writes a JSON + Markdown report.
 *
 * Flags:
 *   --limit <n>       Run only the first n cases (fast local iteration)
 *   --case <id,id>    Run only the named case ids (comma-separated)
 *   --promote         After a successful run, copy it to eval-reports/baseline.json
 *   --out-dir <path>  Report directory (default: eval-reports)
 *
 * Exit code is non-zero whenever any case failed or any metric regressed
 * against the baseline — this is the release gate (see feature README).
 */

interface CliArgs {
  readonly limit: number | null;
  readonly caseIds: readonly string[] | null;
  readonly promote: boolean;
  readonly outDir: string;
}

function parseArgs(argv: readonly string[]): CliArgs {
  let limit: number | null = null;
  let caseIds: readonly string[] | null = null;
  let promote = false;
  let outDir = 'eval-reports';

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--limit') {
      const value = argv[i + 1];
      limit = value ? Number.parseInt(value, 10) : null;
      i += 1;
    } else if (arg === '--case') {
      const value = argv[i + 1];
      caseIds = value ? value.split(',').map((id) => id.trim()) : null;
      i += 1;
    } else if (arg === '--promote') {
      promote = true;
    } else if (arg === '--out-dir') {
      const value = argv[i + 1];
      outDir = value ?? outDir;
      i += 1;
    }
  }

  return { limit, caseIds, promote, outDir };
}

async function loadBaseline(outDir: string): Promise<EvaluationRunReport | null> {
  try {
    const raw = await readFile(path.join(outDir, 'baseline.json'), 'utf-8');
    return JSON.parse(raw) as EvaluationRunReport;
  } catch {
    return null;
  }
}

function summarizeBySkill(report: EvaluationRunReport): string {
  const bySkill = new Map<string, { expected: number; assessed: number; missing: number }>();

  for (const caseResult of report.caseResults) {
    for (const slug of caseResult.expectedSkillSlugs) {
      const entry = bySkill.get(slug) ?? { expected: 0, assessed: 0, missing: 0 };
      entry.expected += 1;
      bySkill.set(slug, entry);
    }
    for (const slug of caseResult.missingSkillSlugs) {
      const entry = bySkill.get(slug) ?? { expected: 0, assessed: 0, missing: 0 };
      entry.missing += 1;
      bySkill.set(slug, entry);
    }
    for (const slug of caseResult.assessedSkillSlugs) {
      const entry = bySkill.get(slug) ?? { expected: 0, assessed: 0, missing: 0 };
      entry.assessed += 1;
      bySkill.set(slug, entry);
    }
  }

  return [...bySkill.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([slug, counts]) =>
        `  ${slug}: expected=${counts.expected} assessed=${counts.assessed} missing=${counts.missing}`,
    )
    .join('\n');
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const outDir = path.resolve(process.cwd(), args.outDir);
  await mkdir(outDir, { recursive: true });

  const casesToRun =
    args.limit !== null ? GOLDEN_DATASET.cases.slice(0, args.limit) : GOLDEN_DATASET.cases;

  const startedAt = new Date().toISOString();
  console.warn(`[eval] running ${casesToRun.length} case(s)...`);

  const { model, promptVersion, pipelineVersion, caseResults } = await runDataset(
    casesToRun,
    GOLDEN_DATASET.skills,
    args.caseIds ? { caseIds: args.caseIds } : {},
  );

  const finishedAt = new Date().toISOString();
  const runId = finishedAt.replace(/[:.]/g, '-');

  const report = buildRunReport(
    runId,
    startedAt,
    finishedAt,
    model,
    promptVersion,
    pipelineVersion,
    caseResults,
  );
  const baseline = await loadBaseline(outDir);
  const regression = compareToBaseline(report, baseline);
  const markdown = renderMarkdownReport(report, regression);

  await writeFile(path.join(outDir, `${runId}.json`), JSON.stringify(report, null, 2));
  await writeFile(path.join(outDir, `${runId}.md`), markdown);
  await writeFile(path.join(outDir, 'latest.json'), JSON.stringify(report, null, 2));
  await writeFile(path.join(outDir, 'latest.md'), markdown);

  console.warn('');
  console.warn(`[eval] overall score: ${report.metrics.overallScore}/100`);
  console.warn(
    `[eval] cases: ${report.metrics.passedCaseCount}/${report.metrics.caseCount} passed | hallucinated citations: ${report.metrics.hallucinatedCitationCount}`,
  );
  console.warn(
    `[eval] skill precision/recall: ${report.metrics.skillPrecision.toFixed(2)}/${report.metrics.skillRecall.toFixed(2)} | citation precision/recall: ${report.metrics.citationPrecision.toFixed(2)}/${report.metrics.citationRecall.toFixed(2)}`,
  );
  console.warn(`[eval] estimated cost: $${report.metrics.estimatedCostUsd.toFixed(4)}`);
  console.warn('');
  console.warn('[eval] per-skill summary:');
  console.warn(summarizeBySkill(report));

  if (regression.hasBaseline) {
    console.warn('');
    console.warn(
      regression.regressed.length > 0
        ? `[eval] REGRESSED against baseline "${regression.baselineRunId}": ${regression.regressed.map((c) => c.metric).join(', ')}`
        : `[eval] no regressions against baseline "${regression.baselineRunId}" (${regression.improved.length} improved)`,
    );
  } else {
    console.warn('[eval] no baseline found — this is the first recorded run.');
  }

  console.warn('');
  console.warn(`[eval] wrote ${path.join(outDir, 'latest.json')} and latest.md`);

  if (args.promote) {
    await writeFile(path.join(outDir, 'baseline.json'), JSON.stringify(report, null, 2));
    console.warn(`[eval] promoted "${runId}" to baseline.json`);
  }

  const anyCaseFailed = caseResults.some((c) => !c.passed);
  const anyRegression = regression.regressed.length > 0;

  if (anyCaseFailed || anyRegression) {
    console.error(
      `[eval] FAILING: ${anyCaseFailed ? 'one or more cases failed' : ''}${anyCaseFailed && anyRegression ? '; ' : ''}${anyRegression ? 'one or more metrics regressed' : ''}`,
    );
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error('[eval] run crashed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
