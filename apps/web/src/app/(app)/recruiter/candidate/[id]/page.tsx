import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { EmptyState } from '@/components/feedback/empty-state';
import { EvidenceExplorerSearchParamsSchema } from '@/features/profile';
import { AnalysisMetadata } from '@/features/profile/components/AnalysisMetadata';
import { CodeOwnership } from '@/features/profile/components/CodeOwnership';
import { Collaboration } from '@/features/profile/components/Collaboration';
import { EngineeringSummary } from '@/features/profile/components/EngineeringSummary';
import { EngineeringTimeline } from '@/features/profile/components/EngineeringTimeline';
import { EvidenceExplorer } from '@/features/profile/components/EvidenceExplorer';
import { PartialAnalysisBanner } from '@/features/profile/components/PartialAnalysisBanner';
import { ProvenanceBanner } from '@/features/profile/components/ProvenanceBanner';
import { RepositoryHighlights } from '@/features/profile/components/RepositoryHighlights';
import { SkillCards } from '@/features/profile/components/SkillCards';
import { TechnologyMap } from '@/features/profile/components/TechnologyMap';
import { getCandidateProfile } from '@/features/recruiter';
import { BookmarkButton } from '@/features/recruiter/components/BookmarkButton';
import { CandidateStatusSelect } from '@/features/recruiter/components/CandidateStatusSelect';
import { RecruiterNotes } from '@/features/recruiter/components/RecruiterNotes';

export const metadata: Metadata = { title: 'Candidate — Credence AI' };

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

      <section aria-labelledby="engineering-summary-heading">
        <h2 id="engineering-summary-heading" className="sr-only">
          Engineering summary
        </h2>
        <EngineeringSummary data={data.engineeringSummary} />
      </section>

      <section aria-labelledby="skill-cards-heading">
        <h2 id="skill-cards-heading" className="sr-only">
          Skills
        </h2>
        <SkillCards skillCards={data.skillCards} />
      </section>

      <section aria-labelledby="technology-map-heading">
        <h2 id="technology-map-heading" className="sr-only">
          Technology map
        </h2>
        <TechnologyMap entries={data.technologyMap} />
      </section>

      <section aria-labelledby="engineering-timeline-heading">
        <h2 id="engineering-timeline-heading" className="sr-only">
          Engineering timeline
        </h2>
        <EngineeringTimeline data={data.timeline} />
      </section>

      <section aria-labelledby="collaboration-heading">
        <h2 id="collaboration-heading" className="sr-only">
          Collaboration
        </h2>
        <Collaboration data={data.collaboration} />
      </section>

      <section aria-labelledby="code-ownership-heading">
        <h2 id="code-ownership-heading" className="sr-only">
          Code ownership
        </h2>
        <CodeOwnership ownership={data.ownership} />
      </section>

      <section aria-labelledby="repository-highlights-heading">
        <h2 id="repository-highlights-heading" className="sr-only">
          Repository highlights
        </h2>
        <RepositoryHighlights highlights={data.repositoryHighlights} />
      </section>

      <section aria-labelledby="evidence-explorer-heading">
        <h2 id="evidence-explorer-heading" className="sr-only">
          Evidence explorer
        </h2>
        <EvidenceExplorer evidence={data.evidence} searchParams={evidenceExplorerParams} />
      </section>

      <section aria-labelledby="analysis-metadata-heading">
        <h2 id="analysis-metadata-heading" className="sr-only">
          Analysis metadata
        </h2>
        <AnalysisMetadata metadata={data.analysisMetadata} />
      </section>
    </div>
  );
}
