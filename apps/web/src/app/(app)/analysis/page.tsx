import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { Spinner } from '@/components/feedback/spinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { trackEvent } from '@/features/analytics';
import { getCurrentUser } from '@/features/auth/server/service';
import { SubmitButton } from '@/features/github/components/SubmitButton';
import { getLatestAnalysis, listAnalysisSnapshot } from '@/features/github/queries';
import { connectGithubAction, startAnalysisAction } from '@/features/github/server-actions';
import { classifyAnalysisFailure } from '@/features/profile/server/failure-classification';

export const metadata: Metadata = { title: 'Your analysis — Credence AI' };

const STATUS_LABELS: Record<string, string> = {
  queued: 'Queued',
  processing: 'Analyzing',
  completed: 'Ready',
  failed: 'Needs attention',
  partial: 'Partly complete',
};

/**
 * Post-onboarding holding screen. Shows the queued analysis honestly — no AI
 * runs yet, so this is a truthful "we're preparing it" state, not a fake
 * progress bar (Brand Guidelines §12, CLAUDE.md §21.5).
 *
 * It reads the job's **immutable snapshot**, not the student's current
 * selection, so this screen always describes exactly what the queued run will
 * analyze — even if the selection has been edited since.
 */
export default async function AnalysisPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const analysis = await getLatestAnalysis(user.id);

  // Once assessment has produced a report, the profile is the primary
  // product experience — this holding screen hands off to it rather than
  // showing a stale "ready" card for a report that already exists
  // elsewhere (CLAUDE.md §9.5: personalized pages are dynamic by default,
  // so this check runs on every visit, not just once).
  if (analysis && (analysis.status === 'completed' || analysis.status === 'partial')) {
    const completedSnapshot = await listAnalysisSnapshot(analysis.id);
    await trackEvent('analysis_completed', {
      analysisStatus: analysis.status,
      repositoryCount: completedSnapshot.length,
    });
    redirect('/profile');
  }

  if (!analysis) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-8">
        <EmptyState
          title="No analysis yet"
          description="Connect your GitHub work and choose repositories to build your engineering profile."
          action={
            <form action={connectGithubAction}>
              <SubmitButton pendingLabel="Getting started…">Get started</SubmitButton>
            </form>
          }
        />
      </div>
    );
  }

  if (analysis.status === 'failed') {
    // A distinct state, not the generic "queued" card — that copy ("your
    // repositories are queued... you can safely leave this page") would be
    // actively misleading for a run that already ended (CLAUDE.md §19.4:
    // never fake progress, never leave an honest failure looking like an
    // in-progress one).
    const classification = await classifyAnalysisFailure(analysis.id);

    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-8">
        <ErrorState
          title="We couldn't finish your analysis"
          description={
            analysis.error_message ??
            "Something went wrong while analyzing your repositories. This is usually temporary."
          }
          action={
            classification.requiresGithubReconnect ? (
              <form action={connectGithubAction}>
                <SubmitButton pendingLabel="Reconnecting…">Reconnect GitHub</SubmitButton>
              </form>
            ) : (
              <form action={startAnalysisAction}>
                <SubmitButton pendingLabel="Starting…">Retry analysis</SubmitButton>
              </form>
            )
          }
        />
        {classification.rateLimited ? (
          <p className="text-caption text-center">
            GitHub temporarily rate-limited this run. Waiting a few minutes before retrying
            usually resolves it.
          </p>
        ) : null}
        <Button asChild variant="ghost" size="sm" className="mx-auto">
          <Link href="/onboarding/repositories">Review repository selection</Link>
        </Button>
      </div>
    );
  }

  const snapshot = await listAnalysisSnapshot(analysis.id);
  const isActive = analysis.status === 'queued' || analysis.status === 'processing';
  const pinnedCount = snapshot.filter((item) => item.commitSha).length;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8">
      <Card>
        <CardHeader className="flex-row items-start gap-4 space-y-0">
          {isActive ? (
            <Spinner className="text-primary mt-1" label="Preparing your profile" />
          ) : null}
          <div className="flex flex-col gap-1">
            <CardTitle>We&apos;re preparing your engineering profile.</CardTitle>
            <CardDescription>
              {snapshot.length > 0
                ? `${snapshot.length} repositor${snapshot.length === 1 ? 'y is' : 'ies are'} queued for analysis.`
                : 'Your analysis is queued.'}
            </CardDescription>
          </div>
          <Badge variant="ai" className="ml-auto">
            {STATUS_LABELS[analysis.status] ?? analysis.status}
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-body">
            Your repositories are queued for analysis. This can take a little while — there&apos;s
            nothing else you need to do right now, and you can safely leave this page. Your report
            will appear here once it&apos;s ready.
          </p>

          {snapshot.length > 0 ? (
            <div className="flex flex-col gap-2">
              <h2 className="text-caption font-medium">Included in this run</h2>
              <ul className="flex flex-col divide-y rounded-lg border">
                {snapshot.map((item) => (
                  <li
                    key={item.repositoryId}
                    className="flex items-center justify-between gap-3 px-3 py-2"
                  >
                    <span className="text-caption truncate">{item.name}</span>
                    {item.commitSha ? (
                      // Monospace is reserved for raw evidence — a commit SHA
                      // is exactly that (Brand Guidelines §8).
                      <span className="text-caption font-mono">{item.commitSha.slice(0, 7)}</span>
                    ) : (
                      <span className="text-caption">latest commit</span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="text-caption">
                {pinnedCount === snapshot.length
                  ? 'This selection is locked in — editing your repositories later won’t change this run.'
                  : 'This selection is locked in. Repositories without a pinned commit will be analyzed at their latest commit when the run starts.'}
              </p>
            </div>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button asChild variant="outline">
            <Link href="/onboarding/repositories">Edit repository selection</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
