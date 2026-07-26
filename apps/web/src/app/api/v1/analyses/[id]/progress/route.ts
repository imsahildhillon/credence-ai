import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentUser } from '@/features/auth/server/service';
import { getAnalysisById, getAnalysisProgress } from '@/features/github/queries';
import { deriveAnalysisStages } from '@/features/github/types';

/**
 * Read-only progress for the analysis waiting screen (`/analysis`), polled
 * by `AnalysisPipeline` while a run is `queued`/`processing`. A thin
 * controller (CLAUDE.md §9.3): authenticate → authorize → validate →
 * delegate → map. A normal user session, not the worker's shared secret —
 * this never drives the worker, it only reads what the worker already
 * wrote (RLS is the ownership boundary, checked again here in depth).
 */

const ParamsSchema = z.object({ id: z.string().uuid() });

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Sign in to view analysis progress.' } },
      { status: 401 },
    );
  }

  const parsedParams = ParamsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_REQUEST', message: 'A valid analysis id is required.' } },
      { status: 400 },
    );
  }

  const analysis = await getAnalysisById(parsedParams.data.id);
  if (!analysis || analysis.profile_id !== user.id) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Analysis not found.' } },
      { status: 404 },
    );
  }

  const progress = await getAnalysisProgress(analysis);
  return NextResponse.json({
    status: progress.status,
    startedAt: progress.startedAt,
    stages: deriveAnalysisStages(progress),
  });
}
