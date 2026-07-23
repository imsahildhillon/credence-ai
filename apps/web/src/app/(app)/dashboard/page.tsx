import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/features/auth/server/service';
import { getLatestAnalysis } from '@/features/github/queries';

/**
 * There is no standalone dashboard in V1 (CLAUDE.md: "Do NOT build
 * dashboards"). Post-login this is the entry router: it sends the student
 * into onboarding, or to their queued analysis if they've already started
 * one — so "resume where you left off" works without a real dashboard yet.
 */
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const analysis = await getLatestAnalysis(user.id);
  redirect(analysis ? '/analysis' : '/onboarding');
}
