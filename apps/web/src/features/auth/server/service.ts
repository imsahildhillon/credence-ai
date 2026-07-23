import 'server-only';

import type { User } from '@supabase/supabase-js';

import { env } from '@/config/env';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizeSupabaseError, type SupabaseError } from '@/lib/supabase/errors';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

const DEFAULT_POST_LOGIN_PATH = '/dashboard';

// Every account created through public sign-in is a student, decided by the
// server (ADR-003). Role is never read from client-influenceable metadata.
// Recruiters/admins are provisioned only by an operator via the service-role
// client, out of band from this flow.
const PUBLIC_SIGNUP_ROLE = 'student' as const satisfies Database['public']['Enums']['user_role'];

/**
 * Only a same-origin, relative path is ever used as a post-login redirect
 * target — a `next` query param straight from the URL is untrusted input
 * (CLAUDE.md §18.3) and must never become an open redirect. Anything else
 * (an absolute URL, a protocol-relative `//host` trick) falls back to the
 * default.
 */
export function toSafeRedirectPath(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return DEFAULT_POST_LOGIN_PATH;
  }
  return next;
}

/**
 * The one place `auth.getUser()` is called for authorization decisions.
 * Deliberately not `auth.getSession()` — that reads the session straight
 * from the (client-writable) cookie without asking the Auth server to
 * revalidate it; `getUser()` does, which is what makes it safe to gate
 * access on (Supabase SSR guidance).
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Starts the GitHub OAuth flow (PRD FR-1.1, students). Requests no scopes
 * beyond Supabase's default (basic profile + email) — the separate,
 * consent-gated private-repo escalation (FR-1.2) is a github-analysis
 * feature concern, not identity infrastructure, and is not implemented
 * here.
 */
export async function signInWithGithub(
  next?: string,
): Promise<{ url: string | null; error: SupabaseError | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback?next=${encodeURIComponent(toSafeRedirectPath(next))}`,
    },
  });

  if (error) {
    return { url: null, error: normalizeSupabaseError(error) };
  }
  return { url: data.url, error: null };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

/**
 * The `handle_new_user` trigger (docs/04-system-architecture.md) creates a
 * profile atomically inside the `auth.users` INSERT transaction on every
 * new account — that trigger is the primary, transactional bootstrap. This
 * function is the resilient *read* path the app uses on each request: it
 * returns the existing profile, and only self-heals the "missing profile"
 * edge case (a row absent despite a valid session — historical
 * inconsistency, a manually removed row, or a trigger that failed silently)
 * by inserting one.
 *
 * `role` is a hard-coded server literal (`PUBLIC_SIGNUP_ROLE`), never read
 * from `user.user_metadata` — that metadata is client-influenceable and
 * must never determine an authorization attribute (ADR-003). This mirrors
 * the hardened trigger exactly, so both bootstrap paths agree that a
 * publicly-created account is always a student.
 *
 * The insert uses the service-role client deliberately: profiles has no
 * client-facing INSERT policy (CLAUDE.md §18.2 — creation is a system
 * action, not a user privilege), so a normal RLS-scoped client cannot
 * perform it. `ignoreDuplicates` plus a re-fetch keeps this idempotent
 * under a race with the trigger or a concurrent request.
 */
export async function getOrCreateProfile(user: User): Promise<ProfileRow> {
  const supabase = await createClient();

  const { data: existing, error: selectError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (selectError) {
    throw normalizeSupabaseError(selectError);
  }
  if (existing) {
    return existing;
  }

  // Display fields only — non-privileged, provider-populated (GitHub).
  const fullName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    null;
  const avatarUrl = (user.user_metadata?.avatar_url as string | undefined) ?? null;

  const admin = createAdminClient();
  const { error: upsertError } = await admin
    .from('profiles')
    .upsert(
      { id: user.id, role: PUBLIC_SIGNUP_ROLE, full_name: fullName, avatar_url: avatarUrl },
      { onConflict: 'id', ignoreDuplicates: true },
    );

  if (upsertError) {
    throw normalizeSupabaseError(upsertError);
  }

  const { data: created, error: refetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (refetchError) {
    throw normalizeSupabaseError(refetchError);
  }
  return created;
}
