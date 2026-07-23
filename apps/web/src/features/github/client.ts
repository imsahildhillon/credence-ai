import 'server-only';

import { GithubError, type GithubApiRepository, type GithubApiUser } from './types';

/**
 * Low-level GitHub REST client. The *only* module that talks HTTP to
 * GitHub — everything above it (service, actions) deals in typed values,
 * never `fetch`. Server-only: it receives a bearer token as an argument and
 * that token must never reach a client bundle (CLAUDE.md §18.5).
 */
const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_API_VERSION = '2022-11-28';
const DEFAULT_PER_PAGE = 100;
// A single early-career student's owned repos; caps the blast radius of a
// runaway pagination loop well within GitHub's rate budget (PRD §10 scale).
const MAX_PAGES = 5;

function githubHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': GITHUB_API_VERSION,
    // GitHub requires a User-Agent; identifying the app is good API citizenship.
    'User-Agent': 'credence-ai',
  };
}

function isRateLimited(response: Response): boolean {
  // GitHub signals primary rate limiting with 403/429 AND a zeroed remaining
  // header — a plain 403 (e.g. token lacks a scope) is a different failure.
  const remaining = response.headers.get('x-ratelimit-remaining');
  return (response.status === 403 || response.status === 429) && remaining === '0';
}

async function githubGet(path: string, token: string): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`${GITHUB_API_BASE}${path}`, {
      headers: githubHeaders(token),
      // Never cache authenticated GitHub responses across requests/users.
      cache: 'no-store',
    });
  } catch {
    throw new GithubError('network', 'Could not reach GitHub.', undefined);
  }

  if (response.ok) {
    return response;
  }

  if (isRateLimited(response)) {
    throw new GithubError('rate_limited', 'GitHub rate limit reached. Try again shortly.', 403);
  }
  if (response.status === 401) {
    throw new GithubError('unauthorized', 'GitHub authorization is no longer valid.', 401);
  }
  if (response.status === 404) {
    throw new GithubError('not_found', 'The requested GitHub resource was not found.', 404);
  }
  throw new GithubError('unknown', `GitHub request failed (${response.status}).`, response.status);
}

export async function fetchAuthenticatedUser(token: string): Promise<GithubApiUser> {
  const response = await githubGet('/user', token);
  return (await response.json()) as GithubApiUser;
}

/**
 * Fetches every repository the token can see, following pagination up to
 * `MAX_PAGES`. Sorted by most-recently-updated so the selection screen leads
 * with a student's active work. `affiliation=owner` scopes to repos the
 * student owns (not org/collaborator repos) — the V1 evidence set.
 */
export async function fetchAllRepositories(token: string): Promise<GithubApiRepository[]> {
  const all: GithubApiRepository[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const response = await githubGet(
      `/user/repos?per_page=${DEFAULT_PER_PAGE}&page=${page}&sort=updated&affiliation=owner`,
      token,
    );
    const batch = (await response.json()) as GithubApiRepository[];
    all.push(...batch);

    // A short page means we've reached the end; stop before wasting a request.
    if (batch.length < DEFAULT_PER_PAGE) {
      break;
    }
  }

  return all;
}
