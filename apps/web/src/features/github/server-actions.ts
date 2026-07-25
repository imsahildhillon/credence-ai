'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { trackEvent } from '@/features/analytics';
import { getCurrentUser } from '@/features/auth/server/service';
import { normalizeSupabaseError } from '@/lib/supabase/errors';
import { createClient } from '@/lib/supabase/server';

import { ensureGithubAccount } from './account';
import { getGithubAccountForCurrentUser, listSelectedRepositoryRefs } from './queries';
import { defaultIncluded, toRepositoryInsert } from './repository-mapper';
import { listAllGithubRepositories, resolveHeadCommitShas } from './service';
import { GithubError, type GithubErrorKind, type ImportResult } from './types';

const ONBOARDING_REPOS_PATH = '/onboarding/repositories';

/**
 * Server Actions are the only place onboarding logic is invoked from
 * pages/components (CLAUDE.md §8.2, §14.1). Each one: authenticates, derives
 * identity from the *session* (never a client-supplied id), validates
 * ownership, then delegates to the feature's service/account modules. GitHub
 * tokens never leave the server.
 */

/** Calm, brand-voice copy per failure kind (CLAUDE.md §19.4). */
function githubErrorMessage(kind: GithubErrorKind): string {
  switch (kind) {
    case 'token_unavailable':
    case 'unauthorized':
      return 'Your GitHub connection needs to be reconnected before we can read your repositories.';
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
 * re-imports — only a first-time import applies the default (own, non-fork,
 * non-archived → selected; PRD FR-2.1). Returns a typed result the client
 * renders inline; unexpected (non-GitHub) errors bubble to the boundary.
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
 * `github_account_id` (derived from the session, never the client), and RLS
 * independently rejects any row whose account isn't the caller's.
 *
 * Note this only affects *future* analyses — an already-queued job runs
 * against its immutable snapshot, not this flag.
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
}

/**
 * Confirm → "Start Analysis": enqueues the job together with an **immutable
 * snapshot** of the selected repositories, atomically.
 *
 * Before freezing the snapshot we best-effort resolve each repository's HEAD
 * commit so the run is pinned to exact commits; GitHub being unreachable
 * degrades to null SHAs rather than blocking the enqueue.
 *
 * The insert itself goes through `enqueue_analysis_with_snapshot()`, which
 * builds the snapshot from an ownership-scoped SQL query — so repository
 * ownership is validated in the database, and job + snapshot can never exist
 * without each other (CLAUDE.md §14.5).
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

  const selectedRefs = await listSelectedRepositoryRefs(account.id);
  if (selectedRefs.length === 0) {
    // Nothing selected — send them back to choose (the UI also guards this,
    // and the RPC rejects it as a final backstop).
    redirect(ONBOARDING_REPOS_PATH);
  }

  const commitShas = await resolveHeadCommitShas(selectedRefs);

  const supabase = await createClient();
  const { error } = await supabase.rpc('enqueue_analysis_with_snapshot', {
    p_commit_shas: commitShas,
  });
  if (error) {
    throw normalizeSupabaseError(error);
  }

  await trackEvent('repository_connected', { repositoryCount: selectedRefs.length });

  revalidatePath('/analysis');
  redirect('/analysis');
}
