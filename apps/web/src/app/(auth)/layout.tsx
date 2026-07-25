import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/features/auth/server/service';

/**
 * Defense-in-depth alongside the root middleware (CLAUDE.md §18.2 —
 * authorization checked on every access, not one layer only): an already
 * signed-in user has no reason to see login, so this layout redirects
 * them to /dashboard server-side too, independent of whether
 * the middleware matcher ever misses this path.
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (user) {
    redirect('/dashboard');
  }

  return <div className="flex min-h-svh items-center justify-center p-8">{children}</div>;
}
