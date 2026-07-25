import { ExternalLink } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { RepositoryHighlight } from '../types';

import { EVIDENCE_KIND_LABEL } from './evidence-ref';

export interface RepositoryHighlightsProps {
  readonly highlights: readonly RepositoryHighlight[];
}

/**
 * Section 7 — Repository Highlights. `description` is the repository's own
 * GitHub description; `readmeExcerpt` is a bounded excerpt actually stored
 * from the repository's README (CLAUDE.md §12.6 — never a mirror, never
 * generated). If neither exists, the card says so rather than inventing a
 * purpose.
 */
export function RepositoryHighlights({ highlights }: RepositoryHighlightsProps) {
  if (highlights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Repository highlights</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-caption">No repositories have been analyzed yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Repository highlights</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {highlights.map((repo) => (
          <div key={repo.repositoryId} className="flex flex-col gap-2 rounded-lg border p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-title min-w-0 break-words">{repo.fullName}</h3>
              {repo.externalUrl ? (
                <a
                  href={repo.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${repo.fullName} on GitHub`}
                  className="text-muted-foreground hover:text-primary shrink-0"
                >
                  <ExternalLink aria-hidden="true" className="size-4" />
                </a>
              ) : null}
            </div>

            <p className="text-caption">
              {repo.description ??
                (repo.readmeExcerpt ? repo.readmeExcerpt : 'No description available.')}
            </p>

            {repo.primaryLanguage || repo.topics.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {repo.primaryLanguage ? (
                  <Badge variant="secondary">{repo.primaryLanguage}</Badge>
                ) : null}
                {repo.topics.map((topic) => (
                  <Badge key={topic} variant="outline">
                    {topic}
                  </Badge>
                ))}
              </div>
            ) : null}

            <div className="text-caption flex flex-wrap gap-x-3 gap-y-1">
              {Object.entries(repo.evidenceCountBySourceType).map(([kind, count]) => (
                <span key={kind}>
                  {count}{' '}
                  {EVIDENCE_KIND_LABEL[kind as keyof typeof EVIDENCE_KIND_LABEL].toLowerCase()}
                  {count === 1 ? '' : 's'}
                </span>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
