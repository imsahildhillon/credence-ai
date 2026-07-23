import Link from 'next/link';

import { Button } from '@/components/ui/button';

/**
 * Landing — the first step of the journey (Landing → Continue with GitHub).
 * Public marketing surface; the actual GitHub sign-in lives on `/login`
 * (auth is out of scope for this feature). Deliberately minimal.
 */
export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-display">Prove what you can actually build.</h1>
      <p className="text-body text-muted-foreground max-w-xl">
        Credence turns your real engineering work — your GitHub repositories and how you build them
        — into a verified, evidence-based profile. No resume keywords. Just your work.
      </p>
      <div className="flex flex-col items-center gap-3">
        <Button asChild size="lg">
          <Link href="/login">Continue with GitHub</Link>
        </Button>
        <Link
          href="/recruiter-access"
          className="text-caption text-muted-foreground underline-offset-4 hover:underline"
        >
          Recruiting for a team?
        </Link>
      </div>
    </main>
  );
}
