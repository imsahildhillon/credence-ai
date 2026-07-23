import { Skeleton } from '@/components/feedback/skeleton';
import { OnboardingProgress } from '@/features/github/components/OnboardingProgress';
import { RepositoryListSkeleton } from '@/features/github/components/RepositoryListSkeleton';

/**
 * Route-level loading UI shown while the repositories page reads/imports
 * server-side — a shaped skeleton (not a bare spinner) so the layout is
 * stable when real content arrives (CLAUDE.md §8.7, §21.5).
 */
export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <OnboardingProgress current="repositories" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-72" />
        <Skeleton className="h-3 w-96 max-w-full" />
      </div>
      <RepositoryListSkeleton />
    </div>
  );
}
