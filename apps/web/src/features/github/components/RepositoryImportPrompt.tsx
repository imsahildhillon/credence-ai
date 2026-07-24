'use client';

import { FolderGit2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { Button } from '@/components/ui/button';
import { importRepositoriesAction } from '@/features/github/server-actions';
import { requiresGithubReconnect, type ImportResult } from '@/features/github/types';

/**
 * First-run state on the repositories screen: no repos imported yet. Kicks
 * off the import Server Action and refreshes the page on success so the
 * server re-renders with the imported list. GitHub failures render inline
 * as a designed error state (CLAUDE.md §8.7, §19.1) — no dead ends.
 */
export function RepositoryImportPrompt() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ImportResult | null>(null);

  function handleImport() {
    startTransition(async () => {
      const outcome = await importRepositoriesAction();
      setResult(outcome);
      if (outcome.status === 'success') {
        router.refresh();
      }
    });
  }

  if (result?.status === 'error') {
    const needsReconnect = requiresGithubReconnect(result.kind);
    return (
      <ErrorState
        title={
          needsReconnect ? 'Reconnect GitHub to continue' : "We couldn't import your repositories"
        }
        description={result.message}
        action={
          needsReconnect ? (
            <Button asChild>
              <Link href={`/login?next=${encodeURIComponent('/onboarding/repositories')}`}>
                Reconnect GitHub
              </Link>
            </Button>
          ) : (
            <Button type="button" onClick={handleImport} loading={isPending}>
              Try again
            </Button>
          )
        }
      />
    );
  }

  return (
    <EmptyState
      icon={<FolderGit2 />}
      title="Import your GitHub repositories"
      description="We'll pull in the repositories you own so you can choose which ones Credence analyzes. Nothing is analyzed until you start it yourself."
      action={
        <Button type="button" onClick={handleImport} loading={isPending}>
          Import from GitHub
        </Button>
      }
    />
  );
}
