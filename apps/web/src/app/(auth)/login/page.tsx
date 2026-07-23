import type { Metadata } from 'next';

import { AuthForm } from '@/features/auth/components/AuthForm';

export const metadata: Metadata = { title: 'Sign in — Credence AI' };

/**
 * Calm, specific copy per failure mode (CLAUDE.md §19.4) — never a bare
 * "something went wrong". Unrecognized codes fall back to a generic but
 * still honest message rather than guessing.
 */
const ERROR_MESSAGES: Record<string, string> = {
  oauth_init_failed: "We couldn't start GitHub sign-in — please try again.",
  oauth_callback_failed:
    "We couldn't complete GitHub sign-in — the authorization may have expired. Please try again.",
  oauth_missing_code: 'That sign-in response was incomplete — please start again from sign in.',
};

interface LoginPageProps {
  searchParams: Promise<{ next?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next, error } = await searchParams;
  const errorMessage = error
    ? (ERROR_MESSAGES[error] ?? 'Sign-in failed — please try again.')
    : undefined;

  return <AuthForm mode="login" next={next} errorMessage={errorMessage} />;
}
