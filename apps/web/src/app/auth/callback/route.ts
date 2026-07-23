import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/**
 * Generic OAuth/email-link landing endpoint — every Supabase auth method
 * (Google, GitHub, email magic-link) redirects here with a `code` to
 * exchange for a session. This is provider-agnostic infrastructure, not a
 * provider integration: no provider is configured or implemented by this
 * route (Supabase foundation task, Step 5 — "prepare infrastructure,
 * don't implement providers").
 *
 * A designed error surface for the failure branch is a UI/feature-layer
 * concern for a later pass; for now, failure redirects home with a query
 * flag rather than a dedicated page.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/?auth_error=1`);
}
