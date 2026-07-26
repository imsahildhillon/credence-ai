import { timingSafeEqual } from 'node:crypto';

import { NextResponse } from 'next/server';

import { getEvidenceWorkerEnv } from '@/features/evidence/env';
import { runNextAnalysis } from '@/features/pipeline';

/**
 * Manual escape hatch for the analysis pipeline (ADR-009). The real
 * production driver is `workers/analysis-worker.ts` — a long-lived process
 * that polls continuously. This route exists for ops/debugging: process one
 * claimable run (fresh or stale-reclaimed) on demand, without waiting for
 * the worker's next poll interval.
 *
 * Same machine-to-machine bearer-secret auth as the worker — deliberately
 * not callable by a signed-in student, who can only enqueue work
 * (`startAnalysisAction`), never drive the pipeline.
 */

function isAuthorized(request: Request): boolean {
  let expected: string;
  try {
    expected = getEvidenceWorkerEnv().WORKER_TRIGGER_SECRET;
  } catch {
    return false;
  }

  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) {
    return false;
  }

  const presented = Buffer.from(header.slice('Bearer '.length));
  const secret = Buffer.from(expected);
  return presented.length === secret.length && timingSafeEqual(presented, secret);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Invalid worker credentials.' } },
      { status: 401 },
    );
  }

  try {
    const summary = await runNextAnalysis(`manual-${Date.now()}`);
    if (!summary) {
      return NextResponse.json({ claimed: false }, { status: 200 });
    }
    return NextResponse.json({ claimed: true, ...summary }, { status: 200 });
  } catch (error) {
    const cause = error instanceof Error ? error.cause : undefined;
    console.error(
      '[pipeline] manual run failed',
      error instanceof Error ? error.message : error,
      cause ? `cause: ${JSON.stringify(cause)}` : '',
    );
    return NextResponse.json(
      { error: { code: 'PIPELINE_RUN_FAILED', message: 'The analysis run failed.' } },
      { status: 500 },
    );
  }
}
