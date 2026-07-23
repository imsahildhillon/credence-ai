import type { Metadata } from 'next';

import { AuthForm } from '@/features/auth/components/AuthForm';

export const metadata: Metadata = { title: 'Create your account — Credence AI' };

interface SignupPageProps {
  searchParams: Promise<{ next?: string }>;
}

/**
 * Supabase Auth provisions the student on first successful GitHub sign-in —
 * there's no separate password-based creation step, so this renders the
 * same GitHub-only form as /login with different framing copy only (ADR-003).
 */
export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { next } = await searchParams;

  return <AuthForm mode="signup" next={next} />;
}
