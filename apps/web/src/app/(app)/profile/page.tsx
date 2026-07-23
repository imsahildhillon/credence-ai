import { redirect } from 'next/navigation';

import { getCurrentUser, getOrCreateProfile } from '@/features/auth/server/service';

/**
 * Identity-verification placeholder — see dashboard/page.tsx. Not the
 * real Credibility Report/profile UI (CLAUDE.md: "Do NOT build product
 * features").
 */
export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const profile = await getOrCreateProfile(user);

  return (
    <div>
      <h1 className="text-title">Profile</h1>
      <p className="text-caption text-muted-foreground">
        Signed in as {user.email ?? user.id} — role: {profile.role}
      </p>
    </div>
  );
}
