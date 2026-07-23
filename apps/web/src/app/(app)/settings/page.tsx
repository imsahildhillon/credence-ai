import { redirect } from 'next/navigation';

import { getCurrentUser, getOrCreateProfile } from '@/features/auth/server/service';

/**
 * Identity-verification placeholder — see dashboard/page.tsx. Not real
 * settings UI (CLAUDE.md: "Do NOT build dashboards" / product features).
 */
export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const profile = await getOrCreateProfile(user);

  return (
    <div>
      <h1 className="text-title">Settings</h1>
      <p className="text-caption text-muted-foreground">
        Signed in as {user.email ?? user.id} — role: {profile.role}
      </p>
    </div>
  );
}
