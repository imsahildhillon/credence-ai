import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import { env } from '@/config/env';

import type { Database } from './types';

/**
 * Service-role Supabase client — bypasses Row Level Security entirely.
 * Reserved for privileged server-only operations (webhooks, background
 * jobs, admin tooling) that must act across rows regardless of any user's
 * session. `import 'server-only'` guarantees this throws at build time if
 * anything in the client bundle ever reaches it (CLAUDE.md §9.6, §18.2).
 *
 * Never construct this to act "on behalf of" a request's user — every
 * call site must independently authorize before using it; there is no
 * session here to fall back on, only the assumption the caller already
 * checked (deny-by-default is the caller's job, not this client's).
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
