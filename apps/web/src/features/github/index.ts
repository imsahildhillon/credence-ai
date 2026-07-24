import 'server-only';

/**
 * Public interface of the `github` feature for other features to consume
 * (CLAUDE.md §4: cross-feature needs go through a feature's exported public
 * interface, never its internals).
 *
 * The evidence pipeline needs exactly two things from here — a GitHub token
 * for a known account, and the ability to record that GitHub rejected it.
 * Everything else in this feature stays private.
 */
export { markGithubCredentialRevoked, readGithubAccessToken } from './credentials';
export { GithubError } from './types';
export type { GithubErrorKind } from './types';
