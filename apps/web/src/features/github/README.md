# features/github/

GitHub integration: linking a student's GitHub account, importing repositories, and enqueueing analysis jobs. No AI and no evidence extraction live here.

**Public interface:**

- `server-actions.ts` — the app boundary (`connectGithubAction`, `importRepositoriesAction`, `setRepositorySelectionAction`, `setAllRepositoriesSelectionAction`, `startAnalysisAction`). Pages and components call only these.
- `queries.ts` — RLS-scoped reads: `getGithubAccountForCurrentUser`, `listRepositorySummaries`, `listSelectedRepositoryRefs`, `listAnalysisSnapshot`, `getLatestAnalysis`.
- `service.ts` — token resolution + GitHub API orchestration. `client.ts` — raw HTTP. `credentials.ts` — encrypted token storage. `account.ts` — account linking + OAuth credential capture. `repository-mapper.ts` — pure mapping.

**Key invariants:**

- **A GitHub token never leaves the server.** It is read from encrypted storage (service-role only), passed solely to `client.ts`, and is never returned from an exported function, serialized into a prop, or logged. `github_credentials` is unreachable from any browser session: RLS enabled with zero policies _and_ grants revoked from `anon`/`authenticated`.
- **Tokens are durable, not session-bound** — captured at the OAuth callback and encrypted at rest (ADR-004). Session `provider_token` is only a fallback, and using it opportunistically upgrades storage.
- **Revocation is detected in one place** (`withGithubToken`): a GitHub 401 marks `revoked_at` and drives the reconnect affordance.
- **Analysis jobs are defined by an immutable snapshot** (ADR-005), never by `repositories.included`. The worker must read `listAnalysisSnapshot()`. Snapshot creation is atomic and ownership-validated in SQL by `enqueue_analysis_with_snapshot()`.
- Selection changes affect only _future_ runs — an in-flight job is unaffected by design.

**Environment:** `GITHUB_TOKEN_ENCRYPTION_KEY` (32 bytes, base64) encrypts stored tokens; `SUPABASE_SERVICE_ROLE_KEY` is required to reach credential storage. Without either, the module degrades to session-token behavior rather than failing.

**Full documentation:** [docs/04-system-architecture.md](../../../../../docs/04-system-architecture.md) § GitHub Integration & Credential Lifecycle and § Analysis Lifecycle & Snapshots. Related: [ADR-004](../../../../../docs/adr/ADR-004-durable-github-credentials.md), [ADR-005](../../../../../docs/adr/ADR-005-immutable-analysis-snapshots.md).
