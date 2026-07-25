import { timingSafeEqual } from 'node:crypto';

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getEvidenceWorkerEnv } from '@/features/evidence/env';
import { processLinkLivenessBatch } from '@/features/evidence/link-liveness-worker';

/**
 * Link-liveness worker trigger. Same shape and authentication as
 * `/api/v1/analyses/process` (CLAUDE.md §9.3: authenticate → validate →
 * delegate → map to response) — a scheduler pings this on an interval;
 * there is no built-in scheduler here, matching the existing precedent.
 *
 * Shared-secret auth, not a user session: machine-to-machine, never
 * callable by a signed-in student.
 */

const RequestSchema = z.object({
  /** Optional: check at most this many links. Omitted → the worker's default batch size. */
  batchSize: z.coerce.number().int().min(1).max(500).optional(),
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
      { error: { code: 'INVALID_REQUEST', message: 'batchSize must be an integer between 1 and 500.' } },
      { status: 400 },
    );
  }

  try {
    const summary = await processLinkLivenessBatch(parsed.data.batchSize);
    return NextResponse.json(summary, { status: 200 });
  } catch (error) {
    console.error(
      '[evidence] link-liveness run failed',
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { error: { code: 'LINK_LIVENESS_RUN_FAILED', message: 'The link-liveness check failed.' } },
      { status: 500 },
    );
  }
}
