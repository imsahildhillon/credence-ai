import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { EmptyState } from '@/components/feedback/empty-state';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/features/auth/server/service';
import { EvidenceExplorerSearchParamsSchema, getProfileForCurrentUser } from '@/features/profile';
import { AnalysisMetadata } from '@/features/profile/components/AnalysisMetadata';
import { CodeOwnership } from '@/features/profile/components/CodeOwnership';
import { Collaboration } from '@/features/profile/components/Collaboration';
import { EngineeringSummary } from '@/features/profile/components/EngineeringSummary';
import { EngineeringTimeline } from '@/features/profile/components/EngineeringTimeline';
import { EvidenceExplorer } from '@/features/profile/components/EvidenceExplorer';
import { RepositoryHighlights } from '@/features/profile/components/RepositoryHighlights';
import { SkillCards } from '@/features/profile/components/SkillCards';
import { TechnologyMap } from '@/features/profile/components/TechnologyMap';

export const metadata: Metadata = { title: 'Your engineering profile — Credence AI' };

const SECTIONS = [
  { id: 'engineering-summary', label: 'Summary' },
  { id: 'skill-cards', label: 'Skills' },
  { id: 'technology-map', label: 'Technology' },
  { id: 'engineering-timeline', label: 'Timeline' },
  { id: 'collaboration', label: 'Collaboration' },
  { id: 'code-ownership', label: 'Ownership' },
  { id: 'repository-highlights', label: 'Repositories' },
  { id: 'evidence-explorer', label: 'Evidence' },
  { id: 'analysis-metadata', label: 'Metadata' },
] as const;

/**
 * The Candidate Engineering Profile — an explainable engineering dossier,
 * not a résumé. Every AI-generated insight renders through `EvidenceCard`
 * or `AiContentMarker`, so it is structurally impossible for this page to
 * show a claim without the evidence and confidence behind it.
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
 * (CLAUDE.md §18.2). Public sharing remains disabled; see the feature
 * README for how a future public profile route would reuse this same
 * service layer safely.
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

  if (data.skillCards.length === 0 && data.evidence.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-8">
        <EmptyState
          title="Your profile is empty"
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
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-h1">
          {data.candidateLogin
            ? `${data.candidateLogin}'s engineering profile`
            : 'Engineering profile'}
        </h1>
        <p className="text-caption">
          An explainable engineering dossier — every insight below links back to the evidence that
          produced it.
        </p>
      </div>

      <nav aria-label="Profile sections" className="flex flex-wrap gap-x-4 gap-y-1 border-b pb-4">
        {SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="text-caption hover:text-foreground"
          >
            {section.label}
          </a>
        ))}
      </nav>

      <section id="engineering-summary" aria-labelledby="engineering-summary-heading">
        <h2 id="engineering-summary-heading" className="sr-only">
          Engineering summary
        </h2>
        <EngineeringSummary data={data.engineeringSummary} />
      </section>

      <section id="skill-cards" aria-labelledby="skill-cards-heading">
        <h2 id="skill-cards-heading" className="sr-only">
          Skills
        </h2>
        <SkillCards skillCards={data.skillCards} />
      </section>

      <section id="technology-map" aria-labelledby="technology-map-heading">
        <h2 id="technology-map-heading" className="sr-only">
          Technology map
        </h2>
        <TechnologyMap entries={data.technologyMap} />
      </section>

      <section id="engineering-timeline" aria-labelledby="engineering-timeline-heading">
        <h2 id="engineering-timeline-heading" className="sr-only">
          Engineering timeline
        </h2>
        <EngineeringTimeline data={data.timeline} />
      </section>

      <section id="collaboration" aria-labelledby="collaboration-heading">
        <h2 id="collaboration-heading" className="sr-only">
          Collaboration
        </h2>
        <Collaboration data={data.collaboration} />
      </section>

      <section id="code-ownership" aria-labelledby="code-ownership-heading">
        <h2 id="code-ownership-heading" className="sr-only">
          Code ownership
        </h2>
        <CodeOwnership ownership={data.ownership} />
      </section>

      <section id="repository-highlights" aria-labelledby="repository-highlights-heading">
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

      <section id="analysis-metadata" aria-labelledby="analysis-metadata-heading">
        <h2 id="analysis-metadata-heading" className="sr-only">
          Analysis metadata
        </h2>
        <AnalysisMetadata metadata={data.analysisMetadata} />
      </section>
    </div>
  );
}
