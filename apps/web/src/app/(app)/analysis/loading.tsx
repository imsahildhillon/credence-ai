import { Skeleton } from '@/components/feedback/skeleton';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';

/**
 * Route-level loading UI for `/analysis`, shaped to match the holding-
 * screen card most visits land on (CLAUDE.md §8.7, §21.5 — a shaped
 * skeleton, not a bare spinner). The real page's other branches (empty,
 * failed) render fast enough server-side that this transitional shape —
 * not a copy of every branch — is the right placeholder.
 */
export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8" aria-hidden="true">
      <Card>
        <CardHeader className="flex-row items-start gap-4 space-y-0">
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-64" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-32" />
            <div className="flex flex-col divide-y rounded-lg border">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center justify-between gap-3 px-3 py-2">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Skeleton className="h-9 w-40" />
        </CardFooter>
      </Card>
    </div>
  );
}
