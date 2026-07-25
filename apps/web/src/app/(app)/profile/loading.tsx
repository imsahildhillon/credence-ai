import { ProfileSkeleton } from '@/features/profile/components/ProfileSkeleton';

/**
 * Route-level loading UI shown while the profile page reads and assembles
 * every section server-side — a shaped skeleton (CLAUDE.md §8.7, §21.5),
 * never a bare spinner.
 */
export default function Loading() {
  return <ProfileSkeleton />;
}
