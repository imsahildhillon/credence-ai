import { randomUUID } from 'node:crypto';

import { runNextAnalysis } from '@/features/pipeline';

/**
 * The long-lived analysis worker (ADR-009). A standalone Node process —
 * deliberately *not* a Next.js request, route, or `after()` callback, which
 * are all bound by a serverless function's wall-clock limit. This process
 * has none: it polls continuously until told to stop.
 *
 * Hosting-agnostic by design: nothing here knows it might run on Railway.
 * `Dockerfile`/`railway.json` at the repo root are thin wrappers that just
 * invoke this file — swapping deployment platforms later means changing
 * those wrappers, never this module or `features/pipeline`'s orchestrator.
 *
 * Run locally: `npm run worker` (from `apps/web`).
 */

const POLL_INTERVAL_MS = Number(process.env['WORKER_POLL_INTERVAL_MS'] ?? 3000);
const STALE_AFTER_MS = Number(process.env['WORKER_STALE_AFTER_MS'] ?? 5 * 60 * 1000);

const workerId = `worker-${process.pid}-${randomUUID().slice(0, 8)}`;

let stopping = false;

function requestStop(signal: string): void {
  if (stopping) {
    // A second signal while already draining means "stop now" — exit
    // immediately rather than waiting for the in-flight checkpoint.
    console.warn(`[worker ${workerId}] received ${signal} again — exiting immediately`);
    process.exit(1);
  }
  console.warn(`[worker ${workerId}] received ${signal} — finishing current checkpoint, then stopping`);
  stopping = true;
}

process.on('SIGTERM', () => requestStop('SIGTERM'));
process.on('SIGINT', () => requestStop('SIGINT'));

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  console.warn(`[worker ${workerId}] started, polling every ${POLL_INTERVAL_MS}ms`);

  while (!stopping) {
    try {
      const summary = await runNextAnalysis(workerId, {
        isWorkerStopping: () => stopping,
        staleAfterMs: STALE_AFTER_MS,
      });

      if (!summary) {
        await sleep(POLL_INTERVAL_MS);
        continue;
      }

      console.warn(`[worker ${workerId}] analysis ${summary.analysisId} → ${summary.outcome}`);
    } catch (error) {
      // A crash in one run must not kill the process — log it and keep
      // polling. The analysis itself is left in whatever state the
      // orchestrator reached; its heartbeat will go stale and another
      // worker (or this one, after this loop continues) will reclaim it.
      logError(`[worker ${workerId}] run failed unexpectedly`, error);
      await sleep(POLL_INTERVAL_MS);
    }
  }

  console.warn(`[worker ${workerId}] stopped cleanly`);
}

/** Logs the full error chain — `.cause` is otherwise silently dropped, which is exactly what hid the real failure the first time this ran on Railway. */
function logError(prefix: string, error: unknown): void {
  if (error instanceof Error) {
    console.error(prefix + ':', error.message);
    if (error.cause !== undefined) {
      console.error(prefix + ' (cause):', error.cause);
    }
    if (error.stack) {
      console.error(error.stack);
    }
    return;
  }
  console.error(prefix + ':', error);
}

main().catch((error) => {
  logError(`[worker ${workerId}] fatal`, error);
  process.exit(1);
});
