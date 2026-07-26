# Runs the long-lived analysis worker (ADR-009) as a standalone process.
# This is a thin deployment wrapper only — all lifecycle logic lives in
# apps/web/src/workers/analysis-worker.ts and apps/web/src/features/pipeline.
# Moving to a different host later means changing this file, never those.
FROM node:24-slim

WORKDIR /app

# npm workspaces needs every workspace's package.json present before `npm
# ci` can link them, even though only apps/web's code actually runs here.
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/config/package.json packages/config/package.json

RUN npm ci

COPY packages/config packages/config
COPY apps/web apps/web

WORKDIR /app/apps/web

# tsx runs the worker directly from TypeScript source — no build step,
# matching this repo's existing eval/eval:report scripts (also tsx-run).
CMD ["npm", "run", "worker"]
