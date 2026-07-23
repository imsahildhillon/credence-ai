'use server';

import { redirect } from 'next/navigation';

import { signInWithGithub, signOut, toSafeRedirectPath } from './service';

/**
 * Server Actions are the only place `features/auth` logic is invoked from
 * pages/components (CLAUDE.md: "avoid putting business logic inside page
 * components") — each delegates straight to `service.ts` and decides only
 * presentation (redirect), per CLAUDE.md §19.3.
 *
 * There is exactly one public sign-in entry point: GitHub OAuth for
 * students (ADR-003). No action here accepts, reads, or forwards a role or
 * any other identity attribute from the browser — identity is entirely
 * server-determined.
 */
export async function signInWithGithubAction(formData: FormData): Promise<void> {
  const next = toSafeRedirectPath(formData.get('next')?.toString());
  const { url, error } = await signInWithGithub(next);

  if (error || !url) {
    redirect(`/login?error=oauth_init_failed`);
  }
  redirect(url);
}

export async function signOutAction(): Promise<void> {
  await signOut();
  redirect('/login');
}
