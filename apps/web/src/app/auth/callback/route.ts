import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { publicEnv } from '@/config/public-env';
import { getOrCreateProfile, toSafeRedirectPath } from '@/features/auth/server/service';
import { captureGithubOAuthCredentials } from '@/features/github/account';
import { createClient as createSharedClient } from '@/lib/supabase/server';
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
      // DIAGNOSTIC ONLY (credential-capture investigation) — does not affect
      // auth flow or control flow. Confirms whether `lib/supabase/server.ts`'s
      // shared client (the one `upsertGithubAccount` uses) can see the
      // session this route just established, or only the pre-auth cookies
      // it was constructed from (see the two-cookie-jar trace above).
      console.warn('[auth][diagnostic] session established', { userId: data.session.user.id });
      const sharedClient = await createSharedClient();
      const { data: auth } = await sharedClient.auth.getUser();
      console.warn('[auth][diagnostic] shared client getUser result', {
        sharedClientUserId: auth.user?.id ?? null,
        sharedClientUserIsNull: auth.user === null,
      });

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
        const captureResult = await captureGithubOAuthCredentials(
          data.user,
          data.session.provider_token,
        );
        switch (captureResult.outcome) {
          case 'captured':
            break; // Happy path — no noise needed.
          case 'no_provider_token':
            // Expected some of the time (GitHub/Supabase doesn't guarantee a
            // fresh provider_token on every exchange) — resolveGithubAccess's
            // opportunistic persist (features/github/service.ts) is the
            // designed self-heal for this case, not an error on its own.
            // Logged as a fact, not a failure, so a real pattern is still
            // visible without being alarmed on every occurrence.
            console.warn('[auth] github sign-in produced no provider_token to capture', {
              userId: data.user.id,
            });
            break;
          case 'persist_failed':
            // Never silent — this is exactly the gap that made two students'
            // missing github_credentials rows undiagnosable from logs alone.
            console.error(
              '[auth] failed to persist github credential',
              JSON.stringify({
                userId: data.user.id,
                error:
                  captureResult.error instanceof Error
                    ? { name: captureResult.error.name, message: captureResult.error.message }
                    : captureResult.error,
              }),
            );
            break;
        }
      } catch (error) {
        // Never break sign-in over credential capture — but never silent
        // either. If this fires, it's a bug in captureGithubOAuthCredentials
        // itself (it's designed to never throw); still degrade gracefully.
        console.error(
          '[auth] unexpected error capturing github credential:',
          error instanceof Error ? error.message : error,
        );
      }

      return response;
    }

    return NextResponse.redirect(`${origin}/login?error=oauth_callback_failed`);
  }

  return NextResponse.redirect(`${origin}/login?error=oauth_missing_code`);
}
