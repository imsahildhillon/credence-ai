import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { publicEnv } from '@/config/public-env';
import { getOrCreateProfile, toSafeRedirectPath } from '@/features/auth/server/service';
import { captureGithubOAuthCredentials } from '@/features/github/account';
import type { Database } from '@/lib/supabase/types';

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
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = toSafeRedirectPath(searchParams.get('next'));

  if (code) {
    // Bound to the exact response we return, rather than the ambient
    // `next/headers` cookie jar (`lib/supabase/server.ts`'s `createClient`).
    // That jar's `setAll` silently swallows write failures — correct for
    // ordinary Server Component reads, which can't write cookies at all,
    // but this route's entire job is to persist a brand-new session cookie
    // onto a redirect it constructs itself. Writing straight to `response`
    // guarantees the Set-Cookie headers travel with it regardless of
    // which context Next.js considers "current" when `setAll` runs — this
    // is the root cause of the production-only "authenticated redirected
    // to /login" bug: the cookie write was silently lost after this
    // redirect, not lost before it.
    const response = NextResponse.redirect(`${origin}${next}`);
    const supabase = createServerClient<Database>(
      publicEnv.NEXT_PUBLIC_SUPABASE_URL,
      publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );

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

      return response;
    }

    return NextResponse.redirect(`${origin}/login?error=oauth_callback_failed`);
  }

  return NextResponse.redirect(`${origin}/login?error=oauth_missing_code`);
}
