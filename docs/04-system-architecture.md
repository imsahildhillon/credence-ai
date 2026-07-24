# System Architecture

Companion to [CLAUDE.md](../CLAUDE.md) (engineering standards) and [docs/adr/](adr/) (why specific choices were made). This document describes the resolved backend architecture as it stands today; it grows section-by-section as further decisions are made — each addition should link back to its ADR.

## Backend Platform: Supabase

Per [ADR-001](adr/ADR-001-authentication.md) and [ADR-002](adr/ADR-002-database-migrations.md), Supabase is the backend platform for V1:

- **Auth:** Supabase Auth — GitHub OAuth for students, email magic-link for recruiters (CLAUDE.md §3, §18.2).
- **Database:** Supabase-hosted PostgreSQL. Schema and migrations are managed exclusively through the Supabase CLI (`supabase/migrations/`) — not Prisma, not an ORM.
- **Source of truth:** the live Supabase project's schema is authoritative. `apps/web/src/lib/supabase/types.ts` is generated from it (`supabase gen types typescript`) and is never hand-edited.
- **Storage:** Supabase Storage buckets (e.g., a private `resumes` bucket), gated by the same RLS model as the database.
- **Data access:** application code reads and writes through `@supabase/supabase-js` (via `apps/web/src/lib/supabase/`), parameterized on the generated `Database` type — no ORM layer sits in between.
- **Authorization enforcement:** Postgres Row Level Security is the primary, structurally-enforced deny-by-default boundary (CLAUDE.md §18.2) — not an application-layer-only check. The single consent-check service (CLAUDE.md §16.5) sits on top of RLS, not instead of it.

## Client responsibilities (`apps/web/src/lib/supabase/`)

Full detail lives in that module's own README; summarized here for architectural context:

| Client | Runs in | Key used | Purpose |
|---|---|---|---|
| `client.ts` | Browser | anon | User-scoped, RLS-enforced |
| `server.ts` | Server Components / Server Actions / Route Handlers | anon + session cookie | User-scoped, RLS-enforced |
| `admin.ts` | Server-only (jobs, webhooks) | service role | Bypasses RLS — used only where the caller independently authorizes (never per-request on a user's behalf) |
| `middleware.ts` | Edge middleware | anon | Session refresh + route protection (see below) |

## Authentication & Session Flow

Implements Supabase Auth (ADR-001) for identity only, hardened to be **server-authoritative** (ADR-003) — no product features live here. There are exactly two identity paths: **students via GitHub OAuth**, and **recruiters by operator invitation only** (not yet built). The browser never supplies a role or any other authorization attribute.

### Why GitHub is the only student identity provider

GitHub identity *is* the product's evidence anchor — a student's credibility is built from their repositories (PRD FR-1.1, §2 "GitHub identity is core"). Authenticating students through GitHub means the identity and the primary evidence source are the same verified account, with nothing to reconcile. It also collapses the sign-in surface to a single OAuth button: no passwords to store or reset, no email-deliverability dependency, and no second credential to phish. Email/magic-link sign-in for students was removed as unnecessary complexity that served no product need.

### Why public recruiter signup was removed

The prior model let anyone self-register as a recruiter via email magic-link, with the desired role passed from the browser as `user_metadata`. This was both a product-model violation (PRD FR-1.3 requires operator-issued, invitation-only recruiter access) and a **security defect**: role travelled across the trust boundary from client to server, and a crafted request could assert `role: 'admin'` and self-provision elevated access on first sign-in (see Threat Model below). The fix is structural rather than validative — the public simply has no path to create a recruiter or admin, and the server assigns role, so there is no client-supplied role to validate or trust in the first place. Recruiter onboarding is replaced by an informational placeholder (`/recruiter-access`) until invitations are built.

### Providers

- **GitHub OAuth (students, PRD FR-1.1)** is the only configured provider, set up *in the Supabase project*, not in application code — there is no app-side OAuth client secret for the sign-in flow itself.
- **Manual dashboard steps** (cannot be automated via the Supabase connector — it has no tool that reads/writes provider config):
  1. Create a GitHub OAuth App (github.com/settings/developers). Homepage URL = the app's canonical URL per environment. **Authorization callback URL = `https://<project-ref>.supabase.co/auth/v1/callback`** — this is Supabase's fixed GoTrue callback, *not* this app's own `/auth/callback` route; GoTrue receives GitHub's redirect first, then forwards the browser on to whatever `redirectTo` the app requested.
  2. Supabase Dashboard → Authentication → Providers → GitHub: enable, paste the Client ID and Client Secret from step 1.
  3. Supabase Dashboard → Authentication → URL Configuration: set **Site URL** to the app's canonical URL per environment, and add this app's `/auth/callback` URL (e.g. `http://localhost:3000/auth/callback` for local dev) to **Redirect URLs** — Supabase rejects any `redirectTo` not on this allowlist.
  4. **Defense-in-depth (recommended):** disable the **Email** provider so no email/OTP path exists at the GoTrue layer either. The application no longer calls it, and the hardened `handle_new_user` trigger makes role injection impossible regardless, but disabling the provider removes the account-creation surface entirely. Leave `disable_signup` **off** — it would block legitimate student GitHub signup.
- No other provider (Google, etc.) is configured.

### Sign-in flow

1. `signInWithGithubAction` (`features/auth/server/actions.ts`) → `service.signInWithGithub()` calls `supabase.auth.signInWithOAuth({ provider: 'github' })` with `redirectTo` pointed at this app's `/auth/callback`, and redirects the browser to the returned provider URL. No role, email, or other identity attribute is read from the request. No extra scopes are requested — the separate, consent-gated private-repo escalation (FR-1.2) is a future github-analysis feature, not identity infrastructure.
2. GitHub is both sign-in and sign-up (OAuth does not distinguish); Supabase Auth provisions the `auth.users` row on first success. `/login` and `/signup` render the identical GitHub-only form with different framing copy only.
3. Recruiters have **no** sign-in action. `/recruiter-access` is a static informational page that creates no account.

### Redirect flow

- `app/auth/callback/route.ts` is the GitHub OAuth landing point: exchanges `code` for a session (`exchangeCodeForSession`), bootstraps the profile, then redirects to `next` (or `/dashboard` by default).
- **`next` is untrusted input.** `toSafeRedirectPath()` (`features/auth/server/service.ts`) accepts only same-origin relative paths (`/…`, never `//…` or an absolute URL) — every redirect target in this flow (`/auth/callback`, the OAuth `redirectTo`, the middleware's post-login bounce) is passed through it. This is the app's sole open-redirect guard.
- **Root middleware** (`apps/web/src/middleware.ts`) refreshes the session on every request via `updateSession()`, then applies route protection using three mutually-exclusive route sets:
  - `PUBLIC_ROUTES` (`/`, `/auth/callback`, `/recruiter-access`) — never gated.
  - `AUTH_ROUTES` (`/login`, `/signup`) — redirect to `/dashboard` if already signed in.
  - `PROTECTED_ROUTE_PREFIXES` (`/dashboard`, `/settings`, `/profile`) — redirect to `/login?next=<path>` if signed out.
  
  Because a request can match at most one of the two gated sets, the two redirect branches can never both fire — this is what rules out a redirect loop, not a special-cased loop-detection check. Every authenticated account is a student today, so a session check *is* a "student" check; recruiter routes (when they exist) will need an explicit role check, not merely a session check.
- **Layout-level checks are defense-in-depth**, not the primary gate: `(auth)/layout.tsx` and `(app)/layout.tsx` independently call `getCurrentUser()` and redirect, so a middleware matcher gap can never itself expose a protected page or leak the login form to a signed-in user (CLAUDE.md §18.2 — checked on every access, not one layer only).
- `getCurrentUser()` always calls `auth.getUser()`, never `auth.getSession()` for an authorization decision — `getUser()` revalidates the token against the Auth server; `getSession()` trusts the client-writable cookie alone.

### Profile bootstrap

Bootstrap is **idempotent, transactional, and entirely server-side**, and always assigns `role = student` — never derived from any client-controlled metadata.

- **Primary path (transactional):** the `handle_new_user` trigger on `auth.users` (migration `20260723091619_create_profiles.sql`, hardened by `20260723160000_harden_handle_new_user_server_authoritative_role.sql`) inserts a `profiles` row **inside the `auth.users` INSERT transaction** — atomic with account creation. `role` is a hard-coded `'student'` literal; it is **not** read from `raw_user_meta_data`. Because `profiles.id` *is* `auth.users.id` (shared primary key), a duplicate is a schema-level impossibility.
- **Resilient path (idempotent):** `getOrCreateProfile(user)` is the read path every page uses. It returns the existing profile; only if one is genuinely missing (self-heal for historical inconsistency, a manually-removed row, or a trigger that failed silently — CLAUDE.md §19) does it insert one, via the service-role client (`profiles` has no client-facing INSERT policy — creation is a system action, not a user privilege) with `onConflict: 'id', ignoreDuplicates: true` and a re-fetch, so a race with the trigger is harmless.
- **Role is a server literal in both paths** (`PUBLIC_SIGNUP_ROLE = 'student'`). `full_name`/`avatar_url` are still taken from provider metadata (the GitHub profile) — non-privileged display fields, not an authorization boundary — falling back to `null`.

### Threat model (identity)

| Threat | Vector (pre-hardening) | Control (now) |
|---|---|---|
| **Privilege escalation via role injection** | Role carried from browser as `user_metadata.role` and copied into `profiles.role` by the signup trigger; a crafted request could assert `role: 'admin'` and self-provision admin (read access to regulated consent/audit data). The `prevent_role_self_escalation` trigger did *not* catch it — it fires on UPDATE, the injection was at INSERT. | Role is a hard-coded server literal in the trigger and in `getOrCreateProfile`; no code path reads role from client input. Injection is structurally impossible, not merely validated against. |
| **Unauthorized recruiter/admin account creation** | Open `signInWithOtp` + `disable_signup: false` let any email self-register as recruiter. | No public path creates a recruiter or admin at all; GitHub OAuth only ever yields `student`. Recruiter/admin provisioning is operator-only via the service-role client. Recommended dashboard hardening: disable the Email provider. |
| **Open redirect** | A `next` param could point off-origin. | `toSafeRedirectPath()` allows only same-origin relative paths; applied to every redirect target. |
| **Session forgery / stale-cookie trust** | Trusting a client-writable session cookie for authorization. | `auth.getUser()` (server-revalidated) is used for every authorization decision; `getSession()` is never the gate. |
| **Broken access control at the data layer** | — | Independent of app-layer auth: Postgres RLS is deny-by-default on every table (schema migrations), so even a mistaken app-layer decision cannot expose another user's rows. Auth here is one layer of several. |

### Error handling

| Failure | Where | Behavior |
|---|---|---|
| OAuth init fails (provider misconfigured, network) | `signInWithGithubAction` | Redirects to `/login?error=oauth_init_failed`, calm inline message |
| Code exchange fails (expired/revoked OAuth grant) | `/auth/callback` | Redirects to `/login?error=oauth_callback_failed` |
| Callback hit with no `code` | `/auth/callback` | Redirects to `/login?error=oauth_missing_code` |
| Profile bootstrap fails at callback time | `/auth/callback` | Swallowed there deliberately — `getOrCreateProfile` retries the same self-healing read on the very next protected-page render, so a transient failure doesn't strand the user (CLAUDE.md §19.5, partial failure is honest, not fatal) |

### Recruiter onboarding (future work)

Recruiter access is **invitation-only and not yet implemented**. `/recruiter-access` is a public placeholder (invitation-only notice, "coming soon", placeholder contact) that creates no account. The intended flow, when built (PRD FR-1.3): an operator issues a single-use, 7-day invitation via `supabase.auth.admin.inviteUserByEmail(email, { data: … })` (service-role) with the organization/workspace seeded in `organizations`/`recruiters`; the invited recruiter completes sign-in through the invite link. Because role is set by the *inviter* (server-side, service-role) and never by the recruiter, this stays consistent with the server-authoritative model — the invitee has no self-asserted role at any point.

## GitHub Integration & Credential Lifecycle

Implements [ADR-004](adr/ADR-004-durable-github-credentials.md). Module: `apps/web/src/features/github/`.

### Layering

| File | Responsibility |
|---|---|
| `client.ts` | The only module that speaks HTTP to GitHub. Takes a bearer token as an argument; pagination, rate-limit detection, typed `GithubError`s. |
| `service.ts` | Token resolution, revocation detection, and API orchestration. Never returns a token to its callers. |
| `credentials.ts` | Encrypted read/write of stored tokens (service-role only). |
| `account.ts` | Links a Supabase identity to a `github_accounts` row; captures credentials at the OAuth callback. |
| `queries.ts` | RLS-scoped reads (repositories, snapshots). |
| `server-actions.ts` | The app boundary: authenticate → validate ownership → delegate. |
| `repository-mapper.ts` | Pure GitHub ↔ row ↔ view-model mapping. |

### Why tokens are persisted

Repository access previously used the Supabase session's `provider_token`, which Supabase does not persist and drops on token refresh — so imports worked right after login and then silently stopped. Tokens are now captured once, at the OAuth callback, and stored encrypted.

### Credential lifecycle

1. **Capture** — `app/auth/callback/route.ts` → `captureGithubOAuthCredentials()` right after `exchangeCodeForSession()`, the only moment the provider token exists. Best-effort: a failure never breaks sign-in.
2. **Store** — AES-256-GCM envelope (`v1.<iv>.<authTag>.<ciphertext>`) in `github_credentials`. That table has **RLS enabled with zero policies** and grants revoked from `anon`/`authenticated`; only the service-role client can touch it. The encryption key (`GITHUB_TOKEN_ENCRYPTION_KEY`) lives only in the environment, so a database dump alone yields nothing usable.
3. **Use** — `service.ts` resolves: stored credential → session `provider_token` (persisting it opportunistically, so the system self-heals into the durable path) → `token_unavailable`. The plaintext token is passed only to `client.ts`; it is never returned from an exported function, never placed in a prop, never logged.
4. **Revoke** — `withGithubToken()` wraps every GitHub call; a `401` sets `revoked_at`. A revoked credential reads as absent, so we stop retrying a dead token.
5. **Reconnect** — `requiresGithubReconnect(kind)` drives a "Reconnect GitHub" action to `/login?next=…`. Re-authorizing captures a fresh token and clears `revoked_at`.

**Degradation:** if credential storage is unavailable (e.g. `SUPABASE_SERVICE_ROLE_KEY` unset), the app falls back to session tokens — i.e. exactly the previous behavior — rather than failing.

## Analysis Lifecycle & Snapshots

Implements [ADR-005](adr/ADR-005-immutable-analysis-snapshots.md).

### Why snapshots exist

A queued job used to mean "analyze whatever `repositories.included` says *when the worker runs*". Between enqueue and execution the student can change their selection and a re-import can rewrite repository metadata — so a job could analyze a different set than the one that was reviewed, and a historical assessment could never be explained against its actual inputs. That breaks CLAUDE.md §14.4 (versioned, auditable pipeline) and §15.2 (structural provenance). A job must be a complete, self-contained definition of work.

### Enqueue → snapshot

1. `startAnalysisAction` validates the session and loads the student's selected repository refs.
2. `resolveHeadCommitShas()` best-effort pins each repository's HEAD commit (bounded to 25 lookups). Total by design: GitHub unreachable / rate-limited / token revoked yields null SHAs rather than blocking the enqueue.
3. `enqueue_analysis_with_snapshot()` (SECURITY DEFINER) creates the `analyses` row **and** its `analysis_repositories` rows in one transaction. The snapshot is built from a query joined through `github_accounts` to `auth.uid()`, so repository ownership is validated in SQL by construction; a forged repository id in the SHA map is ignored rather than injected. An already-active job is reused instead of stacking duplicates.

### Snapshot guarantees

- Preserves `repository_id`, `github_repo_id`, `full_name`, `default_branch`, `is_private`, `primary_language`, `commit_sha`.
- **Immutable**: a `BEFORE UPDATE` trigger raises unconditionally, so not even the service-role pipeline can alter it. `DELETE` remains possible only so account deletion can cascade (PRD §12.5).
- `commit_sha` null means "analyze the latest commit at execution time"; non-null pins an exact commit.

### Worker contract

**The analysis worker MUST read `analysis_repositories` (via `listAnalysisSnapshot()`), never `repositories.included`.** The `/analysis` screen already renders the snapshot, so what a student sees is exactly what will run. Editing the selection afterwards affects only *future* runs.

### Job states

`queued → processing → completed | partial | failed`, with `started_at` and `completed_at` persisted at each transition so a stalled job is detectable (CLAUDE.md §19.6 — a job never sits in `processing` limbo silently).

An analysis spans **two stages**: evidence ingestion, then skill assessment. Ingestion never marks a job `completed` — it hands off in `processing`, and the assessment stage owns the terminal state along with the `summary`, `confidence`, `model`, `pipeline_version`, and `prompt_version` a completed analysis is required by CHECK constraint to carry.

| State | Meaning |
|---|---|
| `queued` | Enqueued with its snapshot; no work started. |
| `processing` | Claimed by a worker (`started_at` set), **or** ingested and awaiting assessment. |
| `completed` | Assessed end to end with nothing excluded. |
| `partial` | Assessed, but something was excluded — an unreadable repository, a rejected citation, a refused row. See `analysis_errors`. |
| `failed` | Ingestion produced no evidence, or assessment could not produce a claim we can stand behind. Ingested evidence is retained either way. |

`claim_next_queued_analysis()` performs the `queued → processing` transition atomically using `FOR UPDATE SKIP LOCKED`, so multiple workers never claim the same job.

## Evidence Pipeline

Implements [ADR-006](adr/ADR-006-evidence-normalization-and-idempotency.md). Module: `apps/web/src/features/evidence/`.

```
analysis job → analysis_repositories (immutable snapshot)
             → GitHub REST (bounded, rate-limit aware)
             → raw engineering signals
             → normalization (pure mappers)
             → evidence_items (idempotent upsert)
```

### Layering

| File | Responsibility |
|---|---|
| `client.ts` | The only module that speaks HTTP to GitHub for evidence; caps, rate-limit headroom, typed errors. |
| `mapper.ts` | Pure normalization: GitHub shape → `NormalizedEvidence` → row. |
| `service.ts` | Per-repository collection; runs each stage guarded so one failure doesn't lose the rest. |
| `queries.ts` | Service-role data access (the worker has no session). |
| `worker.ts` | Job lifecycle, per-repository isolation, terminal status. |
| `env.ts` | Worker trigger secret. |

### Normalization strategy

**No raw GitHub object is persisted or exposed.** Every signal becomes one `evidence_items` row with a uniform vocabulary: `source_type`, `github_id`, `title`, `occurred_at`, `author_login`, `external_url` (the raw_url), `payload`, `confidence`. `evidence_type` stays the coarse category; the new `source_type` enum names the specific signal (`repository`, `commit`, `pull_request`, `review`, `issue`, `release`, `contributor`).

Payloads keep only fields with engineering meaning; READMEs are stored as bounded excerpts, never mirrors (PRD §12.6). Two honesty rules: unfetched metrics are `null` (never `0`), and `payload.detailFetched` records whether the enrichment call happened — so "no additions" is distinguishable from "additions unknown".

`confidence` here is **ingestion fidelity** (1.0 = read directly from the API) and is deliberately distinct from the `confidence_level` enum, which is *assessment* confidence and the only confidence ever shown to a user.

### Idempotency strategy

Unique key `(repository_id, source_type, github_id)`, persisted with a single batched **upsert**. `github_id` is `text` so it holds a numeric GitHub id *or* a commit **SHA** — a commit's only stable identity. Running the same analysis twice refreshes evidence in place and can never duplicate it.

### Retry strategy

Because ingestion is idempotent, **retry is at the job level** — re-running a `partial`/`failed` analysis is always safe, with no partial write to reconcile. Failures are recorded per repository/stage in `analysis_errors` with a `retryable` flag (rate limit, network, reconnected credential → retryable; repository genuinely gone → not). A revoked token is raised once, marks the credential revoked, and skips the remaining repositories with an explicit reason instead of hammering GitHub. There is no automatic backoff scheduler yet; the trigger endpoint is invoked externally.

### Performance

Every list is capped and detail fan-out is bounded (20 commits, 10 PRs per repository), detail calls run concurrently via `Promise.allSettled`, and the client refuses to start a call once GitHub's reported remaining budget drops below a floor — leaving headroom for interactive imports rather than starving them.

### Security

All GitHub communication is server-side. The worker runs without a user session, so safety comes from *what it reads*: only rows reachable from an analysis snapshot, which was ownership-validated in SQL when created (ADR-005). **No repository identifier ever originates from a client.** The trigger endpoint is machine-to-machine (constant-time bearer comparison against `WORKER_TRIGGER_SECRET`) and is deliberately not callable by a signed-in student — a student can enqueue work, never drive the worker.

## Skill Assessment Engine

Implements [ADR-007](adr/ADR-007-evidence-grounded-skill-assessment.md). Module: `apps/web/src/features/analysis/`; Claude access via `apps/web/src/lib/ai/`.

```
evidence_items (stored, immutable in practice)
             → aggregation into 11 engineering dimensions (pure, PII-free)
             → Claude (structured outputs, adaptive thinking)
             → citation validation (application, then SQL)
             → skill_assessments + assessment_evidence (one transaction)
```

### Why the LLM never consumes GitHub directly

The model's entire input is the aggregator's structured summary. It never sees a GitHub API response, a database row, or the candidate's identity. Three reasons, in priority order:

1. **Explainability survives the source.** A repository can be renamed, made private, or deleted; a re-fetch would then produce a different answer or none at all. Stored evidence is stable and addressable by id, so a claim made today can be re-explained from its citations years from now. An assessment grounded in a live API call is only explainable for as long as that call keeps working.
2. **Reproducibility.** The same analysis re-run over the same evidence with the same `prompt_version` and `model` is reproducible. Re-fetching from a moving upstream is not.
3. **Trust boundary.** READMEs, commit messages, and issue titles are candidate-supplied and therefore untrusted (CLAUDE.md §18.4). They reach the model only after normalization, in a fixed shape we control — a prompt-injection attempt arrives as data to assess, not as an instruction to follow.

### Two vocabularies

**Dimensions** (`code_quality`, `collaboration`, `architecture`, `testing`, `delivery`, `ownership`, `documentation`, `debugging`, `performance`, `security`, `leadership`) group *evidence*. The fixed 12-entry **`skills` taxonomy** defines what may be *assessed* (PRD FR-5.1 — no free-form skills). Each taxonomy skill declares the dimensions that inform it.

Routing is structural where possible (a path like `src/foo.test.ts` is a fact about the change; a commit message is the author's description of it). Routing decides which evidence is read under which heading — never what the assessment says. **A skill with no evidence in any of its dimensions is not sent for assessment at all**, because asking a model to judge nothing is what produces invented findings.

### Anti-hallucination

Validated twice, and the database has the final say:

- `mapper.ts` checks every cited id against the set actually supplied and drops any assessment citing an invalid id **whole** — keeping its valid citations would persist a claim whose stated grounds are partly fiction. Rejections are recorded in `analysis_errors` as `unverifiable_citation`.
- `persist_skill_assessment(...)` re-derives the profile from the analysis, resolves the skill slug against the taxonomy, and refuses evidence ids that do not exist or belong to another profile. It writes the assessment and its `assessment_evidence` links in one transaction, so the database can never hold an orphaned claim (CLAUDE.md §15.2). Granted to `service_role` only.

### Confidence

The model reports confidence as a **0–1 number**, because a graded self-report calibrates better than asking it to pick a word. That number never leaves `mapper.ts`: it is banded into `confidence_level` (`high | moderate | preliminary`) and additionally **capped by citation count** — under 3 citations can only be `preliminary`, under 8 only `moderate`. Calibration is ours to enforce, not the model's to self-report. The analysis-level confidence is the weakest band present.

No numeric score is stored or rendered anywhere (PRD FR-5.2, Brand Guidelines §16.3).

### Failure behavior

A refusal, timeout, truncation, or schema violation marks the analysis `failed`, records a diagnostic, and **leaves ingested evidence untouched** — retry is cheap and never re-ingests. Assessments are append-only: a re-run appends a new version and sets `superseded_by` on the prior row.

### Provenance

Every run writes `model`, `pipeline_version` (`assessment-v1`), and `prompt_version` (`skill-assessment-v1`) to the `analyses` row its assessments reference, so any historical assessment can be reproduced (CLAUDE.md §14.4).

### Trigger

`POST /api/v1/analyses/assess` with the same machine-to-machine bearer secret as ingestion, deliberately separate from `/analyses/process`: ingestion is network-bound and cheap to retry, assessment is model-bound and costs real money. A transient GitHub failure must never re-run a paid assessment.

### Known gap

The golden-dataset eval suite (CLAUDE.md §17.9) does not exist yet. Prompt and model changes therefore ship without calibration, evidence-grounding, or fairness regression evidence. This is a release gate that is currently missing, not an optional extra.

## Async pipeline

Redis + BullMQ remain the job spine for AI analysis and other slow/expensive work (CLAUDE.md §14) — Supabase's role is persistence, auth, and storage, not job orchestration. Job processors read/write through the same `@supabase/supabase-js` clients as request handlers, using the service-role client only where a job genuinely needs to act outside any single user's session.

## Open / future sections

This document currently covers only the backend-platform decisions resolved by the audit. Sections to add as they're designed (each with its own ADR where CLAUDE.md §3/§24.2 requires one):

- Data model detail (entity relationships, RLS policy design per table)
- AI evaluation pipeline architecture (CLAUDE.md §17)
- Search/ranking implementation (FR-9)
- Notification delivery architecture (FR-14)
