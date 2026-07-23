import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { EmptyState } from '@/components/feedback/empty-state';
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
import { getCurrentUser } from '@/features/auth/server/service';
import { SubmitButton } from '@/features/github/components/SubmitButton';
import {
  countSelectedRepositories,
  getGithubAccountForCurrentUser,
  getLatestAnalysis,
} from '@/features/github/queries';
import { connectGithubAction } from '@/features/github/server-actions';

export const metadata: Metadata = { title: 'Your analysis — Credence AI' };

const STATUS_LABELS: Record<string, string> = {
  queued: 'Queued',
  processing: 'Analyzing',
  completed: 'Ready',
  failed: 'Needs attention',
  partial: 'Partly complete',
};

/**
 * Post-onboarding holding screen. Shows the queued analysis job honestly —
 * no AI runs yet, so this is a truthful "we're preparing it" state, not a
 * fake progress bar (Brand Guidelines §12, CLAUDE.md §21.5). If no job
 * exists, routes the student back into onboarding.
 */
export default async function AnalysisPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const analysis = await getLatestAnalysis(user.id);

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

  const account = await getGithubAccountForCurrentUser();
  const selectedCount = account ? await countSelectedRepositories(account.id) : 0;
  const isActive = analysis.status === 'queued' || analysis.status === 'processing';

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
              {selectedCount > 0
                ? `${selectedCount} repositor${selectedCount === 1 ? 'y is' : 'ies are'} queued for analysis.`
                : 'Your analysis is queued.'}
            </CardDescription>
          </div>
          <Badge variant="ai" className="ml-auto">
            {STATUS_LABELS[analysis.status] ?? analysis.status}
          </Badge>
        </CardHeader>
        <CardContent>
          <p className="text-body">
            Your repositories are queued for analysis. This can take a little while — there&apos;s
            nothing else you need to do right now, and you can safely leave this page. Your report
            will appear here once it&apos;s ready.
          </p>
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
