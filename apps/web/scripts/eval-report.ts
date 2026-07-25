import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  compareToBaseline,
  renderMarkdownReport,
  type EvaluationRunReport,
} from '@/features/evaluation';

/**
 * `npm run eval:report` — re-renders the Markdown summary from an already
 * saved JSON report, without calling the model again. Useful for CI
 * artifact publishing or re-reviewing a run's regression comparison after
 * `baseline.json` has since changed.
 *
 * Flags:
 *   --report <path>   JSON report to render (default: eval-reports/latest.json)
 *   --out-dir <path>  Directory containing baseline.json (default: eval-reports)
 */

function parseArgs(argv: readonly string[]): { reportPath: string; outDir: string } {
  let reportPath = 'eval-reports/latest.json';
  let outDir = 'eval-reports';

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--report') {
      reportPath = argv[i + 1] ?? reportPath;
      i += 1;
    } else if (argv[i] === '--out-dir') {
      outDir = argv[i + 1] ?? outDir;
      i += 1;
    }
  }

  return { reportPath, outDir };
}

async function loadReport(filePath: string): Promise<EvaluationRunReport> {
  const raw = await readFile(path.resolve(process.cwd(), filePath), 'utf-8');
  return JSON.parse(raw) as EvaluationRunReport;
}

async function loadBaseline(outDir: string): Promise<EvaluationRunReport | null> {
  try {
    const raw = await readFile(path.resolve(process.cwd(), outDir, 'baseline.json'), 'utf-8');
    return JSON.parse(raw) as EvaluationRunReport;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const { reportPath, outDir } = parseArgs(process.argv.slice(2));

  const report = await loadReport(reportPath);
  const baseline = await loadBaseline(outDir);
  const regression = compareToBaseline(report, baseline);
  const markdown = renderMarkdownReport(report, regression);

  console.warn(markdown);

  const outputPath = reportPath.replace(/\.json$/, '.md');
  await writeFile(path.resolve(process.cwd(), outputPath), markdown);
  console.warn(`\n[eval:report] wrote ${outputPath}`);
}

main().catch((error: unknown) => {
  console.error('[eval:report] failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
