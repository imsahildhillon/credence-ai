import { timingSafeEqual } from 'node:crypto';

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getEvidenceWorkerEnv } from '@/features/evidence/env';
import { processAnalysis, processNextQueuedAnalysis } from '@/features/evidence/worker';

/**
 * Analysis-worker trigger. A thin controller (CLAUDE.md §9.3): authenticate →
 * validate → delegate to the worker → map the result to a response. It holds
 * no ingestion logic.
 *
 * This is the seam a scheduler/queue calls. When the BullMQ spine lands
 * (CLAUDE.md §14) the queue invokes `processAnalysis` directly and this route
 * can go away — the worker itself does not change.
 *
 * Authentication is a shared secret, not a user session: this is machine-to-
 * machine. It is deliberately *not* callable by a signed-in student — a
 * student can only enqueue work, never drive the worker.
 */

const RequestSchema = z.object({
  /** Optional: process this specific job. Omitted → claim the next queued one. */
  analysisId: z.string().uuid().optional(),
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
  // Compare in constant time; differing lengths short-circuit safely because
  // timingSafeEqual requires equal-length buffers.
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
      { error: { code: 'INVALID_REQUEST', message: 'analysisId must be a UUID when provided.' } },
      { status: 400 },
    );
  }

  try {
    const summary = parsed.data.analysisId
      ? await processAnalysis(parsed.data.analysisId)
      : await processNextQueuedAnalysis();

    if (!summary) {
      return NextResponse.json({ claimed: false }, { status: 200 });
    }
    return NextResponse.json({ claimed: true, ...summary }, { status: 200 });
  } catch (error) {
    // The worker already drove the job to a terminal state; this is the
    // operator-facing signal that the run blew up. Log the underlying `cause`
    // too — wrapped errors otherwise hide the real reason (e.g. an invalid
    // service-role key surfaces only as "unrecognized error").
    const cause = error instanceof Error ? error.cause : undefined;
    console.error(
      '[evidence] worker run failed',
      error instanceof Error ? error.message : error,
      cause ? `cause: ${JSON.stringify(cause)}` : '',
    );
    return NextResponse.json(
      { error: { code: 'ANALYSIS_RUN_FAILED', message: 'The analysis run failed.' } },
      { status: 500 },
    );
  }
}
