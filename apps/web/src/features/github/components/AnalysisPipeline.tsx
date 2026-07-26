'use client';

import { AlertTriangle, Check, Circle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

import type { PipelineStage } from '../types';

export interface AnalysisPipelineProps {
  readonly analysisId: string;
  readonly initialStatus: string;
  readonly initialStages: readonly PipelineStage[];
  readonly initialStartedAt: string | null;
  /** Static context line under the headline (e.g. repository count) — doesn't change with status. */
  readonly subtitle: string;
}

const POLL_INTERVAL_MS = 3000;
const COMPLETE_HOLD_MS = 1200;
const TERMINAL_STATUSES = new Set(['completed', 'partial', 'failed', 'cancelled']);

interface ProgressResponse {
  readonly status: string;
  readonly startedAt: string | null;
  readonly isStalled: boolean;
  readonly stages: readonly PipelineStage[];
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s elapsed`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${remainder}s elapsed`;
}

/**
 * The headline must never claim work has started before the backend says
 * so — `queued` means the Railway worker hasn't claimed this run yet, so it
 * never reads "Analyzing" (CLAUDE.md §21.5, §19.4: never imply progress
 * that hasn't begun). Kept in a state-reactive component (not server-
 * rendered page copy) so it updates the instant a poll observes the real
 * transition, without a page reload.
 */
function headlineFor(status: string, isStalled: boolean): string {
  if (isStalled) {
    return 'This run appears stalled';
  }
  switch (status) {
    case 'queued':
      return 'Waiting for an analysis worker';
    case 'ingesting':
    case 'processing':
      return 'Ingesting your repositories';
    case 'assessing':
      return 'Assessing your skills';
    case 'finalizing':
      return 'Finalizing your report';
    case 'completed':
    case 'partial':
      return 'Analysis complete';
    case 'failed':
      return "We couldn't finish this analysis";
    default:
      return 'Waiting for an analysis worker';
  }
}

/**
 * The live pipeline for an in-progress analysis. Polls
 * `GET /api/v1/analyses/{id}/progress` — a genuine external system
 * (the analysis worker's persisted state), which is exactly what
 * `useEffect` is for (CLAUDE.md §8.3). Every stage transition reflects a
 * real row that now exists; nothing here is a percentage or an estimate.
 * On reaching a terminal status, holds the final state briefly so
 * "Complete" is actually seen, then navigates to the finished report.
 */
export function AnalysisPipeline({
  analysisId,
  initialStatus,
  initialStages,
  initialStartedAt,
  subtitle,
}: AnalysisPipelineProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [stages, setStages] = useState(initialStages);
  const [isStalled, setIsStalled] = useState(false);
  const [startedAt] = useState(initialStartedAt);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Synchronizes with the analysis worker's persisted progress (Postgres),
  // which runs out-of-band from this page — polling is the correct tool,
  // not a derived/local computation.
  useEffect(() => {
    if (TERMINAL_STATUSES.has(status)) {
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const response = await fetch(`/api/v1/analyses/${analysisId}/progress`, {
          cache: 'no-store',
        });
        if (!response.ok || cancelled) {
          return;
        }
        const data = (await response.json()) as ProgressResponse;
        if (cancelled) {
          return;
        }
        setStatus(data.status);
        setStages(data.stages);
        setIsStalled(data.isStalled);
      } catch {
        // A transient network blip stays silent — the next poll retries;
        // this screen never claims a status it can't currently confirm.
      }
    };

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [analysisId, status]);

  // Real elapsed time, computed from the worker's own `started_at` —
  // ticking a clock is not "faking progress"; the seconds are genuine.
  useEffect(() => {
    if (!startedAt || TERMINAL_STATUSES.has(status)) {
      return;
    }
    const started = new Date(startedAt).getTime();
    const tick = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt, status]);

  // Once the worker reaches a terminal state, let "Complete" actually be
  // seen before handing off to the finished report.
  useEffect(() => {
    if (status !== 'completed' && status !== 'partial') {
      return;
    }
    const timeout = setTimeout(() => router.push('/profile'), COMPLETE_HOLD_MS);
    return () => clearTimeout(timeout);
  }, [status, router]);

  // A run can fail or be cancelled (e.g. the worker restarted mid-run)
  // while this screen is open. `/analysis`'s own server component owns
  // the dedicated failure/cancelled UI (retry/reconnect actions) — refresh
  // so that branch takes over instead of duplicating it here.
  useEffect(() => {
    if (status !== 'failed' && status !== 'cancelled') {
      return;
    }
    const timeout = setTimeout(() => router.refresh(), COMPLETE_HOLD_MS);
    return () => clearTimeout(timeout);
  }, [status, router]);

  const activeStage = stages.find((stage) => stage.state === 'active' || stage.state === 'stalled');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-h2">{headlineFor(status, isStalled)}</h1>
        <p className="text-caption">
          {isStalled
            ? 'A worker will reclaim this run automatically — no action needed yet.'
            : subtitle}
        </p>
      </div>

      <p className="sr-only" aria-live="polite">
        {activeStage ? `Now: ${activeStage.label}` : status === 'completed' || status === 'partial' ? 'Analysis complete' : ''}
      </p>

      <ol className="flex flex-col">
        {stages.map((stage, index) => (
          <li key={stage.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <StageIcon state={stage.state} />
              {index < stages.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    'my-0.5 w-px flex-1',
                    stage.state === 'complete' ? 'bg-strength' : 'bg-border',
                  )}
                />
              ) : null}
            </div>
            <div
              className="flex-1 pb-6"
              aria-current={stage.state === 'active' ? 'step' : undefined}
            >
              <p
                className={cn(
                  'text-body',
                  stage.state === 'pending' && 'text-muted-foreground',
                  (stage.state === 'active' || stage.state === 'stalled') && 'font-medium',
                )}
              >
                {stage.label}
              </p>
              {(stage.state === 'active' || stage.state === 'stalled') && startedAt ? (
                <p className="text-caption">{formatElapsed(elapsedSeconds)}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function StageIcon({ state }: { readonly state: PipelineStage['state'] }) {
  if (state === 'complete') {
    return (
      <span className="bg-strength text-strength-foreground flex size-6 shrink-0 items-center justify-center rounded-full">
        <Check aria-hidden="true" className="size-3.5" />
      </span>
    );
  }
  if (state === 'active') {
    return (
      <span className="border-ai text-ai flex size-6 shrink-0 items-center justify-center rounded-full border-2">
        <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
      </span>
    );
  }
  if (state === 'stalled') {
    return (
      <span className="border-alert text-alert flex size-6 shrink-0 items-center justify-center rounded-full border-2">
        <AlertTriangle aria-hidden="true" className="size-3.5" />
      </span>
    );
  }
  return (
    <span className="border-border text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-full border-2">
      <Circle aria-hidden="true" className="size-2 fill-current" />
    </span>
  );
}
