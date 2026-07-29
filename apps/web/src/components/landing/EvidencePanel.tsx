import { GitPullRequest, Link2, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface EvidenceAnatomyStep {
  readonly icon: typeof ShieldCheck;
  readonly title: string;
  readonly description: string;
}

const EVIDENCE_ANATOMY: readonly EvidenceAnatomyStep[] = [
  {
    icon: Link2,
    title: 'Claim',
    description: 'A specific, evidence-grounded observation about your engineering work.',
  },
  {
    icon: GitPullRequest,
    title: 'Evidence',
    description: 'Direct links to the commits, pull requests, and reviews that support it.',
  },
  {
    icon: ShieldCheck,
    title: 'Confidence',
    description:
      'Always labeled — high, moderate, or preliminary — never hidden behind a single score.',
  },
] as const;

/**
 * Section 7 — the Evidence Panel. Communicates the trust mechanism itself
 * (claim → evidence → confidence — the same reasoning order `EvidenceCard`
 * enforces elsewhere in the product) rather than a simulated claim card.
 * The original mockup's "Extracted Claim" panel rendered a fabricated
 * finding ("Strongest Engineering Trait: Distributed Systems Thinking")
 * with invented evidence counts and a timeline — exactly the fabricated
 * analysis output these rules forbid. This explains the real, structural
 * policy instead, in true statements about how the product works, with no
 * specific (and therefore fictional) claim attached.
 *
 * `Card` gives this section a bordered, shadowed surface — more visual
 * weight than the Recruiter Teaser's plain text, but far less than the
 * Hero's scale, keeping it in between as intended.
 */
export function EvidencePanel() {
  return (
    <section id="developer-intelligence" className="mx-auto max-w-3xl px-6 py-24">
      <Card className="shadow-md">
        <CardHeader>
          <span className="text-caption text-primary tracking-widest uppercase">
            How we build trust
          </span>
          <h2 className="text-h2 mt-2">Every claim is traceable</h2>
        </CardHeader>
        <CardContent className="flex flex-col gap-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {EVIDENCE_ANATOMY.map(({ icon: Icon, title, description }) => (
              <div key={title}>
                <Icon aria-hidden="true" className="text-primary mb-2 size-5" />
                <h3 className="text-title">{title}</h3>
                <p className="text-body text-muted-foreground mt-1">{description}</p>
              </div>
            ))}
          </div>

          <Button asChild className="w-fit">
            <Link href="/login">Analyze my GitHub</Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
