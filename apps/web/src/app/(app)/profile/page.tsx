import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { EmptyState } from '@/components/feedback/empty-state';
import { Button } from '@/components/ui/button';
import { trackEvent } from '@/features/analytics';
import { getCurrentUser } from '@/features/auth/server/service';
import { EvidenceExplorerSearchParamsSchema, getProfileForCurrentUser } from '@/features/profile';
import { AssessmentBoundaries } from '@/features/profile/components/AssessmentBoundaries';
import { CapabilityMatrix } from '@/features/profile/components/CapabilityMatrix';
import { Chapter } from '@/features/profile/components/Chapter';
import { ChapterRail } from '@/features/profile/components/ChapterRail';
import { EvidenceExplorer } from '@/features/profile/components/EvidenceExplorer';
import { ExecutiveSummary } from '@/features/profile/components/ExecutiveSummary';
import { InterviewGuide } from '@/features/profile/components/InterviewGuide';
import { Methodology } from '@/features/profile/components/Methodology';
import { PartialAnalysisBanner } from '@/features/profile/components/PartialAnalysisBanner';
import { ProvenanceBanner } from '@/features/profile/components/ProvenanceBanner';
import { ReportHeader } from '@/features/profile/components/ReportHeader';
import { RepositoryIntelligence } from '@/features/profile/components/RepositoryIntelligence';

export const metadata: Metadata = { title: 'Your engineering report — Credence AI' };

const CHAPTERS = [
  { id: 'executive-summary', label: 'Executive summary' },
  { id: 'capability-matrix', label: 'Capability matrix' },
  { id: 'evidence-explorer', label: 'Evidence' },
  { id: 'repository-intelligence', label: 'Repositories' },
  { id: 'interview-guide', label: 'Interview guide' },
  { id: 'assessment-boundaries', label: 'Assessment boundaries' },
  { id: 'methodology', label: 'Methodology' },
] as const;

/**
 * The Candidate Engineering Report — a structured technical document, not a
 * dashboard. Every AI-generated insight renders through `EvidenceCard` or
 * `AiContentMarker`, so it is structurally impossible for this page to show
 * a claim without the evidence and confidence behind it.
 *
 * Only `completed`/`partial` analyses render here — `queued`/`processing`/
 * `failed` all redirect to `/analysis`, which already owns those states
 * (CLAUDE.md §19.5: partial results are labeled, never hidden, so
 * `partial` renders fully here rather than being treated as a failure).
 *
 * Access control: `getCurrentUser()` gates the page (redirect on
 * signed-out), and every query in `features/profile/server/queries.ts`
 * additionally runs under the requesting user's own Row Level Security
 * session — there is no service-role read anywhere in this feature, so
 * "only the authenticated owner can view" is enforced twice, not once
 * (CLAUDE.md §18.2). This same component tree renders for a recruiter
 * viewing a candidate (`getProfileForRecruiter`) via
 * `app/(app)/recruiter/candidate/[id]/page.tsx` — one report, two
 * audiences, never forked.
 */
export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const result = await getProfileForCurrentUser();

  if (result.status !== 'ready') {
    redirect('/analysis');
  }

  const rawSearchParams = await searchParams;
  const parsedSearchParams = EvidenceExplorerSearchParamsSchema.safeParse({
    kind: typeof rawSearchParams['kind'] === 'string' ? rawSearchParams['kind'] : undefined,
    repository:
      typeof rawSearchParams['repository'] === 'string' ? rawSearchParams['repository'] : undefined,
    page: typeof rawSearchParams['page'] === 'string' ? rawSearchParams['page'] : undefined,
  });
  const evidenceExplorerParams = parsedSearchParams.success
    ? parsedSearchParams.data
    : { page: 1 as const };

  const { data } = result;

  await trackEvent('profile_viewed', { analysisStatus: data.analysisMetadata.status });

  if (data.skillCards.length === 0 && data.evidence.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-8">
        <EmptyState
          title="Your report is empty"
          description="Your analysis completed, but no assessable evidence or skills were produced. Try connecting more repositories or re-running your analysis."
          action={
            <Button asChild>
              <Link href="/onboarding/repositories">Review repositories</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 print:max-w-none">
      <ReportHeader candidateLogin={data.candidateLogin} metadata={data.analysisMetadata} />

      {data.analysisMetadata.partialMessage ? (
        <PartialAnalysisBanner message={data.analysisMetadata.partialMessage} />
      ) : null}

      <ProvenanceBanner metadata={data.analysisMetadata} />

      <ChapterRail sections={CHAPTERS} />

      <Chapter number={1} id="executive-summary" title="Executive summary">
        <ExecutiveSummary data={data.engineeringSummary} />
      </Chapter>

      <Chapter number={2} id="capability-matrix" title="Capability matrix">
        <CapabilityMatrix skillCards={data.skillCards} />
      </Chapter>

      <Chapter number={3} id="evidence-explorer" title="Evidence explorer">
        <EvidenceExplorer evidence={data.evidence} searchParams={evidenceExplorerParams} />
      </Chapter>

      <Chapter number={4} id="repository-intelligence" title="Repository intelligence">
        <RepositoryIntelligence highlights={data.repositoryHighlights} />
      </Chapter>

      <Chapter number={5} id="interview-guide" title="Interview guide">
        <InterviewGuide suggestions={data.interviewGuide} />
      </Chapter>

      <Chapter number={6} id="assessment-boundaries" title="Assessment boundaries">
        <AssessmentBoundaries metadata={data.analysisMetadata} evidence={data.evidence} />
      </Chapter>

      <Chapter number={7} id="methodology" title="Methodology">
        <Methodology metadata={data.analysisMetadata} />
      </Chapter>
    </div>
  );
}
