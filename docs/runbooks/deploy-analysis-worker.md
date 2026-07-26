# Runbook: Deploy the Analysis Worker to Railway

Implements [ADR-009](../adr/ADR-009-analysis-pipeline-orchestration.md). The worker (`apps/web/src/workers/analysis-worker.ts`) is a long-lived Node process — it needs an always-on host, which Vercel (where the Next.js app lives) does not provide. This runbook deploys it to Railway as a separate service.

No Railway MCP connector was available in the session that built this pipeline, so this is a manual CLI runbook, not something run automatically. Every command below is safe to read before running.

## Prerequisites

- A Railway account with billing configured (the worker runs continuously, unlike a request-driven service).
- The `railway` CLI: `npm install -g @railway/cli` (or `brew install railway`).
- The same env values already in `apps/web/.env.local` for: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, and whatever `features/github/credentials.ts` needs to decrypt stored GitHub tokens (check `.env.example` for the exact key name — the worker needs the same decryption key the web app uses, since it reads the same `github_credentials` table).

## 1. Log in and link the project

```bash
railway login
```

From the repo root (where `Dockerfile` and `railway.json` live):

```bash
railway init
```

Choose "Empty Project" and name it something like `credence-ai-worker`. This creates a new Railway project — it does **not** touch your existing Vercel deployment or Supabase project.

## 2. Create the worker service

```bash
railway service create analysis-worker
```

Railway will build from the root `Dockerfile` (declared in `railway.json`) automatically on the next deploy — it runs `npm run worker` inside `apps/web`, which is `tsx` executing `src/workers/analysis-worker.ts` directly (no compiled build step, matching this repo's existing `eval`/`eval:report` scripts).

## 3. Set environment variables

```bash
railway variables --service analysis-worker --set "NEXT_PUBLIC_SUPABASE_URL=<value>"
railway variables --service analysis-worker --set "SUPABASE_SERVICE_ROLE_KEY=<value>"
railway variables --service analysis-worker --set "ANTHROPIC_API_KEY=<value>"
railway variables --service analysis-worker --set "GITHUB_TOKEN_ENCRYPTION_KEY=<value>"
```

(Confirm the exact env var name for the GitHub token encryption key against `apps/web/src/features/github/credentials.ts` / `.env.example` before setting it — copy it verbatim from `.env.local`, don't guess it.)

Optional tuning (both have defaults if omitted):

```bash
railway variables --service analysis-worker --set "WORKER_POLL_INTERVAL_MS=3000"
railway variables --service analysis-worker --set "WORKER_STALE_AFTER_MS=300000"
```

**Never** set `WORKER_TRIGGER_SECRET` here — the worker doesn't use it; that secret is only for the manual `/api/v1/analyses/run` HTTP escape hatch on the Vercel side.

## 4. Deploy

```bash
railway up --service analysis-worker
```

This builds the Dockerfile and starts the container. `railway.json`'s `restartPolicyType: ON_FAILURE` means Railway restarts it automatically if the process crashes — this is a health mechanism in itself, so no separate HTTP health check is configured (the worker exposes no HTTP port; it's not appropriate for one). Watch the boot log:

```bash
railway logs --service analysis-worker
```

You should see: `[worker <id>] started, polling every 3000ms`.

## 5. Verify it's actually claiming jobs

Two ways, from cheapest to most thorough:

**a. Watch the logs** while a student runs "Start Analysis" in the app (or use an existing queued row). You should see `[worker <id>] analysis <id> → completed` (or `partial`/`failed`) within a few seconds of it being enqueued.

**b. Check Supabase directly** (via the Supabase MCP tools or the dashboard):

```sql
select id, status, heartbeat_at, claimed_by, attempt_count
from analyses
order by created_at desc
limit 5;
```

`claimed_by` should show your Railway worker's id (`worker-<pid>-<random>`) once it picks up a run, and `status` should progress `queued → ingesting → assessing → finalizing → completed` without any manual HTTP call.

## 6. Decommission the manual trigger dependency

Once the worker is confirmed running continuously, `/api/v1/analyses/run` stops being anything other than a debug escape hatch — no cron, no script, nothing external needs to call it for normal operation. Nothing to delete (it's genuinely useful for manually kicking a specific job during an incident), but stop treating it as a required step in the deploy checklist.

## Rollback

```bash
railway down --service analysis-worker
```

Any run the worker was mid-processing when stopped keeps its heartbeat frozen — the next worker to start (redeploy, or a manual `POST /api/v1/analyses/run`) reclaims it automatically once `heartbeat_at` goes stale past the 5-minute default. Nothing needs manual cleanup in Postgres.
