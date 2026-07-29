import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { ScrollAwareNavShell } from './ScrollAwareNavShell';

/**
 * Landing page top navigation. Static content only, composed inside the
 * one client boundary this section needs (`ScrollAwareNavShell`).
 *
 * Every link has a real destination: "Recruiter Intelligence"
 * (`/recruiter-access`) and "Sign in" / the primary CTA (`/login`) point
 * at existing routes. "Developer Intelligence" and "How it works" are
 * in-page fragment links to sections built later in this same migration
 * (`#developer-intelligence` → the Evidence Glimpse panel, `#how-it-works`
 * → the Insight Rows section) — not yet resolvable until those sections
 * exist, but never a dead `href="#"` the way the source mockup had them.
 *
 * Spacing: `px-6`/`gap-5`/`gap-4` (not `px-10`/`gap-8`/`gap-6`) — this
 * project's spacing tokens 0–10 are a non-linear macro-layout scale
 * (`--space-10` = 128px), not stock Tailwind's rem scale, so nav-internal
 * spacing needs the smaller steps of that same scale, not larger ones that
 * happen to share a familiar-looking suffix. The full link set reveals at
 * `lg:` rather than `md:` because its natural (unwrapped) width is ~1000px
 * — `md:` (768px) is architecturally too narrow for it regardless of gap
 * size. `whitespace-nowrap` throughout prevents flexbox's default
 * `min-width: auto` from letting any label wrap internally under pressure.
 */
export function SiteNav() {
  return (
    <ScrollAwareNavShell>
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 md:px-6">
        <Link href="/" className="text-title flex items-center gap-1.5 font-bold whitespace-nowrap">
          Credence AI
          <span aria-hidden="true" className="bg-primary mb-1 inline-block size-2 rounded-full" />
        </Link>

        <div className="hidden items-center gap-5 lg:flex">
          <a
            href="#developer-intelligence"
            className="text-body text-muted-foreground hover:text-primary transition-colors whitespace-nowrap"
          >
            Developer Intelligence
          </a>
          <span className="flex items-center gap-2">
            <Link
              href="/recruiter-access"
              className="text-body text-muted-foreground hover:text-primary transition-colors whitespace-nowrap"
            >
              Recruiter Intelligence
            </Link>
            <Badge variant="outline" className="text-[10px] tracking-wide whitespace-nowrap uppercase">
              Coming soon
            </Badge>
          </span>
          <a
            href="#how-it-works"
            className="text-body text-muted-foreground hover:text-primary transition-colors whitespace-nowrap"
          >
            How it works
          </a>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-body text-muted-foreground hover:text-primary hidden transition-colors whitespace-nowrap lg:block"
          >
            Sign in
          </Link>
          <Button asChild size="sm" className="rounded-full whitespace-nowrap">
            <Link href="/login">Analyze my engineering</Link>
          </Button>
        </div>
      </div>
    </ScrollAwareNavShell>
  );
}
