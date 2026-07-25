import { redirect } from 'next/navigation';

/**
 * `/recruiter` has no content of its own — the candidate list is the
 * recruiter's entry point, same pattern as `/dashboard` routing students
 * into onboarding/analysis (CLAUDE.md: "Do NOT build dashboards").
 */
export default function RecruiterRootPage() {
  redirect('/recruiter/candidates');
}
