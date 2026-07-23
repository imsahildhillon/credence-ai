import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getCurrentUser, getOrCreateProfile } from '@/features/auth/server/service';
import { OnboardingProgress } from '@/features/github/components/OnboardingProgress';
import { SubmitButton } from '@/features/github/components/SubmitButton';
import { connectGithubAction } from '@/features/github/server-actions';

export const metadata: Metadata = { title: 'Welcome — Credence AI' };

function initialsFrom(name: string): string {
  return (
    name
      .split(/\s+/)
      .map((part) => part.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'ME'
  );
}

/**
 * Onboarding step 1 — Welcome. Shows the student their GitHub identity
 * (read from the Supabase session metadata, so no GitHub API call or token
 * is needed just to greet them) and explains what Credence does. "Continue"
 * ensures the `github_accounts` row exists, then moves to repository import.
 */
export default async function OnboardingWelcomePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  const profile = await getOrCreateProfile(user);

  const metadata = user.user_metadata ?? {};
  const displayName =
    profile.full_name ??
    (metadata.full_name as string | undefined) ??
    (metadata.name as string | undefined) ??
    'there';
  const githubUsername = (metadata.user_name ?? metadata.preferred_username) as string | undefined;
  const avatarUrl = profile.avatar_url ?? (metadata.avatar_url as string | undefined) ?? undefined;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8">
      <OnboardingProgress current="welcome" />

      <Card>
        <CardHeader className="flex-row items-center gap-4 space-y-0">
          <Avatar className="h-14 w-14">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
            <AvatarFallback>{initialsFrom(displayName)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <CardTitle>Welcome, {displayName}</CardTitle>
            {githubUsername ? (
              <CardDescription>Signed in with GitHub as @{githubUsername}</CardDescription>
            ) : (
              <CardDescription>Signed in with GitHub</CardDescription>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-body">
            Credence analyzes your real engineering work — your repositories, code, and how you
            build — instead of a resume. Next, you&apos;ll choose which repositories to include.
            Nothing is analyzed until you start it yourself.
          </p>
        </CardContent>
        <CardFooter>
          <form action={connectGithubAction}>
            <SubmitButton pendingLabel="Connecting…">Continue</SubmitButton>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
