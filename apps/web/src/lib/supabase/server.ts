import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { publicEnv } from '@/config/public-env';

import type { Database } from './types';

/**
 * Server Component / Route Handler / Server Action Supabase client. Reads
 * and writes the auth cookie via `next/headers`, so it carries the
 * requesting user's own session — queries still run under that user's Row
 * Level Security policies, never elevated (CLAUDE.md §18.2). Uses only the
 * anon key; if a call site needs to bypass RLS, that's `admin.ts`, chosen
 * deliberately, never this file.
 *
 * Construct a new client per request — Supabase clients are cheap and
 * request-scoped cookies must never be reused across requests.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components can't write cookies (Next.js constraint) —
            // safe to ignore here because `middleware.ts` refreshes the
            // session on every request instead.
          }
        },
      },
    },
  );
}
