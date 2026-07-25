'use server';

import { trackEvent } from './service';

/**
 * The one client-triggerable analytics event — expanding a skill card's
 * evidence (CLAUDE.md §9.4: Server Actions validate/authorize
 * independently, same as any other action; `trackEvent` itself resolves
 * the current user from the session, never trusts a client-supplied ID).
 */
export async function trackEvidenceExpandedAction(skillSlug: string): Promise<void> {
  await trackEvent('evidence_expanded', { skillSlug });
}
