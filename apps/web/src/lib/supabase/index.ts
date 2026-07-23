import 'server-only';

// Deliberately does not re-export `./client` (the browser client): that
// module is marked `'use client'`, while `./server` and `./admin` below
// pull in `server-only` — bundling both through one barrel would poison
// every client-component import of this file. Client components must
// import `@/lib/supabase/client` directly instead.
export { createAdminClient } from './admin';
export * from './errors';
export { updateSession } from './middleware';
export { createClient as createServerSupabaseClient } from './server';
export type { Database, Json } from './types';
