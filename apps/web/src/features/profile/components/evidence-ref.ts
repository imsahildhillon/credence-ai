import type { EvidenceCardRef } from '@/components/EvidenceCard';

import type { EvidenceEntry, EvidenceSourceType } from '../types';

/** Human-readable label per evidence kind — used everywhere an `EvidenceEntry` becomes a link. */
export const EVIDENCE_KIND_LABEL: Readonly<Record<EvidenceSourceType, string>> = {
  repository: 'Repository',
  commit: 'Commit',
  pull_request: 'Pull request',
  review: 'Review',
  issue: 'Issue',
  release: 'Release',
  contributor: 'Contribution record',
};

/**
 * Reduces the feature's rich `EvidenceEntry` to the shape the shared,
 * cross-feature `EvidenceCard` accepts. A confirmed-dead link is never
 * passed through as `href` — `EvidenceCard` already renders a plain,
 * non-clickable label when `href` is null, so this reuses that fallback
 * rather than adding new UI (flagship trust framework: no dead links,
 * ever).
 */
export function toEvidenceCardRef(entry: EvidenceEntry): EvidenceCardRef {
  const kind = entry.sourceType ? EVIDENCE_KIND_LABEL[entry.sourceType] : 'Evidence';
  const label = entry.linkDead
    ? `${kind}: ${entry.title} (source no longer reachable)`
    : `${kind}: ${entry.title}`;
  return {
    id: entry.id,
    label,
    href: entry.linkDead ? null : entry.externalUrl,
  };
}

export function toEvidenceCardRefs(
  entries: readonly [EvidenceEntry, ...EvidenceEntry[]],
): readonly [EvidenceCardRef, ...EvidenceCardRef[]] {
  const [first, ...rest] = entries;
  return [toEvidenceCardRef(first), ...rest.map(toEvidenceCardRef)];
}

/** Same conversion, but for a plain (possibly empty) array — returns `null` instead of accepting an empty tuple, so callers must handle the empty case explicitly rather than casting past it. */
export function toEvidenceCardRefsOrNull(
  entries: readonly EvidenceEntry[],
): readonly [EvidenceCardRef, ...EvidenceCardRef[]] | null {
  const [first, ...rest] = entries;
  return first ? [toEvidenceCardRef(first), ...rest.map(toEvidenceCardRef)] : null;
}
