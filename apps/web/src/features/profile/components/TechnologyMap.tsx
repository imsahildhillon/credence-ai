import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { TechnologyMapEntry } from '../types';

export interface TechnologyMapProps {
  readonly entries: readonly TechnologyMapEntry[];
}

function formatRecency(iso: string | null): string {
  if (!iso) {
    return 'no dated activity';
  }
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) {
    return 'active today';
  }
  if (days === 1) {
    return 'active yesterday';
  }
  if (days < 30) {
    return `active ${days} days ago`;
  }
  if (days < 365) {
    return `active ${Math.round(days / 30)} month(s) ago`;
  }
  return `active ${Math.round(days / 365)} year(s) ago`;
}

/**
 * Section 3 — Technology Map. Pure aggregation, no AI: every row here is a
 * count over `evidence_items` the pipeline already recorded — languages
 * come from each repository's own `primaryLanguage`, "frameworks & tools"
 * from the repository's own GitHub topic tags. Nothing is inferred from
 * file contents or invented from a technology's popularity.
 */
export function TechnologyMap({ entries }: TechnologyMapProps) {
  const languages = entries.filter((e) => e.kind === 'language');
  const topics = entries.filter((e) => e.kind === 'topic');
  const maxEvidenceCount = Math.max(1, ...entries.map((e) => e.evidenceCount));

  function renderRows(rows: readonly TechnologyMapEntry[]) {
    return (
      <ul className="flex flex-col gap-3">
        {rows.map((entry) => (
          <li key={entry.name} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-body font-medium">{entry.name}</span>
              <span className="text-caption shrink-0">
                {entry.repositoryCount} repo{entry.repositoryCount === 1 ? '' : 's'} ·{' '}
                {formatRecency(entry.lastActivityAt)}
              </span>
            </div>
            <div className="bg-muted h-2 w-full overflow-hidden rounded-full" role="presentation">
              <div
                className="bg-chart-1 h-full rounded-full"
                style={{ width: `${(entry.evidenceCount / maxEvidenceCount) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Technology map</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {entries.length === 0 ? (
          <p className="text-caption">No repository technology data is available yet.</p>
        ) : (
          <>
            {languages.length > 0 ? (
              <div className="flex flex-col gap-3">
                <h3 className="text-title">Languages</h3>
                {renderRows(languages)}
              </div>
            ) : null}
            {topics.length > 0 ? (
              <div className="flex flex-col gap-3">
                <h3 className="text-title">Frameworks &amp; tools</h3>
                <p className="text-caption -mt-2">From each repository&apos;s own GitHub topics.</p>
                {renderRows(topics)}
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
