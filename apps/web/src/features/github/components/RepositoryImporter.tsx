'use client';

import { RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { Button } from '@/components/ui/button';
import { distinctLanguages } from '@/features/github/repository-mapper';
import {
  importRepositoriesAction,
  setAllRepositoriesSelectionAction,
  setRepositorySelectionAction,
  startAnalysisAction,
} from '@/features/github/server-actions';
import {
  requiresGithubReconnect,
  type ImportResult,
  type RepositorySummary,
} from '@/features/github/types';

import { RepositoryCard } from './RepositoryCard';
import { RepositoryFilters, type VisibilityFilter } from './RepositoryFilters';
import { SubmitButton } from './SubmitButton';

const ALL_LANGUAGES = 'all';

/**
 * The Import + Select screen. Holds search/filter/selection UI state;
 * persistence goes through Server Actions (no business logic here,
 * CLAUDE.md §8.2). Selection is optimistic: local overrides render
 * instantly, the action persists, and a re-import clears overrides so the
 * database stays the source of truth.
 */
export function RepositoryImporter({ repositories }: { repositories: RepositorySummary[] }) {
  const router = useRouter();
  const [override, setOverride] = useState<Map<number, boolean>>(new Map());
  const [query, setQuery] = useState('');
  const [visibility, setVisibility] = useState<VisibilityFilter>('all');
  const [language, setLanguage] = useState<string>(ALL_LANGUAGES);
  const [reimportResult, setReimportResult] = useState<ImportResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const languages = useMemo(() => distinctLanguages(repositories), [repositories]);

  const checkedFor = (repo: RepositorySummary): boolean =>
    override.has(repo.githubRepoId) ? override.get(repo.githubRepoId)! : repo.included;

  const selectedCount = repositories.reduce((total, repo) => total + (checkedFor(repo) ? 1 : 0), 0);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return repositories.filter((repo) => {
      if (visibility !== 'all' && repo.visibility !== visibility) {
        return false;
      }
      if (language !== ALL_LANGUAGES && repo.primaryLanguage !== language) {
        return false;
      }
      if (needle) {
        const haystack = `${repo.fullName} ${repo.description ?? ''}`.toLowerCase();
        if (!haystack.includes(needle)) {
          return false;
        }
      }
      return true;
    });
  }, [repositories, query, visibility, language]);

  function handleToggle(repo: RepositorySummary, checked: boolean) {
    setOverride((prev) => new Map(prev).set(repo.githubRepoId, checked));
    startTransition(async () => {
      await setRepositorySelectionAction(repo.githubRepoId, checked);
    });
  }

  function handleSelectAll(value: boolean) {
    setOverride(new Map(repositories.map((repo) => [repo.githubRepoId, value])));
    startTransition(async () => {
      await setAllRepositoriesSelectionAction(value);
    });
  }

  function handleReimport() {
    startTransition(async () => {
      const result = await importRepositoriesAction();
      setReimportResult(result);
      if (result.status === 'success') {
        setOverride(new Map());
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <RepositoryFilters
          query={query}
          onQueryChange={setQuery}
          visibility={visibility}
          onVisibilityChange={setVisibility}
          language={language}
          onLanguageChange={setLanguage}
          languages={languages}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-caption" aria-live="polite">
            {selectedCount} of {repositories.length} selected
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleSelectAll(true)}
              disabled={isPending || selectedCount === repositories.length}
            >
              Select all
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleSelectAll(false)}
              disabled={isPending || selectedCount === 0}
            >
              Deselect all
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReimport}
              disabled={isPending}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Re-import
            </Button>
          </div>
        </div>
      </div>

      {reimportResult?.status === 'error' ? (
        <ErrorState
          title={
            requiresGithubReconnect(reimportResult.kind)
              ? 'Reconnect GitHub to continue'
              : "We couldn't refresh your repositories"
          }
          description={reimportResult.message}
          action={
            requiresGithubReconnect(reimportResult.kind) ? (
              <Button asChild>
                <Link href={`/login?next=${encodeURIComponent('/onboarding/repositories')}`}>
                  Reconnect GitHub
                </Link>
              </Button>
            ) : (
              <Button type="button" variant="outline" onClick={handleReimport} disabled={isPending}>
                Try again
              </Button>
            )
          }
        />
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          title="No repositories match your filters"
          description="Try a different search term, or clear the visibility and language filters."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((repo) => (
            <li key={repo.githubRepoId}>
              <RepositoryCard
                repo={repo}
                checked={checkedFor(repo)}
                disabled={isPending}
                onToggle={(checked) => handleToggle(repo, checked)}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="bg-background sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t py-4">
        <p className="text-caption">
          {selectedCount === 0
            ? 'Select at least one repository to continue.'
            : `${selectedCount} repositor${selectedCount === 1 ? 'y' : 'ies'} will be analyzed.`}
        </p>
        {selectedCount === 0 ? (
          <Button disabled>Start analysis</Button>
        ) : (
          <form action={startAnalysisAction}>
            <SubmitButton pendingLabel="Starting…">Start analysis</SubmitButton>
          </form>
        )}
      </div>
    </div>
  );
}
