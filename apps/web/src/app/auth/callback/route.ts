import { NextResponse } from 'next/server';

import { getOrCreateProfile, toSafeRedirectPath } from '@/features/auth/server/service';
import { captureGithubOAuthCredentials } from '@/features/github/account';
import { createClient } from '@/lib/supabase/server';

/**
 * GitHub OAuth landing endpoint — the provider redirects here with a `code`
 * to exchange for a session. GitHub is the only public identity path
 * (ADR-003); no other provider or email flow reaches this route.
 *
 * On success it does two things, both best-effort and neither of which
 * changes how authentication itself works:
 *
 *  1. Bootstraps the profile (self-healing — see `getOrCreateProfile`, which
 *     always assigns role=student server-side), so the next page render
 *     never hits a "missing profile" race.
 *  2. Captures the GitHub access token this exchange produced and persists it
 *     encrypted (ADR-004). This is the *only* moment the provider token is
 *     available; without capturing it here, repository access would die with
 *     the session.
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

      try {
        await captureGithubOAuthCredentials(data.user, data.session.provider_token);
      } catch {
        // Never break sign-in over credential capture. If this fails the app
        // falls back to the session's provider_token for this session and
        // re-attempts persistence on the next GitHub call.
      }

      return NextResponse.redirect(`${origin}${next}`);
    }

    return NextResponse.redirect(`${origin}/login?error=oauth_callback_failed`);
  }

  return NextResponse.redirect(`${origin}/login?error=oauth_missing_code`);
}
