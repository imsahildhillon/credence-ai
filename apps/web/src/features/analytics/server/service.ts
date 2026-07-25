import 'server-only';

import { getCurrentUser } from '@/features/auth/server/service';
import { createClient } from '@/lib/supabase/server';

import type { AnalyticsEventMetadata, AnalyticsEventName } from '../types';

/**
 * Records one product-analytics event under the current user's own RLS
 * session (CLAUDE.md §18.2 — no service-role writes). Analytics is
 * best-effort and silently swallows any failure — a full outage of this
 * table must never break the page that calls it (CLAUDE.md §19.1: this is
 * not a domain failure the user needs to see, and not an unexpected bug
 * worth surfacing either).
 *
 * `analysis_completed` and `repository_connected` are one-time milestones
 * enforced by a partial unique index (`analytics_events_milestone_once_idx`)
 * — a repeat call's unique-violation is expected, not an error.
 */
export async function trackEvent<T extends AnalyticsEventName>(
  eventName: T,
  metadata: AnalyticsEventMetadata[T],
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    return;
  }

  const supabase = await createClient();
  await supabase.from('analytics_events').insert({
    profile_id: user.id,
    event_name: eventName,
    metadata,
  });
}
