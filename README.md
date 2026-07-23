# credence-ai
Trust Skills. Not Just Resumes.

## Repository structure

```
credence-ai/
├── apps/
│   └── web/              # Next.js application
├── packages/
│   ├── ui/               # Shared UI component library
│   ├── config/           # Shared configuration (lint, tsconfig, tailwind)
│   ├── types/            # Shared TypeScript types
│   └── ai/               # AI/evaluation layer (prompts, contracts)
├── supabase/
│   ├── migrations/       # Database migrations
│   ├── policies/         # Row-level security policies
│   ├── seed/             # Seed data
│   └── functions/        # Edge functions
├── docs/                 # Product and architecture documentation
├── assets/               # Static assets
├── scripts/              # Repository tooling and automation scripts
├── .github/              # Issue/PR templates and CI workflows
├── CLAUDE.md
├── README.md
└── LICENSE
```

- **apps/** — deployable applications; `apps/web` is the Next.js app.
- **packages/** — shared packages reused across apps: `ui`, `config`, `types`, and the `ai` evaluation layer.
- **supabase/** — database schema and backend: `migrations`, RLS `policies`, `seed` data, and edge `functions`.
- **docs/** — product and architecture documentation.
- **assets/** — static assets.
- **scripts/** — repository tooling and automation scripts.
- **.github/** — issue and pull-request templates and CI workflows.

## Environment strategy

Environment variables are split into four categories, reflected directly in
[`.env.example`](.env.example) and in the validation code
(`apps/web/src/config/env.ts`, `apps/web/src/lib/ai/env.ts`,
`apps/web/src/lib/github/env.ts`):

| Category | Validated | Where | Missing/invalid → |
|---|---|---|---|
| **Required for application startup** (Supabase, Database, Authentication, Public configuration) | Eagerly, at boot | `apps/web/src/config/env.ts`, imported by `src/instrumentation.ts` | The server fails to start, with a clear error naming every missing/invalid variable. |
| **Required only for AI services** | Lazily, on first use | `apps/web/src/lib/ai/env.ts` | The app boots fine; the specific AI call that needed `ANTHROPIC_API_KEY` throws when invoked. |
| **Required only for GitHub integration** | Lazily, on first use | `apps/web/src/lib/github/env.ts` | The app boots fine; GitHub sign-in or repository access throws when invoked. |
| **Optional** | Has a default | `apps/web/src/config/env.ts` | Never blocks anything (e.g. `NODE_ENV` defaults to `development`). |

**Why split it this way:** the application's core purpose — serving pages,
authenticating users, reading/writing data — must not depend on AI or
GitHub credentials being configured. A developer can run and deploy the
app with AI features or GitHub integration temporarily unavailable, and
only the code paths that actually need those credentials fail, with a
specific, actionable error naming the exact variable at the exact moment
it's needed — never a generic startup crash for a feature nobody is using
yet.

Every server-only environment-validation module imports the `server-only`
package guard, so none of it can be pulled into a client bundle.
