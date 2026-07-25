import { Skeleton } from '@/components/feedback/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

function SectionCardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-4 w-full max-w-md" />
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * Route-level loading UI for `/profile`, shaped to match every section the
 * real page renders (CLAUDE.md §8.7, §21.5 — a shaped skeleton, not a bare
 * spinner, so the layout doesn't jump when data arrives). Progressively
 * reveals nothing itself — Next.js swaps this for the real tree in one
 * shot once `getProfileForCurrentUser()` resolves, since the page has no
 * internal Suspense boundaries to stream section-by-section.
 */
export function ProfileSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8" aria-hidden="true">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-3 w-96 max-w-full" />
      </div>

      <Skeleton className="h-12 w-full rounded-lg" />

      <div className="flex flex-wrap gap-x-4 gap-y-1 border-b pb-4">
        {Array.from({ length: 9 }).map((_, index) => (
          <Skeleton key={index} className="h-3 w-16" />
        ))}
      </div>

      <SectionCardSkeleton rows={4} />
      <SectionCardSkeleton rows={3} />
      <SectionCardSkeleton rows={3} />
      <SectionCardSkeleton rows={5} />
      <SectionCardSkeleton rows={2} />
    </div>
  );
}
