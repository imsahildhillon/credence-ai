import { NextResponse } from 'next/server';

import { getOrCreateProfile, toSafeRedirectPath } from '@/features/auth/server/service';
import { createClient } from '@/lib/supabase/server';

/**
 * GitHub OAuth landing endpoint — the provider redirects here with a `code`
 * to exchange for a session. GitHub is the only public identity path
 * (ADR-003); no other provider or email flow reaches this route.
 *
 * On success, bootstraps the profile (self-healing — see
 * `getOrCreateProfile`, which always assigns role=student server-side)
 * before redirecting on, so the very next page render never hits a
 * "missing profile" race.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = toSafeRedirectPath(searchParams.get('next'));

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      try {
        await getOrCreateProfile(data.user);
      } catch {
        // Profile bootstrap failing here is a degraded-but-recoverable
        // state (CLAUDE.md §19.5) — the (app) layout retries the same
        // self-healing read on every protected page render, so a
        // transient failure at this exact moment doesn't strand the user;
        // it just means one extra render before the profile appears.
      }
      return NextResponse.redirect(`${origin}${next}`);
    }

    return NextResponse.redirect(`${origin}/login?error=oauth_callback_failed`);
  }

  return NextResponse.redirect(`${origin}/login?error=oauth_missing_code`);
}
