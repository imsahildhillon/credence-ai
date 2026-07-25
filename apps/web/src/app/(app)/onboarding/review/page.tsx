import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { EmptyState } from '@/components/feedback/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { trackEvent } from '@/features/analytics';
import { getCurrentUser } from '@/features/auth/server/service';
import { OnboardingProgress } from '@/features/github/components/OnboardingProgress';
import { SubmitButton } from '@/features/github/components/SubmitButton';
import { getGithubAccountForCurrentUser, listRepositorySummaries } from '@/features/github/queries';
import { startAnalysisAction } from '@/features/github/server-actions';

export const metadata: Metadata = { title: 'Review & start — Credence AI' };

/**
 * Onboarding step 3 — Review & Start. Lists the repositories the student
 * selected and enqueues the analysis job. No AI runs here — "Start
 * Analysis" creates a `queued` job and moves on (see `startAnalysisAction`).
 */
export default async function OnboardingReviewPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  const account = await getGithubAccountForCurrentUser();
  if (!account) {
    redirect('/onboarding');
  }

  const selected = (await listRepositorySummaries(account.id)).filter((repo) => repo.included);

  if (selected.length > 0) {
    await trackEvent('repository_connected', { repositoryCount: selected.length });
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <OnboardingProgress current="review" />

      <header className="flex flex-col gap-1">
        <h1 className="text-h2">Review your selection</h1>
        <p className="text-caption">
          These repositories will be analyzed. You can go back and change the selection any time
          before starting.
        </p>
      </header>

      {selected.length === 0 ? (
        <EmptyState
          title="No repositories selected yet"
          description="Choose at least one repository to build your engineering profile."
          action={
            <Button asChild>
              <Link href="/onboarding/repositories">Choose repositories</Link>
            </Button>
          }
        />
      ) : (
        <>
          <ul className="flex flex-col divide-y rounded-xl border">
            {selected.map((repo) => (
              <li key={repo.githubRepoId} className="flex items-center justify-between gap-3 p-4">
                <div className="flex min-w-0 flex-col">
                  <span className="text-title truncate">{repo.name}</span>
                  {repo.primaryLanguage ? (
                    <span className="text-caption">{repo.primaryLanguage}</span>
                  ) : null}
                </div>
                <Badge variant={repo.visibility === 'private' ? 'secondary' : 'outline'}>
                  {repo.visibility === 'private' ? 'Private' : 'Public'}
                </Badge>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-caption">
              {selected.length} repositor{selected.length === 1 ? 'y' : 'ies'} selected
            </p>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline">
                <Link href="/onboarding/repositories">Back to selection</Link>
              </Button>
              <form action={startAnalysisAction}>
                <SubmitButton pendingLabel="Starting…">Start analysis</SubmitButton>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
