import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { publicEnv } from '@/config/public-env';

import type { Database } from './types';

/**
 * Refreshes the Supabase session cookie for a request. Uses `publicEnv`
 * (not `env`) deliberately — middleware only ever needs the anon key, and
 * keeping the service-role key out of this module's reach means it's
 * structurally impossible for the highest-traffic, most-exposed code path
 * in the app to leak it.
 *
 * Session refresh only — no redirect or access-rule logic here (Step 7 of
 * the Supabase foundation task defers that intentionally; see
 * `apps/web/src/middleware.ts` for the route lists it will consume).
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Required by @supabase/ssr even though the result is unused here: this
  // call is what actually refreshes an expired access token server-side,
  // before any Server Component reads the session from the cookie.
  await supabase.auth.getUser();

  return response;
}
