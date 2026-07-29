import { Skeleton } from '@/components/feedback/skeleton';

const STAGE_COUNT = 6;

/**
 * Route-level loading UI for `/analysis`, shaped like the live pipeline it
 * precedes (CLAUDE.md §8.7, §21.5 — a shaped skeleton, not a bare spinner).
 */
export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6" aria-hidden="true">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-3 w-32" />
      </div>

      <div className="flex flex-col">
        {Array.from({ length: STAGE_COUNT }).map((_, index) => (
          <div key={index} className="flex gap-3 pb-6">
            <Skeleton className="size-6 shrink-0 rounded-full" />
            <Skeleton className="h-4 w-48" />
          </div>
        ))}
      </div>
    </div>
  );
}
