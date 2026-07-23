import { Skeleton } from '@/components/feedback/skeleton';

/**
 * Loading placeholder for the repository list — matches the card layout so
 * the transition to real content doesn't shift. Used by the route-level
 * `loading.tsx` while the server imports/reads repositories.
 */
export function RepositoryListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-start gap-3 rounded-xl border p-4">
          <Skeleton className="h-4 w-4 rounded-sm" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-full max-w-md" />
            <div className="flex gap-3">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
