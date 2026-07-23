import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

import { publicEnv } from '@/config/public-env';

import type { Database } from './types';

export interface SessionRefreshResult {
  response: NextResponse;
  user: User | null;
}

/**
 * Refreshes the Supabase session cookie for a request and returns the
 * revalidated user, so the caller (root `middleware.ts`) can make route
 * protection decisions without a second round trip to the Auth server.
 * Uses `publicEnv` (not `env`) deliberately — middleware only ever needs
 * the anon key, and keeping the service-role key out of this module's
 * reach means it's structurally impossible for the highest-traffic, most-
 * exposed code path in the app to leak it.
 */
export async function updateSession(request: NextRequest): Promise<SessionRefreshResult> {
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

  // Not `getSession()`: this call revalidates the token against the Auth
  // server rather than trusting the client-writable cookie, which is what
  // makes the returned `user` safe to base a redirect decision on.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
