import { timingSafeEqual } from 'node:crypto';

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { runSkillAssessment } from '@/features/analysis';
import { getEvidenceWorkerEnv } from '@/features/evidence/env';

/**
 * Assessment-stage trigger. A thin controller (CLAUDE.md §9.3): authenticate →
 * validate → delegate → map the result to a response. It holds no assessment
 * logic and never calls Claude itself.
 *
 * Deliberately a separate endpoint from `/analyses/process` rather than a
 * second phase inside it: ingestion is network-bound and cheap to retry,
 * assessment is model-bound and costs real money. Keeping the trigger seams
 * apart means a transient GitHub failure never re-runs a paid assessment, and
 * a failed assessment can be retried without re-ingesting anything.
 *
 * Authentication is the same machine-to-machine shared secret the ingestion
 * trigger uses — a signed-in student can enqueue work, never drive the worker.
 */

const RequestSchema = z.object({
  analysisId: z.string().uuid(),
});

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

  const parsed = RequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_REQUEST', message: 'analysisId must be a UUID.' } },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await runSkillAssessment(parsed.data.analysisId), { status: 200 });
  } catch (error) {
    const cause = error instanceof Error ? error.cause : undefined;
    console.error(
      '[analysis] assessment run failed',
      error instanceof Error ? error.message : error,
      cause ? `cause: ${JSON.stringify(cause)}` : '',
    );
    return NextResponse.json(
      { error: { code: 'ASSESSMENT_RUN_FAILED', message: 'The assessment run failed.' } },
      { status: 500 },
    );
  }
}
