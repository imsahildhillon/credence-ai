import Link from 'next/link';

import { Button } from '@/components/ui/button';
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
 */
export function AuthForm({ next, errorMessage }: AuthFormProps) {
  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <h1 className="text-title">Sign in to Credence AI</h1>

      {errorMessage ? (
        <p className="text-alert text-caption" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <form action={signInWithGithubAction}>
        <input type="hidden" name="next" value={next ?? ''} />
        <Button type="submit" className="w-full" variant="default">
          Continue with GitHub
        </Button>
      </form>

      <p className="text-caption text-muted-foreground">
        Students sign in with GitHub. Recruiting for a team?{' '}
        <Link href="/recruiter-access" className="text-primary underline-offset-4 hover:underline">
          Request recruiter access
        </Link>
        .
      </p>
    </div>
  );
}
