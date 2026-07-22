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
