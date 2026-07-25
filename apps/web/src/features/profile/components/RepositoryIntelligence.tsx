import { ExternalLink } from 'lucide-react';

import type { RepositoryHighlight } from '../types';

export interface RepositoryIntelligenceProps {
  readonly highlights: readonly RepositoryHighlight[];
}

/**
 * Chapter 4 — Repository Intelligence. Every repository answers exactly
 * three questions — what was built, what evidence supports that, and where
 * to verify it on GitHub — deliberately not a metadata-heavy grid. Only
 * structurally-sourced text renders (a GitHub description or a stored
 * README excerpt); nothing here is a generated summary.
 */
export function RepositoryIntelligence({ highlights }: RepositoryIntelligenceProps) {
  if (highlights.length === 0) {
    return <p className="text-caption">No repositories have been analyzed yet.</p>;
  }

  return (
    <div className="flex flex-col divide-y">
      {highlights.map((repo) => {
        const purpose = repo.description ?? repo.readmeExcerpt;
        const evidenceKindCount = Object.keys(repo.evidenceCountBySourceType).length;

        return (
          <div key={repo.repositoryId} className="flex flex-col gap-2 py-5 first:pt-0">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="text-title min-w-0 break-words">{repo.fullName}</h3>
              {repo.externalUrl ? (
                <a
                  href={repo.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-caption hover:text-primary inline-flex shrink-0 items-center gap-1 underline decoration-dotted underline-offset-2"
                >
                  Open on GitHub
                  <ExternalLink aria-hidden="true" className="size-3" />
                </a>
              ) : null}
            </div>

            <p className="text-body">{purpose ?? 'No description available.'}</p>

            <p className="text-caption">
              {repo.evidenceCount} evidence item{repo.evidenceCount === 1 ? '' : 's'}
              {evidenceKindCount > 0 ? ` across ${evidenceKindCount} source types` : ''}
              {repo.primaryLanguage ? ` · ${repo.primaryLanguage}` : ''}
            </p>
          </div>
        );
      })}
    </div>
  );
}
