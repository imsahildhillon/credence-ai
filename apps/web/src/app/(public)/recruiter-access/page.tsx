import type { Metadata } from 'next';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Recruiter access — Credence AI',
  description: 'Recruiter access to Credence AI is invitation-only.',
};

// Placeholder contact target — no real inbox is wired up yet. Kept as a
// single named constant so the future invitation work has one obvious place
// to replace (ADR-003, "Recruiter onboarding": invitations are not built
// yet).
const RECRUITER_CONTACT_PLACEHOLDER = 'partnerships@credence.ai';

interface ExplorationArea {
  readonly title: string;
  readonly description: string;
}

// Reuses the exact framing already approved for the landing page's
// Recruiter Teaser (`components/landing/RecruiterTeaser.tsx`) — not a new
// claim, and deliberately not a roadmap: no dates, no commitments, no
// "coming Q_" language. Presented here as exploratory direction, matching
// the honest "invitation-only, nothing built yet" positioning of this page.
const EXPLORATION_AREAS: readonly ExplorationArea[] = [
  {
    title: 'Evidence-backed assessment',
    description: 'Evaluating demonstrated engineering behavior through traceable evidence.',
  },
  {
    title: 'Candidate comparison',
    description: 'Comparing engineering patterns, ownership, and technical strengths.',
  },
  {
    title: 'Team intelligence',
    description: 'Understanding how a candidate complements an existing engineering team.',
  },
] as const;

/**
 * Public, unauthenticated informational page that replaces the old
 * self-service recruiter sign-in (ADR-003). It creates no account and
 * collects no credentials — recruiter identities are provisioned only by an
 * operator, out of band. Deliberately not a form: there is nothing to
 * submit yet, and a fake form would imply a capability that doesn't exist.
 *
 * Intentionally chrome-less (no `SiteNav`/`SiteFooter`) — a focused
 * invitation page, not a marketing surface, matching the design mockup's
 * explicit intent to suppress navigation chrome on transactional/waitlist
 * screens.
 */
export default function RecruiterAccessPage() {
  return (
    <div className="flex min-h-svh items-center justify-center p-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <Badge variant="secondary" className="w-fit">
            Coming soon
          </Badge>
          <CardTitle>Recruiter access is invitation-only</CardTitle>
          <CardDescription>
            Credence AI is onboarding a small group of design-partner organizations. Recruiter
            accounts cannot be created from this website — access is granted by invitation only.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <p className="text-body text-muted-foreground">
            Recruiter Intelligence brings the same evidence-backed reasoning behind Developer
            Intelligence to hiring teams evaluating demonstrated engineering capability — not
            résumé keywords or commit counts.
          </p>

          <div className="flex flex-col gap-3">
            <h2 className="text-caption text-muted-foreground tracking-widest uppercase">
              Areas we&apos;re exploring with recruiter partners
            </h2>
            <ul className="flex flex-col gap-3">
              {EXPLORATION_AREAS.map((area) => (
                <li key={area.title}>
                  <p className="text-body text-foreground font-medium">{area.title}</p>
                  <p className="text-caption text-muted-foreground">{area.description}</p>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-caption text-muted-foreground">
            Contact (placeholder, not yet an active inbox):{' '}
            <span className="text-foreground">{RECRUITER_CONTACT_PLACEHOLDER}</span> — we&apos;re
            still building the invitation workflow this address will support.
          </p>
        </CardContent>
        <CardFooter>
          <Button asChild variant="outline">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
