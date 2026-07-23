import { redirect } from 'next/navigation';

import { getCurrentUser, getOrCreateProfile } from '@/features/auth/server/service';

/**
 * Identity-verification placeholder — proves session + profile bootstrap
 * work end-to-end. Not a real dashboard; a future feature pass replaces
 * this content entirely (CLAUDE.md: "Do NOT build dashboards").
 */
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const profile = await getOrCreateProfile(user);

  return (
    <div>
      <h1 className="text-title">Dashboard</h1>
      <p className="text-caption text-muted-foreground">
        Signed in as {user.email ?? user.id} — role: {profile.role}
      </p>
    </div>
  );
}
