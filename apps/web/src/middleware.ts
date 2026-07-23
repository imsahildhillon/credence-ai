import { type NextRequest } from 'next/server';

import { updateSession } from '@/lib/supabase/middleware';

/**
 * Route groups the auth layer will gate once access rules exist (CLAUDE.md
 * §9.7: middleware handles cross-cutting concerns only, never business
 * logic). Named here so the eventual authorization check and this file's
 * `matcher` agree on one definition of "public" vs "protected" — no
 * redirect or gating logic is implemented yet; that is explicitly out of
 * scope for this pass (Supabase foundation, Step 7).
 */
export const PUBLIC_ROUTES = ['/', '/login', '/auth/callback'] as const;

export const PROTECTED_ROUTE_PREFIXES = ['/dashboard', '/profile', '/settings'] as const;

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
