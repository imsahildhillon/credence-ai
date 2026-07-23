import { GitFork, Star } from 'lucide-react';

import { Checkbox } from '@/components/forms/checkbox';
import { Badge } from '@/components/ui/badge';
import type { RepositorySummary } from '@/features/github/types';
import { cn } from '@/lib/utils';

const DATE_FORMAT = new Intl.DateTimeFormat('en', { dateStyle: 'medium' });

function formatUpdated(iso: string | null): string | null {
  if (!iso) {
    return null;
  }
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : DATE_FORMAT.format(date);
}

export interface RepositoryCardProps {
  repo: RepositorySummary;
  checked: boolean;
  disabled?: boolean;
  onToggle: (checked: boolean) => void;
}

/**
 * One selectable repository. The whole card is the checkbox's label, so the
 * entire surface is a single ≥44px touch target that toggles selection
 * (CLAUDE.md §13.7). Visibility/fork/archived are shown as text+icon, never
 * color alone (§13.5).
 */
export function RepositoryCard({ repo, checked, disabled, onToggle }: RepositoryCardProps) {
  const inputId = `repo-${repo.githubRepoId}`;
  const updated = formatUpdated(repo.githubUpdatedAt);

  return (
    <label
      htmlFor={inputId}
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-accent/40',
        checked && 'border-primary',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <Checkbox
        id={inputId}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onToggle(value === true)}
        className="mt-0.5"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-title truncate">{repo.name}</span>
          <Badge variant={repo.visibility === 'private' ? 'secondary' : 'outline'}>
            {repo.visibility === 'private' ? 'Private' : 'Public'}
          </Badge>
          {repo.isFork ? (
            <Badge variant="outline" className="gap-1">
              <GitFork className="h-3 w-3" aria-hidden="true" />
              Fork
            </Badge>
          ) : null}
          {repo.isArchived ? <Badge variant="outline">Archived</Badge> : null}
        </div>

        {repo.description ? (
          <p className="text-caption line-clamp-2">{repo.description}</p>
        ) : (
          <p className="text-caption italic">No description</p>
        )}

        <div className="text-caption flex flex-wrap items-center gap-x-4 gap-y-1">
          {repo.primaryLanguage ? <span>{repo.primaryLanguage}</span> : null}
          <span className="inline-flex items-center gap-1">
            <Star className="h-3.5 w-3.5" aria-hidden="true" />
            {repo.stars}
            <span className="sr-only"> stars</span>
          </span>
          {updated ? <span>Updated {updated}</span> : null}
        </div>
      </div>
    </label>
  );
}
