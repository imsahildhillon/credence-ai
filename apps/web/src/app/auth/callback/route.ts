import { randomUUID } from 'node:crypto';

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { publicEnv } from '@/config/public-env';
import { getOrCreateProfile, toSafeRedirectPath } from '@/features/auth/server/service';
import {
  captureGithubOAuthCredentials,
  describeProviderTokenAbsence,
  logOAuthCallbackOutcome,
} from '@/features/github/account';
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
 *
 * Every request logs exactly one terminal outcome via
 * `logOAuthCallbackOutcome` (`features/github/account.ts`), tagged with a
 * per-request `correlationId` so one request's whole story — exchange,
 * profile bootstrap, credential capture — can be reconstructed from logs
 * alone. No `catch` in this file is empty; every one produces a log line.
 */
export async function GET(request: NextRequest) {
  const correlationId = randomUUID();
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = toSafeRedirectPath(searchParams.get('next'));

  if (!code) {
    console.warn('[auth-callback] missing_code', { correlationId });
    return NextResponse.redirect(`${origin}/login?error=oauth_missing_code`);
  }

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

  if (error) {
    // The complete Supabase error, not a summary — this branch previously
    // had no log statement at all, which is why every credential-capture log
    // downstream of it could be deployed correctly and still never fire: a
    // request that exits here never reaches any of them.
    logOAuthCallbackOutcome(correlationId, 'unknown', {
      outcome: 'exchange_failed',
      error: { name: error.name, message: error.message, status: error.status, code: error.code },
    });
    return NextResponse.redirect(`${origin}/login?error=oauth_callback_failed`);
  }

  try {
    await getOrCreateProfile(data.user);
  } catch (profileError) {
    // Degraded-but-recoverable (CLAUDE.md §19.5) — the (app) layout retries
    // this same self-healing read on every protected page render. Still
    // logged: this used to be an empty `catch {}`, the same silent-failure
    // shape as the credential-capture gap this file exists to close.
    console.warn('[auth-callback] profile_bootstrap_failed', {
      correlationId,
      userId: data.user.id,
      error:
        profileError instanceof Error
          ? { name: profileError.name, message: profileError.message }
          : profileError,
    });
  }

  console.warn('[auth-callback] capture_credentials_start', {
    correlationId,
    userId: data.user.id,
  });

  let captureResult;
  try {
    captureResult = await captureGithubOAuthCredentials(
      data.user,
      data.session.provider_token,
      describeProviderTokenAbsence(data.session),
      supabase,
    );
  } catch (error) {
    // `captureGithubOAuthCredentials` is designed to never throw (every
    // internal failure is returned as an outcome, not thrown) — this is a
    // safety net for a genuine bug in that function, not an expected path.
    // Sign-in must not break over it, but it must never be silent either.
    console.error('[auth-callback] capture_credentials_threw', {
      correlationId,
      userId: data.user.id,
      error: error instanceof Error ? { name: error.name, message: error.message } : error,
    });
    return response;
  }

  console.warn('[auth-callback] capture_credentials_end', {
    correlationId,
    userId: data.user.id,
    outcome: captureResult.outcome,
  });

  logOAuthCallbackOutcome(correlationId, data.user.id, captureResult);

  return response;
}
