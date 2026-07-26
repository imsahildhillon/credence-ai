'use client';

import { Check, Circle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

import type { PipelineStage } from '../types';

export interface AnalysisPipelineProps {
  readonly analysisId: string;
  readonly initialStatus: string;
  readonly initialStages: readonly PipelineStage[];
  readonly initialStartedAt: string | null;
}

const POLL_INTERVAL_MS = 3000;
const COMPLETE_HOLD_MS = 1200;
const TERMINAL_STATUSES = new Set(['completed', 'partial', 'failed']);

interface ProgressResponse {
  readonly status: string;
  readonly startedAt: string | null;
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
}: AnalysisPipelineProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [stages, setStages] = useState(initialStages);
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

  const activeStage = stages.find((stage) => stage.state === 'active');

  return (
    <div className="flex flex-col gap-4">
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
                  stage.state === 'active' && 'font-medium',
                )}
              >
                {stage.label}
              </p>
              {stage.state === 'active' && startedAt ? (
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
  return (
    <span className="border-border text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-full border-2">
      <Circle aria-hidden="true" className="size-2 fill-current" />
    </span>
  );
}
