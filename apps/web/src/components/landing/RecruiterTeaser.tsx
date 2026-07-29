import { GitCompare, ShieldCheck, Users } from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface RecruiterCapability {
  readonly icon: typeof ShieldCheck;
  readonly title: string;
  readonly description: string;
}

const RECRUITER_CAPABILITIES: readonly RecruiterCapability[] = [
  {
    icon: ShieldCheck,
    title: 'Evidence-backed assessment',
    description: 'Evaluate demonstrated engineering behavior through traceable evidence.',
  },
  {
    icon: GitCompare,
    title: 'Candidate comparison',
    description: 'Compare engineering patterns, ownership, and technical strengths.',
  },
  {
    icon: Users,
    title: 'Team intelligence',
    description: 'Understand how a candidate complements an existing engineering team.',
  },
] as const;

/**
 * Section 6 — Recruiter Intelligence, positioned strictly as a future
 * capability of the same evidence-backed platform, not a competing product.
 * No hiring statistics, adoption numbers, or customer logos — none exist
 * yet, and the original mockup's per-card status captions ("Currently in
 * design partner testing," etc.) made unverifiable claims, so they're
 * dropped rather than ported. Visual weight is intentionally below the
 * Hero: no large rounded primary button, no oversized headline.
 */
export function RecruiterTeaser() {
  return (
    <section className="border-border/60 mx-auto max-w-4xl border-t px-6 py-24">
      <div className="flex flex-col items-center text-center">
        <Badge variant="outline" className="mb-4 text-[10px] tracking-widest uppercase">
          For hiring teams
        </Badge>
        <h2 className="text-h2">Engineering intelligence for hiring teams</h2>
        <p className="text-body text-muted-foreground mt-4 max-w-xl">
          Recruiter Intelligence brings the same evidence-backed reasoning behind Developer
          Intelligence to hiring teams evaluating demonstrated engineering capability — not
          résumé keywords or commit counts.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
        {RECRUITER_CAPABILITIES.map(({ icon: Icon, title, description }) => (
          <div key={title} className="text-center md:text-left">
            <Icon aria-hidden="true" className="text-muted-foreground mx-auto mb-3 size-5 md:mx-0" />
            <h3 className="text-title">{title}</h3>
            <p className="text-body text-muted-foreground mt-1">{description}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 flex justify-center">
        <Button asChild variant="outline">
          <Link href="/recruiter-access">Explore Recruiter Intelligence</Link>
        </Button>
      </div>
    </section>
  );
}
