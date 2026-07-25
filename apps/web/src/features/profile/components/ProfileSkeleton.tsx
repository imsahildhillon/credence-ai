import { Skeleton } from '@/components/feedback/skeleton';

function ChapterSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-4 border-t pt-10 first:border-t-0 first:pt-0">
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-3 w-6" />
        <Skeleton className="h-6 w-48" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-4 w-full max-w-md" />
        ))}
      </div>
    </div>
  );
}

/**
 * Route-level loading UI for `/profile`, shaped like the document it
 * precedes — a header, a sticky chapter rail, and a sequence of chapters —
 * rather than a bare spinner (CLAUDE.md §8.7, §21.5). Next.js swaps this
 * for the real tree in one shot once `getProfileForCurrentUser()` resolves.
 */
export function ProfileSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8" aria-hidden="true">
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-8 w-64" />
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="flex gap-8 border-y py-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      <Skeleton className="h-12 w-full rounded-lg" />

      <div className="flex flex-wrap gap-x-5 gap-y-1 border-b py-3">
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton key={index} className="h-3 w-20" />
        ))}
      </div>

      <ChapterSkeleton rows={4} />
      <ChapterSkeleton rows={3} />
      <ChapterSkeleton rows={3} />
      <ChapterSkeleton rows={2} />
    </div>
  );
}
