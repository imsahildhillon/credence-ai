import Link from 'next/link';
import type { SVGProps } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { signInWithGithubAction } from '@/features/auth/server/actions';

export interface AuthFormProps {
  /** Where to send the user after a successful sign-in; validated server-side (toSafeRedirectPath). */
  next?: string | undefined;
  /** Set when `/auth/callback` redirected back here after a failure (PRD FR-1, error handling). */
  errorMessage?: string | undefined;
}

/**
 * The single public sign-in surface — and the only one, since OAuth makes
 * login and signup the same act (ADR-003). GitHub is the *only* identity
 * path for students, and students are the only accounts a member of the
 * public can create. There is deliberately no email field, no role
 * selector, and no recruiter form here — recruiters are invitation-only
 * and routed to an informational page instead.
 *
 * Presentation translated from `design/auth.html` into the app's real
 * design system (Card/Button/typography tokens, both themes) — the
 * mockup's bespoke color palette, Material Symbols, external fonts, and
 * decorative SVG grid/glassmorphism are intentionally not reproduced.
 * Nothing below changes the sign-in mechanism itself: still a real
 * `<form action={signInWithGithubAction}>` with the same hidden `next`
 * input, so progressive enhancement and the OAuth flow are unaffected.
 */
export function AuthForm({ next, errorMessage }: AuthFormProps) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center text-center">
        <h1 className="text-title">Sign in to Credence AI</h1>
        <p className="text-body text-muted-foreground">
          We request read-only GitHub access to analyze your engineering work.
        </p>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {errorMessage ? (
          <p className="text-alert text-caption" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <form action={signInWithGithubAction}>
          <input type="hidden" name="next" value={next ?? ''} />
          <Button type="submit" className="w-full gap-2" variant="default">
            <GithubMark aria-hidden="true" className="size-4" />
            Continue with GitHub
          </Button>
        </form>

        <p className="text-caption text-muted-foreground text-center">
          We never modify your repositories.
        </p>
      </CardContent>

      <CardFooter className="border-border/60 flex-col gap-3 border-t pt-6">
        <div className="text-center">
          <p className="text-body font-medium">Recruiting for a team?</p>
          <p className="text-caption text-muted-foreground">
            Recruiter Intelligence is currently invitation-only.
          </p>
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link href="/recruiter-access">Learn about Recruiter Access</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

// lucide-react ships no GitHub brand mark (trademark reasons) — this is
// the same inline path `design/auth.html` uses, kept here rather than as a
// new asset/dependency. Purely decorative: the button's own text is the
// accessible name.
function GithubMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}
