import type { Metadata } from 'next';

import { CandidateListSearchParamsSchema, getCandidateList } from '@/features/recruiter';
import { CandidateList } from '@/features/recruiter/components/CandidateList';

export const metadata: Metadata = { title: 'Candidates — Credence AI' };

/**
 * The Candidate List — every currently-visible candidate, no ranking, no
 * AI sorting (spec). `getCandidateList` already returns `[]` for a
 * non-recruiter session (the layout above this page redirects that case
 * before it ever renders, but the service function fails closed on its
 * own too, per CLAUDE.md §18.2).
 */
export default async function RecruiterCandidatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawSearchParams = await searchParams;
  const parsed = CandidateListSearchParamsSchema.safeParse({
    sort: typeof rawSearchParams['sort'] === 'string' ? rawSearchParams['sort'] : undefined,
  });
  const sort = parsed.success ? parsed.data.sort : 'recent';

  const candidates = await getCandidateList(sort);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-h1">Candidates</h1>
        <p className="text-caption">
          Candidates who have completed analysis and opted into recruiter visibility.
        </p>
      </div>
      <CandidateList candidates={candidates} sort={sort} />
    </div>
  );
}
