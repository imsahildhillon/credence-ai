import { ExternalLink } from 'lucide-react';
import Link from 'next/link';

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/navigation/pagination';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { EvidenceExplorerSearchParams } from '../schemas';
import type { EvidenceEntry, EvidenceSourceType } from '../types';

import { EVIDENCE_KIND_LABEL } from './evidence-ref';

export interface EvidenceExplorerProps {
  readonly evidence: readonly EvidenceEntry[];
  readonly searchParams: EvidenceExplorerSearchParams;
}

const PAGE_SIZE = 25;
const ALL_KINDS: readonly EvidenceSourceType[] = [
  'commit',
  'pull_request',
  'review',
  'issue',
  'release',
  'contributor',
  'repository',
];

function buildHref(params: Readonly<Partial<EvidenceExplorerSearchParams>>): string {
  const query = new URLSearchParams();
  if (params.kind) {
    query.set('kind', params.kind);
  }
  if (params.repository) {
    query.set('repository', params.repository);
  }
  if (params.page && params.page > 1) {
    query.set('page', String(params.page));
  }
  const queryString = query.toString();
  return queryString ? `/profile?${queryString}#evidence-explorer` : '/profile#evidence-explorer';
}

/**
 * Section 8 — Evidence Explorer, the product's core differentiator: every
 * commit, pull request, review, issue, release, and contributor record the
 * candidate has, each with a direct GitHub link. Filtering and pagination
 * are plain server-rendered links (query params), not client-side state —
 * every view is a real, bookmarkable URL and no evidence is transformed
 * client-side (CLAUDE.md §9.2, "Performance" requirement in this sprint's
 * spec).
 */
export function EvidenceExplorer({ evidence, searchParams }: EvidenceExplorerProps) {
  const filtered = searchParams.kind
    ? evidence.filter((item) => item.sourceType === searchParams.kind)
    : searchParams.repository
      ? evidence.filter((item) => item.repositoryId === searchParams.repository)
      : evidence;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(searchParams.page, totalPages);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const countsByKind = new Map<EvidenceSourceType, number>();
  for (const item of evidence) {
    if (item.sourceType) {
      countsByKind.set(item.sourceType, (countsByKind.get(item.sourceType) ?? 0) + 1);
    }
  }

  return (
    <Card id="evidence-explorer">
      <CardHeader>
        <CardTitle>Evidence explorer</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by evidence kind">
          <Link
            href={buildHref({})}
            aria-current={!searchParams.kind && !searchParams.repository ? 'true' : undefined}
          >
            <Badge variant={!searchParams.kind && !searchParams.repository ? 'default' : 'outline'}>
              All ({evidence.length})
            </Badge>
          </Link>
          {ALL_KINDS.filter((kind) => (countsByKind.get(kind) ?? 0) > 0).map((kind) => (
            <Link
              key={kind}
              href={buildHref({ kind })}
              aria-current={searchParams.kind === kind ? 'true' : undefined}
            >
              <Badge variant={searchParams.kind === kind ? 'default' : 'outline'}>
                {EVIDENCE_KIND_LABEL[kind]} ({countsByKind.get(kind) ?? 0})
              </Badge>
            </Link>
          ))}
        </div>

        {pageItems.length === 0 ? (
          <p className="text-caption">No evidence matches this filter.</p>
        ) : (
          <ul className="flex flex-col divide-y rounded-lg border">
            {pageItems.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.sourceType ? (
                      <Badge variant="secondary">{EVIDENCE_KIND_LABEL[item.sourceType]}</Badge>
                    ) : null}
                    <span className="text-code break-words">{item.title}</span>
                  </div>
                  <span className="text-caption">
                    {item.repositoryFullName ?? 'unknown repository'}
                    {item.detail ? ` · ${item.detail}` : ''}
                    {item.occurredAt
                      ? ` · ${new Date(item.occurredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                      : ''}
                  </span>
                </div>
                {item.linkDead ? (
                  <span className="text-caption text-muted-foreground shrink-0">
                    Source no longer reachable
                  </span>
                ) : item.externalUrl ? (
                  <a
                    href={item.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary inline-flex shrink-0 items-center gap-1 text-sm underline decoration-dotted underline-offset-2"
                  >
                    View on GitHub
                    <ExternalLink aria-hidden="true" className="size-3.5" />
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 ? (
          <Pagination>
            <PaginationContent>
              {page > 1 ? (
                <PaginationItem>
                  <PaginationPrevious href={buildHref({ ...searchParams, page: page - 1 })} />
                </PaginationItem>
              ) : null}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                <PaginationItem key={pageNumber}>
                  <PaginationLink
                    href={buildHref({ ...searchParams, page: pageNumber })}
                    isActive={pageNumber === page}
                  >
                    {pageNumber}
                  </PaginationLink>
                </PaginationItem>
              ))}
              {page < totalPages ? (
                <PaginationItem>
                  <PaginationNext href={buildHref({ ...searchParams, page: page + 1 })} />
                </PaginationItem>
              ) : null}
            </PaginationContent>
          </Pagination>
        ) : null}
      </CardContent>
    </Card>
  );
}
