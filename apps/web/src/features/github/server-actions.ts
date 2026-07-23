'use server';

import type { User } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/features/auth/server/service';
import { normalizeSupabaseError } from '@/lib/supabase/errors';
import { createClient } from '@/lib/supabase/server';

import {
  getGithubAccountForCurrentUser,
  countSelectedRepositories,
  getLatestAnalysis,
} from './queries';
import { defaultIncluded, toRepositoryInsert } from './repository-mapper';
import { getAuthenticatedGithubUser, listAllGithubRepositories } from './service';
import {
  GithubError,
  type GithubAccountRow,
  type GithubErrorKind,
  type ImportResult,
} from './types';

const ONBOARDING_REPOS_PATH = '/onboarding/repositories';
const ONBOARDING_REVIEW_PATH = '/onboarding/review';

/**
 * Server Actions are the only place onboarding logic is invoked from
 * pages/components (CLAUDE.md §8.2, §14.1). Each one: authenticates,
 * derives identity from the *session* (never a client-supplied id),
 * validates ownership, then persists. GitHub tokens never leave the server.
 */

/** Calm, brand-voice copy per failure kind (CLAUDE.md §19.4). */
function githubErrorMessage(kind: GithubErrorKind): string {
  switch (kind) {
    case 'token_unavailable':
    case 'unauthorized':
      return 'Your GitHub connection needs refreshing — sign in again to reconnect.';
    case 'rate_limited':
      return "GitHub is rate-limiting us right now. Give it a minute and try again — nothing's lost.";
    case 'network':
      return "We couldn't reach GitHub just now. Check your connection and try again.";
    case 'not_found':
    case 'unknown':
      return "We couldn't import your repositories just now. Please try again in a moment.";
    default:
      return 'Please try again in a moment.';
  }
}

/** Fallback GitHub identity from the Supabase session when the API is unreachable. */
function deriveGithubIdentity(user: User): { id: number; login: string } | null {
  const metadata = user.user_metadata ?? {};
  const login = (metadata.user_name ?? metadata.preferred_username) as string | undefined;
  const providerId = (metadata.provider_id ?? metadata.sub) as string | undefined;
  if (!login || !providerId) {
    return null;
  }
  const id = Number(providerId);
  return Number.isFinite(id) ? { id, login } : null;
}

/**
 * Idempotently ensures the student's `github_accounts` row exists and
 * returns it. Prefers the authoritative GitHub `/user` payload; if the
 * provider token is unavailable (expected after a session refresh), falls
 * back to the identity already in the Supabase session so onboarding is
 * never blocked purely by a stale token. Writes through the RLS-scoped
 * client — the owner policy validates `profile_id = auth.uid()`.
 */
async function ensureGithubAccount(user: User): Promise<GithubAccountRow> {
  let githubUserId: number;
  let githubUsername: string;

  try {
    const apiUser = await getAuthenticatedGithubUser();
    githubUserId = apiUser.id;
    githubUsername = apiUser.login;
  } catch (error) {
    if (!(error instanceof GithubError)) {
      throw error;
    }
    const fallback = deriveGithubIdentity(user);
    if (!fallback) {
      throw error;
    }
    githubUserId = fallback.id;
    githubUsername = fallback.login;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('github_accounts')
    .upsert(
      { profile_id: user.id, github_user_id: githubUserId, github_username: githubUsername },
      { onConflict: 'profile_id' },
    )
    .select('*')
    .single();

  if (error) {
    throw normalizeSupabaseError(error);
  }
  return data;
}

/** Welcome → "Continue": ensures the GitHub account, then moves to import.
 * Takes `FormData` (unused) so it can be a progressive-enhancement `<form>`
 * action that works without JS. */
export async function connectGithubAction(_formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  await ensureGithubAccount(user);
  redirect(ONBOARDING_REPOS_PATH);
}

/**
 * Imports (or refreshes) the student's repositories from GitHub into
 * `repositories`. Preserves any existing per-repo selection across
 * re-imports — only a first-time import applies the default (own,
 * non-fork, non-archived → selected; PRD FR-2.1). Returns a typed result
 * the client renders inline; unexpected (non-GitHub) errors bubble to the
 * boundary.
 */
export async function importRepositoriesAction(): Promise<ImportResult> {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  try {
    const account = await ensureGithubAccount(user);
    const apiRepos = await listAllGithubRepositories();

    const supabase = await createClient();
    const { data: existing, error: existingError } = await supabase
      .from('repositories')
      .select('github_repo_id, included')
      .eq('github_account_id', account.id);
    if (existingError) {
      throw normalizeSupabaseError(existingError);
    }
    const priorSelection = new Map(existing?.map((row) => [row.github_repo_id, row.included]));

    const rows = apiRepos.map((apiRepo) =>
      toRepositoryInsert(
        apiRepo,
        account.id,
        priorSelection.get(apiRepo.id) ?? defaultIncluded(apiRepo),
      ),
    );

    if (rows.length > 0) {
      const { error } = await supabase
        .from('repositories')
        .upsert(rows, { onConflict: 'github_account_id,github_repo_id' });
      if (error) {
        throw normalizeSupabaseError(error);
      }
    }

    revalidatePath(ONBOARDING_REPOS_PATH);
    revalidatePath(ONBOARDING_REVIEW_PATH);
    return { status: 'success', imported: rows.length };
  } catch (error) {
    if (error instanceof GithubError) {
      return { status: 'error', kind: error.kind, message: githubErrorMessage(error.kind) };
    }
    throw error;
  }
}

/**
 * Toggles one repository's `selected_for_analysis` state (`included`).
 * Ownership is enforced twice: the update is scoped to the caller's own
 * `github_account_id` (derived from the session, never the client), and
 * RLS independently rejects any row whose account isn't the caller's.
 */
export async function setRepositorySelectionAction(
  githubRepoId: number,
  included: boolean,
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  const account = await getGithubAccountForCurrentUser();
  if (!account) {
    redirect('/onboarding');
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('repositories')
    .update({ included })
    .eq('github_account_id', account.id)
    .eq('github_repo_id', githubRepoId);
  if (error) {
    throw normalizeSupabaseError(error);
  }

  revalidatePath(ONBOARDING_REPOS_PATH);
  revalidatePath(ONBOARDING_REVIEW_PATH);
}

/** Bulk select/deselect every imported repository for the current student. */
export async function setAllRepositoriesSelectionAction(included: boolean): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  const account = await getGithubAccountForCurrentUser();
  if (!account) {
    redirect('/onboarding');
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('repositories')
    .update({ included })
    .eq('github_account_id', account.id);
  if (error) {
    throw normalizeSupabaseError(error);
  }

  revalidatePath(ONBOARDING_REPOS_PATH);
  revalidatePath(ONBOARDING_REVIEW_PATH);
}

/**
 * Review → "Start Analysis": enqueues the analysis job. No AI runs here —
 * it inserts one `analyses` row with status `queued` (the job's
 * `profile_id` is the user, `created_at` the timestamp; the selected
 * repositories are those with `included = true`). Reuses an already-active
 * job instead of stacking duplicates. Writes through the RLS-scoped client:
 * the narrow `analyses_insert_own_queued` policy lets a student enqueue only
 * a bare queued job for themselves (no assessment fields) — so authorization
 * lives in the database, not just this action.
 */
export async function startAnalysisAction(_formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  const account = await getGithubAccountForCurrentUser();
  if (!account) {
    redirect('/onboarding');
  }

  const selectedCount = await countSelectedRepositories(account.id);
  if (selectedCount < 1) {
    // Nothing selected — send them back to choose (the UI also guards this).
    redirect(ONBOARDING_REPOS_PATH);
  }

  const latest = await getLatestAnalysis(user.id);
  if (!latest || (latest.status !== 'queued' && latest.status !== 'processing')) {
    const supabase = await createClient();
    const { error } = await supabase
      .from('analyses')
      .insert({ profile_id: user.id, status: 'queued' });
    if (error) {
      throw normalizeSupabaseError(error);
    }
  }

  revalidatePath('/analysis');
  redirect('/analysis');
}
