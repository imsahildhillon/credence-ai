'use client';

import { createBrowserClient } from '@supabase/ssr';

import { publicEnv } from '@/config/public-env';

import type { Database } from './types';

/**
 * Browser-only Supabase client. Uses the anon key exclusively — Row Level
 * Security policies are the actual access boundary for anything this
 * client touches (CLAUDE.md §18.2: authorization is never "the client
 * gates it"). Never import `admin.ts` from a client component; this is
 * the only Supabase entry point client code may use.
 *
 * One instance per component tree is enough — `@supabase/ssr` manages the
 * underlying session/cookie sync itself, so callers don't need to memoize
 * this beyond React's own re-render behavior.
 */
export function createClient() {
  return createBrowserClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
