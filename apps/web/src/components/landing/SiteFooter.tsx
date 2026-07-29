import Link from 'next/link';

/**
 * Landing page footer. Deliberately minimal — reuses the same real
 * destinations `SiteNav` already links to (`/`, `#developer-intelligence`,
 * `/recruiter-access`, `/login`), not new marketing copy.
 *
 * The original mockup's footer also linked "Evidence Engine," "API (Soon),"
 * and "GitHub" — all `href="#"` in the source, with no corresponding page
 * or known real URL in this codebase. Rather than invent destinations for
 * them, they're dropped; its "Who is Credence AI for?" panel duplicated
 * content already covered by Insight Rows and the Recruiter Teaser, so it's
 * dropped too rather than restated.
 */
export function SiteFooter() {
  return (
    <footer className="border-border/60 border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 py-12 text-center md:px-10">
        <Link href="/" className="text-title flex items-center gap-1.5 font-bold">
          Credence AI
          <span aria-hidden="true" className="bg-primary mb-1 inline-block size-2 rounded-full" />
        </Link>

        <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-6">
          <a
            href="#developer-intelligence"
            className="text-body text-muted-foreground hover:text-primary transition-colors"
          >
            Developer Intelligence
          </a>
          <Link
            href="/recruiter-access"
            className="text-body text-muted-foreground hover:text-primary transition-colors"
          >
            Recruiter Intelligence
          </Link>
          <Link
            href="/login"
            className="text-body text-muted-foreground hover:text-primary transition-colors"
          >
            Sign in
          </Link>
        </nav>

        <p className="text-caption">&copy; {new Date().getFullYear()} Credence AI.</p>
      </div>
    </footer>
  );
}
