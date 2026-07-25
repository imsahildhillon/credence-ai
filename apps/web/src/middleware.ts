import { NextResponse, type NextRequest } from 'next/server';

import { updateSession } from '@/lib/supabase/middleware';

/**
 * The three route-group buckets under `app/` agree with this list
 * (CLAUDE.md §9.7: middleware handles cross-cutting concerns only).
 *
 *   - `(public)` — PUBLIC_ROUTES: never gated, listed for reference only.
 *   - `(auth)`   — AUTH_ROUTES: redirect *away* from these when already signed in.
 *   - `(app)`    — PROTECTED_ROUTE_PREFIXES: redirect *to* /login when signed out.
 *
 * These sets are mutually exclusive by construction, which is what
 * prevents a redirect loop: a request can match at most one of
 * AUTH_ROUTES / PROTECTED_ROUTE_PREFIXES, never both, so the two redirect
 * branches below can never fire on the same request.
 *
 * Every authenticated account was a student until the Recruiter MVP
 * (ADR-003 — the only public identity path is GitHub OAuth, which always
 * yields role=student; recruiters are operator-provisioned, never
 * self-registered). `/recruiter` is now a protected prefix like any other,
 * so a signed-out request is redirected to `/login` same as `/dashboard`
 * — but session alone doesn't prove *recruiter*, so the additional role
 * check lives in `app/(app)/recruiter/layout.tsx`
 * (`getRecruiterSession`), not here, per the plan ADR-003 already laid out.
 */
export const PUBLIC_ROUTES = ['/', '/auth/callback', '/recruiter-access'] as const;
export const AUTH_ROUTES = ['/login', '/signup'] as const;
export const PROTECTED_ROUTE_PREFIXES = [
  '/dashboard',
  '/profile',
  '/settings',
  '/onboarding',
  '/analysis',
  '/recruiter',
] as const;

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isProtectedRoute = PROTECTED_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname === route);

  if (isProtectedRoute && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
