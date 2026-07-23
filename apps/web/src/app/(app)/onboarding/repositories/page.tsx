import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { EmptyState } from '@/components/feedback/empty-state';
import { getCurrentUser } from '@/features/auth/server/service';
import { OnboardingProgress } from '@/features/github/components/OnboardingProgress';
import { RepositoryImporter } from '@/features/github/components/RepositoryImporter';
import { RepositoryImportPrompt } from '@/features/github/components/RepositoryImportPrompt';
import { SubmitButton } from '@/features/github/components/SubmitButton';
import { getGithubAccountForCurrentUser, listRepositorySummaries } from '@/features/github/queries';
import { connectGithubAction } from '@/features/github/server-actions';

export const metadata: Metadata = { title: 'Choose repositories — Credence AI' };

/**
 * Onboarding step 2 — Import & Select. Renders one of three designed states
 * from server data: not-yet-connected → connect prompt; connected but
 * nothing imported → import prompt; repositories present → the interactive
 * selector. Reads run through RLS, so a student only ever sees their own.
 */
export default async function OnboardingRepositoriesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const account = await getGithubAccountForCurrentUser();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <OnboardingProgress current="repositories" />

      <header className="flex flex-col gap-1">
        <h1 className="text-h2">Choose repositories to analyze</h1>
        <p className="text-caption">
          Pick the projects that best represent your engineering work. Forks and archived
          repositories are imported but left unselected by default.
        </p>
      </header>

      {!account ? (
        <EmptyState
          title="Connect your GitHub work"
          description="We'll use your GitHub sign-in to import the repositories you own — no separate connection needed."
          action={
            <form action={connectGithubAction}>
              <SubmitButton pendingLabel="Connecting…">Connect GitHub</SubmitButton>
            </form>
          }
        />
      ) : (
        <RepositoriesForAccount accountId={account.id} />
      )}
    </div>
  );
}

async function RepositoriesForAccount({ accountId }: { accountId: string }) {
  const repositories = await listRepositorySummaries(accountId);

  if (repositories.length === 0) {
    return <RepositoryImportPrompt />;
  }
  return <RepositoryImporter repositories={repositories} />;
}
