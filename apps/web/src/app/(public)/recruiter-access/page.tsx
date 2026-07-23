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

/**
 * Public, unauthenticated informational page that replaces the old
 * self-service recruiter sign-in (ADR-003). It creates no account and
 * collects no credentials — recruiter identities are provisioned only by an
 * operator, out of band. Deliberately not a form: there is nothing to
 * submit yet, and a fake form would imply a capability that doesn't exist.
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
        <CardContent className="flex flex-col gap-4">
          <p className="text-body text-muted-foreground">
            If your organization would like to evaluate candidates on demonstrated, evidence-backed
            capability, you can register interest and our team will follow up when recruiter
            onboarding opens.
          </p>
          <p className="text-caption text-muted-foreground">
            Contact (placeholder):{' '}
            <span className="text-foreground">{RECRUITER_CONTACT_PLACEHOLDER}</span>
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
