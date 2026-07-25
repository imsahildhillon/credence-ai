import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { EmptyState } from '@/components/feedback/empty-state';
import { EvidenceExplorerSearchParamsSchema } from '@/features/profile';
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
import { RepositoryIntelligence } from '@/features/profile/components/RepositoryIntelligence';
import { getCandidateProfile } from '@/features/recruiter';
import { BookmarkButton } from '@/features/recruiter/components/BookmarkButton';
import { CandidateStatusSelect } from '@/features/recruiter/components/CandidateStatusSelect';
import { RecruiterNotes } from '@/features/recruiter/components/RecruiterNotes';

export const metadata: Metadata = { title: 'Candidate — Credence AI' };

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
 * The Candidate Profile, recruiter view. This page adds exactly three
 * things beyond the candidate's own profile — bookmark, status, private
 * notes — and reuses every other section verbatim from `features/profile`
 * (spec: "Reuse the existing profile model. Do not duplicate business
 * logic."). `getCandidateProfile` is what performs recruiter authorization
 * (`features/recruiter/server/auth.ts`) and delegates the actual data
 * pipeline to `features/profile`'s `getProfileForRecruiter` — this page
 * itself contains no aggregation, no scoring, nothing candidate-profile
 * specific beyond composing already-built sections.
 */
export default async function RecruiterCandidatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const result = await getCandidateProfile(id);

  if (!result) {
    // Not an invited recruiter — the layout above already redirects this
    // case; this is the same defense-in-depth check as any other
    // service-layer authorization (CLAUDE.md §18.2), not expected to fire.
    redirect('/recruiter/candidates');
  }

  const { candidateName, tracking, profile } = result;

  const header = (
    <div className="flex flex-col gap-3 border-b pb-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="text-h1 break-words">{candidateName ?? 'Unnamed candidate'}</h1>
        <p className="text-caption">
          Every insight below links back to the evidence that produced it — the same profile the
          candidate sees, presented for recruiter review.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <CandidateStatusSelect profileId={id} status={tracking.status} />
        <BookmarkButton profileId={id} bookmarked={tracking.bookmarked} />
      </div>
    </div>
  );

  if (profile.status === 'no_analysis' || profile.status === 'not_ready') {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        {header}
        <EmptyState
          title={profile.status === 'no_analysis' ? 'No analysis yet' : 'Analysis in progress'}
          description={
            profile.status === 'no_analysis'
              ? "This candidate hasn't completed an analysis yet."
              : 'This candidate’s analysis is still running — check back shortly.'
          }
        />
        <RecruiterNotes profileId={id} note={tracking.note} />
      </div>
    );
  }

  if (profile.status === 'failed') {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        {header}
        <EmptyState
          title="Analysis didn't complete"
          description="This candidate's most recent analysis run didn't finish successfully."
        />
        <RecruiterNotes profileId={id} note={tracking.note} />
      </div>
    );
  }

  const { data } = profile;

  if (data.skillCards.length === 0 && data.evidence.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        {header}
        <EmptyState
          title="Profile is empty"
          description="Analysis completed, but no assessable evidence or skills were produced."
        />
        <RecruiterNotes profileId={id} note={tracking.note} />
      </div>
    );
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

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      {header}

      {data.analysisMetadata.partialMessage ? (
        <PartialAnalysisBanner message={data.analysisMetadata.partialMessage} />
      ) : null}

      <ProvenanceBanner metadata={data.analysisMetadata} />

      <RecruiterNotes profileId={id} note={tracking.note} />

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
