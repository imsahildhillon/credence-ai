import 'server-only';

import { getCurrentUser } from '@/features/auth/server/service';
import { normalizeSupabaseError } from '@/lib/supabase/errors';
import { createClient } from '@/lib/supabase/server';

/**
 * "Only invited recruiters" (this sprint's Security requirement) is proven
 * by one fact: a `recruiters` row exists for this user's id. Recruiter
 * accounts are provisioned exclusively by an operator through the service-
 * role client (ADR-003) — there is no self-service path that could create
 * this row, so its existence *is* the invitation.
 *
 * This is the service-layer authorization check CLAUDE.md §18.2 asks for
 * in addition to RLS — every recruiter-facing page and query in this
 * feature calls this first and fails closed on `null`, rather than relying
 * solely on the database silently returning empty rows for a non-recruiter.
 */
export interface RecruiterSession {
  readonly userId: string;
  readonly organizationId: string;
}

export async function getRecruiterSession(): Promise<RecruiterSession | null> {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('recruiters')
    .select('id, organization_id')
    .eq('id', user.id)
    .maybeSingle();
  if (error) {
    throw normalizeSupabaseError(error);
  }
  if (!data) {
    return null;
  }

  return { userId: data.id, organizationId: data.organization_id };
}
