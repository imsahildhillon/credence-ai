import { redirect } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { signOutAction } from '@/features/auth/server/actions';
import { getCurrentUser } from '@/features/auth/server/service';

/**
 * Defense-in-depth alongside the root middleware (CLAUDE.md §18.2): every
 * protected page renders under this layout, so even a middleware matcher
 * gap can't serve a protected page to a signed-out request. This is
 * identity scaffolding only — no dashboard chrome beyond a sign-out
 * control (CLAUDE.md: "Do NOT build dashboards").
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-end border-b p-4">
        <form action={signOutAction}>
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </header>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
