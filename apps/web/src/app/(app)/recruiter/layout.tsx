import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getRecruiterSession } from '@/features/recruiter';

/**
 * Role gate for every `/recruiter/*` route (ADR-003's deferred "role-based
 * route gating" — the `(app)` layout above this one already proved the
 * request is signed in; this layer proves it's an *invited recruiter*
 * specifically, per CLAUDE.md §18.2 defense in depth). A student session
 * reaching any `/recruiter/*` URL is redirected to their own dashboard,
 * never shown so much as an empty recruiter shell.
 */
export default async function RecruiterLayout({ children }: { children: React.ReactNode }) {
  const recruiter = await getRecruiterSession();
  if (!recruiter) {
    redirect('/dashboard');
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <nav aria-label="Recruiter navigation" className="flex gap-4 border-b pb-4">
        <Link href="/recruiter/candidates" className="text-body font-medium">
          Candidates
        </Link>
      </nav>
      {children}
    </div>
  );
}
