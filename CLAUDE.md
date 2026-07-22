# Credence AI — Engineering Handbook (CLAUDE.md)

**Document type:** Engineering Handbook & AI Development Guide
**Product:** Credence AI — Evidence-Based Talent Intelligence Platform
**Version:** 1.0 · July 2026
**Owner:** Principal Software Architect
**Companion documents:** [docs/01-product-definition-document.md](docs/01-product-definition-document.md) · [docs/02-brand-guidelines.md](docs/02-brand-guidelines.md)

This file permanently guides all development on Credence AI — human engineers and Claude Code alike. When a decision isn't covered here, derive it from §2 Engineering Philosophy; when two rules conflict, the earlier-numbered section wins. **Do not deviate from this handbook without updating it in the same pull request.**

---

## 1. Project Vision

Credence AI is the **trust layer for technical hiring**: it converts a student's real work — GitHub repositories, projects, AI interviews, portfolio, learning progress — into a verified, evidence-based credibility profile that recruiters can search and trust.

The engineering implication of that vision is singular: **our product is trustworthy judgment about people's careers.** A rendering bug is an inconvenience; an unexplainable score, a leaked profile, or a silently wrong assessment is an existential failure. Therefore this codebase prioritizes, in order:

1. **Correctness & explainability** — every assessment traceable to evidence
2. **Security & privacy** — we hold career-sensitive data under explicit consent
3. **Maintainability & readability** — a small team must move safely for years
4. **Accessibility** — fair evaluation includes accessible evaluation
5. **Performance** — fast enough to trust, never at the expense of 1–4
6. **Speed of delivery** — last, always

## 2. Engineering Philosophy

1. **Evidence over claims — in code too.** No score, badge, or label is ever computed without persisting the evidence references and reasoning that produced it. If the data model can represent a claim without its provenance, the data model is wrong.
2. **Boring technology, proven patterns.** We choose mature, well-documented tools with large communities. Novelty budget is spent on the evaluation and explainability layer — our differentiation — never on infrastructure.
3. **Explicit over implicit.** No magic. Configuration is declared, dependencies are visible, side effects are named. A new engineer should predict what code does from reading it once.
4. **Make illegal states unrepresentable.** Prefer types, schema constraints, and enums over runtime checks and comments. The compiler and the database are our first two reviewers.
5. **Small, reversible steps.** Short-lived branches, small PRs, feature flags for risky changes, migrations that can roll back. We optimize for the ability to undo.
6. **The reader outranks the writer.** Code is read 10× more than written. Clever one-liners, implicit context, and premature abstraction are debts charged to future readers.
7. **Fail loudly in development, gracefully in production.** Assertions and strict validation in dev; degraded-but-honest behavior in prod. Never fail silently anywhere.
8. **You build it, you run it.** Every feature ships with its logging, error handling, tests, and rollback story. "Done" includes operability (§26).

## 3. Technology Stack

The stack is deliberately narrow. Adding a new language, framework, database, or SaaS dependency requires an Architecture Decision Record (§24) approved by the architect.

| Layer | Choice | Rationale |
|---|---|---|
| Language | **TypeScript** (strict) everywhere | One language across web, API, and workers; types encode our domain |
| Web framework | **Next.js (App Router)** | Full-stack React, server components, mature ecosystem |
| UI | **React**, **Tailwind CSS**, **shadcn/ui** components restyled with our design tokens | Accessible primitives (Radix under shadcn), token-driven theming per Brand Guidelines |
| Database | **PostgreSQL** | Relational integrity for evidence↔claim provenance; battle-tested |
| ORM & migrations | **Prisma** | Typed data access, declarative migrations |
| Cache / queue | **Redis** + **BullMQ** | Async AI-analysis pipeline (repo analysis, interviews) must run outside the request cycle |
| Validation | **Zod** | Single schema source for runtime validation + inferred types at every boundary |
| Auth | **Auth.js (NextAuth)** with GitHub OAuth (students) + email magic-link (recruiters) | GitHub identity is core to the product |
| AI | **Anthropic Claude API** via official `@anthropic-ai/sdk` | See §17 |
| Testing | **Vitest** (unit/integration), **Testing Library** (components), **Playwright** (E2E) | See §22 |
| Package manager | **pnpm** with workspace support | Deterministic, fast, monorepo-ready |
| Lint/format | **ESLint** (typescript-eslint, jsx-a11y) + **Prettier** | Enforced in CI; no style debates in review |
| Observability | **Pino** structured logging + **Sentry** error tracking + **OpenTelemetry** tracing | See §20 |
| Hosting | Vercel (web) + managed Postgres/Redis; workers on a container runtime | Revisit at scale per §29 |

**Forbidden without an ADR:** additional databases, GraphQL, microservices, CSS-in-JS libraries, alternative state-management libraries, any unofficial AI SDK or LLM-wrapper framework.

## 4. Repository Structure

Single monorepo. Structure is **feature-first inside layer-second**: top-level folders define architectural layers; inside `features/`, code is grouped by domain, not by file type.

```
credence-ai/
├── CLAUDE.md                  # This handbook
├── docs/                      # Product & architecture docs (numbered, kebab-case)
├── prisma/                    # schema.prisma + migrations/
├── public/                    # Static assets
├── src/
│   ├── app/                   # Next.js App Router: routes, layouts, route handlers only
│   │   ├── (student)/         # Student-facing route group
│   │   ├── (recruiter)/       # Recruiter-facing route group
│   │   └── api/               # HTTP route handlers (thin — delegate to features)
│   ├── features/              # Domain modules — the heart of the codebase
│   │   ├── profile/           # Evidence ingestion & unified profile
│   │   ├── github-analysis/   # Repo intelligence pipeline
│   │   ├── interview/         # AI interview engine
│   │   ├── credibility/       # Skill graph, scoring, confidence, explanations
│   │   ├── search/            # Recruiter capability search
│   │   ├── consent/           # Visibility, sharing, audit
│   │   └── <feature>/
│   │       ├── components/    # Feature-private UI
│   │       ├── server/        # Server-only logic: services, queries, actions
│   │       ├── schemas.ts     # Zod schemas (single source of shape truth)
│   │       └── types.ts       # Types not derivable from schemas
│   ├── components/            # Shared, feature-agnostic UI (design system)
│   │   └── ui/                # shadcn/ui primitives (restyled, never forked per-feature)
│   ├── lib/                   # Shared, feature-agnostic utilities
│   │   ├── ai/                # Claude client, prompts, evaluation contracts (§17)
│   │   ├── db.ts              # Prisma client singleton
│   │   ├── auth.ts            # Auth.js configuration
│   │   └── logger.ts          # Pino logger factory
│   ├── workers/               # BullMQ processors (analysis, interviews, notifications)
│   ├── styles/                # globals.css + design tokens (§12)
│   └── config/                # Typed, Zod-validated environment & app config
├── tests/                     # E2E (Playwright) + cross-feature integration tests
└── .github/workflows/         # CI pipelines
```

**Rules:**
- `features/*` may import from `lib/` and `components/`; **never from another feature's internals.** Cross-feature needs go through a feature's exported public interface (its `index.ts`).
- `app/` contains routing and composition only — no business logic. If a route handler exceeds ~30 lines, the logic belongs in `features/*/server/`.
- Server-only modules import `server-only`; anything touching secrets or the DB must never be importable by client components.

## 5. Naming Conventions

| Item | Convention | Example |
|---|---|---|
| Directories & non-component files | `kebab-case` | `github-analysis/`, `evidence-linker.ts` |
| React components (file + export) | `PascalCase` | `EvidenceCard.tsx` → `EvidenceCard` |
| Variables, functions | `camelCase`, verb-first for functions | `computeConfidenceLevel()` |
| Types, interfaces, enums | `PascalCase`, no `I`/`T` prefixes | `CredibilityReport`, `ConfidenceLevel` |
| Constants | `SCREAMING_SNAKE_CASE` only for true module-level constants | `MAX_REPOS_PER_ANALYSIS` |
| Zod schemas | `PascalCase` + `Schema` suffix | `InterviewTranscriptSchema` |
| Database tables | `snake_case`, plural | `evidence_items`, `skill_assessments` |
| Database columns | `snake_case` | `confidence_level`, `created_at` |
| API routes | `kebab-case`, plural resources | `/api/v1/candidates/{id}/skill-assessments` |
| Env variables | `SCREAMING_SNAKE_CASE`, grouped by prefix | `ANTHROPIC_API_KEY`, `DATABASE_URL` |
| Branches | `type/short-description` | `feat/interview-transcript-view` |
| Feature flags | `ff_` prefix, snake_case | `ff_recruiter_search_v2` |

**Domain vocabulary is fixed** and mirrors the PDD — use these words exactly, in code and schema: `evidence`, `claim`, `assessment`, `confidence` (`high | moderate | preliminary`), `skill`, `readiness`, `integrity_flag`, `consent`. Never introduce synonyms (`score` vs `rating` vs `grade` chaos is forbidden — the word is `assessment`; a numeric value inside one is a `signal`). Per Brand Guidelines: no variable, table, comment, or log message may refer to candidates as `leads`, `inventory`, or `pipeline`.

## 6. Coding Standards

1. **Functions do one thing.** Target ≤ 40 lines; extract when a function needs a comment to separate its phases.
2. **No dead code, no commented-out code.** Git remembers; the codebase doesn't.
3. **Early returns over nesting.** Maximum ~3 levels of indentation in a function body.
4. **Immutability by default.** `const` everywhere; treat arrays/objects as immutable; use spread/`toSorted`-style non-mutating operations.
5. **Comments explain *why*, never *what*.** A comment states a constraint the code cannot express (an external quirk, a regulatory requirement, a deliberate trade-off). Delete narrating comments.
6. **No magic values.** Named constants with units in the name where relevant (`ANALYSIS_TIMEOUT_MS`).
7. **Boundaries validate; interiors trust.** Zod-validate all external input (HTTP, webhooks, queue payloads, LLM output, env vars) once at the boundary. Internal functions accept typed values and do not re-validate.
8. **Dependency direction:** UI → feature server logic → lib → nothing. Never upward, never sideways between features.
9. **All async code handles failure.** No floating promises (`no-floating-promises` is a build error). Every `await` sits in a context that defines what failure means (§19).
10. **Feature flags for anything risky**, removed within two release cycles of full rollout — a flag past that age is technical debt (§27).

## 7. TypeScript Standards

1. **`strict: true` is non-negotiable**, plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`. The config only ratchets stricter.
2. **`any` is forbidden.** Use `unknown` + narrowing. An `as` cast requires a comment stating why it's safe; `@ts-expect-error` (never `@ts-ignore`) requires a linked issue.
3. **Derive types from Zod schemas** (`z.infer<typeof XSchema>`) so runtime and compile-time shapes can never diverge. Hand-written types are for internals with no runtime boundary.
4. **Discriminated unions for state.** Model `loading | error | success`, `ConfidenceLevel`, `IntegrityFlag` variants as tagged unions and switch exhaustively (with `satisfies never` default arms). No boolean-flag soup (`isLoading && !isError && data`).
5. **Branded types for identifiers.** `CandidateId`, `RecruiterId`, `EvidenceId` are branded strings — passing a recruiter ID where a candidate ID belongs must be a compile error. This is a privacy control, not a style preference.
6. **`readonly` on all data-shaped types.** Mutation is an explicit, local decision.
7. **No enums** (TypeScript `enum`); use `as const` object maps + union types — they serialize predictably and align with Zod.
8. **Errors are typed.** Domain operations that can fail expectedly return a `Result`-style discriminated union or throw one of our named error classes (§19) — never bare `Error` with a string.
9. **Public exports are explicitly typed.** No inferred return types on exported functions of feature public interfaces.

## 8. React Standards

1. **Server Components by default.** `"use client"` only when the component needs interactivity, browser APIs, or hooks — and as deep in the tree as possible.
2. **Components are presentational; logic lives in the feature's server layer or custom hooks.** A component over ~150 lines or with more than ~3 `useState` calls needs decomposition.
3. **Derive, don't sync.** No `useEffect` to mirror props into state or compute derivable values. `useEffect` is exclusively for synchronizing with external systems, and each one gets a comment naming that system.
4. **Props are explicit and typed** — no spreading unknown props into DOM elements; no boolean traps (`<Card compact primary flat/>` → use a `variant` prop).
5. **State ownership:** server state belongs to the server (Server Components / route loaders); ephemeral UI state stays in the component; genuinely shared client state uses React context scoped to the feature. No global state library without an ADR.
6. **Keys are stable domain IDs**, never array indexes for dynamic lists.
7. **Every data-bearing component ships all four states designed:** loading, empty, error, and success — including the low-confidence variant where assessments are involved (Brand Guidelines §11). Empty and error states are product surfaces, not afterthoughts.
8. **Accessibility is part of the component contract** — see §13; a component that fails it doesn't merge.

## 9. Next.js Standards

1. **App Router only.** Route groups `(student)` and `(recruiter)` separate the two audiences; shared layouts enforce the shared design system (Brand Guidelines: one fair system, two views).
2. **Data fetching happens on the server** — Server Components or route handlers. Client components receive data as props; no client-side fetching of protected data except through our typed API layer.
3. **Route handlers are thin controllers:** parse → validate (Zod) → authorize → call feature service → map result to response. Nothing else.
4. **Server Actions** are allowed for form mutations, but each action authorizes independently (never trust that the UI gated access) and validates its input with the same Zod schemas as the equivalent API route.
5. **Caching is explicit.** Every `fetch`/query declares its caching intent. **Assessment, consent, and search results are never cached across users.** Personalized pages are dynamic by default; only public marketing surfaces are static.
6. **Secrets never reach the client.** Only `NEXT_PUBLIC_`-prefixed variables may be read in client code, and nothing sensitive ever gets that prefix. Config is loaded through the Zod-validated `src/config/` module — never `process.env` scattered through the code.
7. **Middleware handles cross-cutting concerns only** (auth session check, request ID injection) — no business logic.
8. **Metadata & SEO:** public pages define metadata via the Metadata API; candidate profile pages are `noindex` unless the student has explicitly opted into public visibility.

## 10. UI Architecture

Three layers, strict direction:

1. **Primitives** (`src/components/ui/`) — shadcn/ui components restyled with design tokens. Owned by the design system; features never modify them.
2. **Shared patterns** (`src/components/`) — composed, feature-agnostic patterns, including the platform-defining components (§11): `EvidenceCard`, `ConfidenceIndicator`, `AiContentMarker`, `ConsentSurface`.
3. **Feature UI** (`src/features/*/components/`) — compositions of layers 1–2 plus feature-specific presentation.

**Rules:**
- Styling is Tailwind utilities referencing **tokens only** (§12) — no arbitrary values (`w-[347px]`) without a comment justifying them; zero inline styles; zero CSS-in-JS.
- Layout follows the Brand Guidelines: reading order = reasoning order (context → evidence → interpretation → confidence → action); one primary action per view; wide content scrolls in its own container.
- Both light and dark themes are first-class; every component is verified in both before merge.
- Student and recruiter surfaces share the same primitives and patterns. Divergence in *content* is expected; divergence in *component quality* is a bug.

## 11. Component Design Principles

1. **Components encode policy.** Our governance rules are enforced by component APIs, not by reviewer vigilance:
   - **`EvidenceCard`** requires `claim`, `evidenceRefs` (non-empty), and `confidence` as mandatory props — it is *impossible* to render a claim without its evidence and confidence. There is no escape-hatch prop.
   - **`ConfidenceIndicator`** is the only way confidence is displayed; it cannot be restyled per callsite.
   - **`AiContentMarker`** wraps all AI-generated content; AI text never renders outside it.
   - **`ConsentSurface`** is the single pattern for all visibility/sharing controls.
2. **Composition over configuration.** Prefer `children`/slots over prop explosions. A component crossing ~8 props is a smell; extract or compose.
3. **Variants over forks.** New visual need → add a variant to the shared component (with design approval), never copy-paste a diverging twin.
4. **Boring by default.** Buttons, forms, tables, and navigation follow platform conventions. Originality is spent exclusively on the evidence/explainability layer.
5. **Every component ships with:** typed props, all interaction/data states, keyboard support, both themes, and a Testing Library test for its policy-critical behavior.
6. **Storybook-style isolation** (or equivalent) for shared components so designers can review states without running the app.

## 12. Design Token Rules

Tokens are the single source of visual truth, defined once in `src/styles/` as CSS custom properties and mapped into the Tailwind theme. **Raw values (hex, px, font names) appear only in the token definition files — nowhere else.**

1. **Semantic tokens over primitive tokens in application code.** Components reference `--color-strength`, `--color-growth`, `--color-alert`, `--color-ai`, `--color-surface`, `--color-text-*` — never `--blue-600` directly.
2. **Semantic colors are reserved** (Brand Guidelines §7), and the token layer enforces it:
   - `strength` (green family) — verified evidence and strong signals only
   - `growth` (amber family) — gaps and opportunities only; **never used for warnings**
   - `alert` (red family) — destructive actions, errors, integrity flags only; **never for any assessment of a person**
   - `ai` (violet family) — AI-generated-content markers and confidence indicators only
   - Data-viz palette tokens are separate and used only in charts; skill scales use the neutral→primary sequential ramp, never red→green.
3. **Both themes are defined at the token layer.** Components are theme-ignorant; they consume tokens that resolve per theme. Per-component dark-mode overrides are forbidden.
4. **Spacing, radii, type scale** come from the fixed token scales (one spacing scale, ~6 type sizes, fixed radii). New values require design-system approval, not a local override.
5. **Typography tokens enforce the mono/sans boundary:** the `font-evidence` (monospace) token is applied exclusively to raw evidence content — code, commit refs, transcript quotes. Interpretation uses `font-sans`. Lint/review treats a violation of this boundary as a correctness bug, because it *is* the explainability boundary.
6. Token changes are design-system PRs with screenshots of both themes, reviewed by design, and never bundled into feature PRs.

## 13. Accessibility Rules

**WCAG 2.2 AA is a merge gate for every user-facing change. AAA is the target for assessment-result and consent screens.** This is a founding-premise obligation (Brand Guidelines §13), enforced as follows:

1. **Automated:** `eslint-plugin-jsx-a11y` at error level; axe-core checks run in component tests and Playwright E2E for key flows. CI fails on violations.
2. **Semantics first.** Native elements before ARIA (`<button>`, not `<div onClick>`). ARIA only to fill genuine gaps, and correctly.
3. **Keyboard:** every interactive element reachable and operable by keyboard; visible focus states (primary-color ring) never suppressed; focus managed on route changes, dialogs, and dynamic content.
4. **The evidence trail is accessible non-visually:** claim, evidence link, and confidence are announced together, in reasoning order — structure the DOM so screen readers get the explainability promise, not a soup of fragments.
5. **Color is never the sole meaning-carrier.** Every semantic color pairs with a label or icon; charts ship patterned/labeled alternatives or data tables.
6. **Motion respects `prefers-reduced-motion`** with full functional equivalence; no flashing content ever.
7. **Forms:** every input labeled; errors described in text, associated via `aria-describedby`, and announced; touch targets ≥ 44px.
8. **Timed experiences (AI interviews) provide accommodations:** pause, extension, and a declared accessibility-needs pathway. This is product-critical: assessing fairly includes assessing accessibly.
9. **Manual audit** (keyboard-only + screen-reader pass) required for any new screen in the assessment, interview, or consent flows before release.

## 14. Backend Architecture

**Pattern: modular monolith with an async job spine.** One deployable Next.js app for synchronous work; BullMQ workers for everything slow, expensive, or AI-bound. No microservices until §29 criteria are met.

1. **Layering inside each feature module:**
   - `server/service.ts` — use-case orchestration (the only layer route handlers call)
   - `server/queries.ts` — data access (the only layer touching Prisma)
   - `server/jobs.ts` — queue producers/consumers for this feature
   - Services never touch Prisma directly; queries never contain business rules.
2. **All AI work is asynchronous.** Repo analysis, interview evaluation, and report generation run as queued jobs with staged, honest progress reporting persisted so the UI can show "Analyzing repository 3 of 7" (Brand Guidelines: progress honesty). Request handlers never call the LLM inline except for genuinely interactive interview turns, which stream.
3. **Jobs are idempotent and resumable.** Every job has a deterministic idempotency key; re-running a completed job is a no-op. Retries with exponential backoff; poison messages go to a dead-letter queue with alerting.
4. **The evaluation pipeline is a versioned, auditable pipeline:** ingest → normalize → analyze → assess → explain. Each stage persists its output; every assessment stores the `pipeline_version` and `model_id` that produced it, so any historical assessment can be explained and reproduced.
5. **Transactions around invariants.** A claim and its evidence links are written in one transaction — the database never holds an orphaned claim (§15).
6. **Domain events, minimally.** State changes that other features care about (`assessment.completed`, `consent.revoked`) are emitted as events through the queue — not via direct cross-feature service calls.
7. **`consent.revoked` is the highest-priority event in the system:** downstream visibility must be removed synchronously with the revocation, not eventually.

## 15. Database Standards

1. **Schema is the last line of defense.** `NOT NULL` by default, foreign keys always, `CHECK` constraints for domain invariants (e.g., `confidence_level IN ('high','moderate','preliminary')`), unique constraints for real-world uniqueness. If the application is the only thing preventing bad data, the schema is incomplete.
2. **Provenance is structural.** `skill_assessments` cannot exist without rows in `assessment_evidence` linking to `evidence_items` — enforced by writing them in one transaction and verified by an integrity check job. Every assessment row carries `pipeline_version`, `model_id`, `reasoning` (the plain-language explanation), and `confidence_level`. **A bare number in the database is a schema-review rejection.**
3. **Append-only for anything auditable.** Assessments, consent changes, profile views, and integrity flags are never `UPDATE`d in place — new versions are appended with `superseded_by` links. Consent and access history is an immutable audit log (§18).
4. **Soft delete for user content, hard delete for the user.** Profile artifacts soft-delete (`deleted_at`); a verified account-deletion request hard-deletes personal data per our privacy commitments, via a tested, scripted process — not ad-hoc SQL.
5. **Migrations:** every schema change is a Prisma migration in the same PR as the code; migrations are backward-compatible with the currently deployed code (expand → migrate → contract for renames/drops); destructive migrations require an explicit second review and a rollback note.
6. **Naming:** `snake_case`, plural tables, `id` (UUIDv7) primary keys, `created_at`/`updated_at` on every table, foreign keys as `<singular>_id`.
7. **Indexes are added with the query that needs them**, with the query plan noted in the PR. Recruiter search access paths are index-designed up front, not patched later.
8. **No raw SQL in features.** Prisma everywhere; genuinely necessary raw queries live in `queries.ts` behind a typed function with a comment justifying them.
9. **Data classification lives in the schema docs:** every table is marked `public | internal | sensitive | regulated`; `sensitive`+ tables (interview transcripts, assessments, consent records) get field-level access review before any new read path ships.

## 16. API Standards

1. **REST-shaped JSON over HTTP**, versioned under `/api/v1/`. Resources are nouns, plural, kebab-case; verbs come from HTTP methods. Breaking changes require `/v2`, deprecation headers, and a migration window — never silent mutation of a live contract.
2. **Every route handler follows the same skeleton:** authenticate → authorize (resource-level, §18) → validate with Zod → delegate to service → map to response. Any deviation is a review rejection.
3. **Response envelope is consistent:**
   - Success: the resource or collection, with `meta` for pagination (`cursor`-based, never offset for user-facing lists).
   - Error: `{ error: { code, message, details?, requestId } }` — `code` is a stable machine-readable string from our error catalog (§19); `message` is safe for display and follows the brand voice (calm, accountable, actionable); internals are never leaked.
4. **Assessment payloads carry their explainability by contract.** Any API response containing an assessment includes `evidenceRefs`, `confidence`, and `reasoning`. An endpoint that returns a bare score fails API review — the explainability promise is part of the wire format.
5. **Consent is enforced at the API layer, not the UI.** Every recruiter-facing read of candidate data passes through the consent check in the service layer; there is exactly one implementation of that check (`features/consent`), and it is deny-by-default.
6. **Idempotency:** all mutating endpoints that clients may retry accept an `Idempotency-Key` header; webhook receivers deduplicate by event ID.
7. **Rate limiting** on all public endpoints, stricter on auth and search; 429s include `Retry-After`.
8. **Contracts are typed end-to-end:** the Zod schema that validates a request also generates the client-side type. There is no drift because there is one definition.
9. Timestamps are ISO 8601 UTC; IDs are opaque strings; enums use our fixed domain vocabulary (§5).

## 17. AI Integration Standards

AI produces our core product — assessments of people — so this section is the strictest in the handbook.

### 17.1 Access & structure
1. **All Claude calls go through `src/lib/ai/`** — one typed client module wrapping the official `@anthropic-ai/sdk`. Features never import the SDK directly, never construct prompts inline, never call any other LLM provider.
2. **Model IDs live in config, not code.** Defaults: `claude-opus-4-8` for evaluation-quality tasks (repo analysis, interview conduct & evaluation, report generation); `claude-haiku-4-5` permitted only for low-stakes utility tasks (classification, formatting) with a comment justifying the downgrade. Model choice per task is a config value so upgrades are one change plus an eval run — never a grep-and-replace.
3. **Follow current API idioms:** adaptive thinking (`thinking: {type: "adaptive"}`) for evaluation tasks; `output_config.effort` tuned per task; streaming for any long-output call; no `temperature`/`top_p`/`budget_tokens` (removed on current models). When in doubt, consult the Claude API docs — not memory of older API shapes.

### 17.2 Reliability & structure of outputs
4. **All evaluation outputs are structured.** Every assessment-producing call uses structured outputs (`output_config.format` with a Zod-derived JSON schema) and is validated with the same Zod schema on receipt. Free-text LLM output is never parsed with regex or trusted structurally.
5. **The output contract mirrors the product contract:** every assessment object the model returns must include the finding, the evidence references (IDs of inputs we supplied — the model cites *our* evidence, it does not invent sources), the reasoning, and a confidence level. A response missing any of these fails validation and the job retries or flags — it is never persisted partially.
6. **Handle every stop reason.** `max_tokens`, `refusal`, and error responses are explicit branches with defined product behavior — never assumed away. Failed analyses surface to the user honestly ("We couldn't finish analyzing this repository…"), per brand voice.
7. **Prompt caching by design:** stable system prompts and evaluation rubrics first, volatile candidate content after the cache breakpoint; no timestamps or request IDs in the cached prefix.

### 17.3 Governance
8. **Prompts are versioned artifacts.** Every prompt lives in `src/lib/ai/prompts/` with a version; every persisted assessment records `prompt_version` + `model_id` + `pipeline_version`. Prompt changes are PRs with eval results attached (§17.9) — a prompt edit is a model change, reviewed like one.
9. **Evaluation quality has a regression suite.** A golden dataset of anonymized inputs with expected assessment properties runs against any prompt/model/pipeline change. A change that degrades calibration, evidence-grounding, or fairness metrics does not ship, whatever else it improves.
10. **Fairness constraints are explicit:** prompts instruct assessment of evidence and skills only; candidate name, institution, gender signals, and photos are **excluded from evaluation inputs** at the pipeline level — the model cannot be biased by data it never receives. Language rules from the Brand Guidelines (§16) are encoded in prompts: observations about evidence, never verdicts about character.
11. **Candidate data sent to the API is minimized** to what the task needs, and interview/assessment flows are documented in the privacy policy. No candidate data in prompts logged at info level (§20).
12. **AI content is born labeled** end-to-end: every AI-generated string is stored with an `ai_generated` marker and rendered inside `AiContentMarker` — the pipeline, schema, and UI agree.
13. **Cost is observed per task type:** token usage from `response.usage` is recorded per job with task labels; budgets alert before they surprise us.
14. **Anti-gaming is adversarially tested:** the integrity layer (tutorial-clone detection, interview cross-validation against the candidate's own code) has its own test suite of known gaming attempts, extended whenever a new technique is found in the wild.

## 18. Security Guidelines

1. **Threat model honestly:** we hold career-defining assessments, private repos' metadata, interview recordings/transcripts, and consent records for two user classes with asymmetric power. Attackers include scrapers, candidate impersonators, gaming attempts, and over-curious recruiters.
2. **AuthN/AuthZ:**
   - Sessions via Auth.js, secure/httpOnly/sameSite cookies; OAuth tokens (GitHub) encrypted at rest, minimal scopes, refreshed properly, revocable.
   - **Authorization is resource-level and deny-by-default**, checked in the service layer on every access (no "the UI hides it" security). Recruiter access to any candidate artifact flows through the single consent check (§16.5).
   - Roles (`student`, `recruiter`, `admin`) are coarse gates only; real access control is consent + ownership.
3. **Input handling:** Zod at every boundary (§6.7) including webhooks and queue payloads; parameterized queries only (Prisma); strict content-security policy; all user-supplied content (README excerpts, portfolio text) rendered as text or sanitized — never `dangerouslySetInnerHTML` with user content.
4. **LLM-specific security:** candidate-supplied content entering prompts (READMEs, code, portfolio text) is **untrusted input** — prompts are structured so instructions and data are separated, and model outputs never trigger privileged actions without validation. Prompt-injection attempts are an expected gaming vector and are integrity-flagged, not just ignored.
5. **Secrets:** never in code, logs, or client bundles; environment-injected, rotated on any suspicion, distinct per environment. CI includes secret scanning.
6. **Data protection:** TLS everywhere; encryption at rest for the database and object storage; interview media in private buckets with short-lived signed URLs; PII fields inventoried (§15.9).
7. **Audit trail:** every access to `sensitive`+ data by another user (recruiter views candidate) writes an immutable audit record — this is also a product feature ("who viewed my profile").
8. **Dependency hygiene:** lockfile committed; automated vulnerability scanning in CI; dependency updates reviewed weekly; no dependency added for what 20 lines of our own code can do.
9. **Headers & platform:** HSTS, X-Content-Type-Options, frame-ancestors none (except intended embeds), strict CORS allowlist.
10. **Incident readiness:** a written runbook (detect → contain → assess → notify → postmortem); user-facing breach communication follows brand voice — maximum clarity, zero spin.

## 19. Error Handling Strategy

1. **Two categories, two treatments:**
   - **Expected domain failures** (repo inaccessible, consent denied, analysis incomplete) are modeled values — typed results the caller must handle, with defined UX for each.
   - **Unexpected failures** (bugs, infra) throw, are caught at layer boundaries, logged with full context, reported to Sentry, and surfaced as a generic safe error.
2. **A single error catalog** (`src/lib/errors.ts`) defines named error classes with stable `code`s (`CONSENT_DENIED`, `ANALYSIS_SOURCE_UNAVAILABLE`, `INTEGRITY_CHECK_FAILED`, …). All thrown/returned errors are catalog errors; the catalog is the contract shared by API responses, logs, and UI copy.
3. **Errors are handled at the right altitude:** low-level code adds context and rethrows; only boundary layers (route handlers, job processors, top-level UI error boundaries) decide presentation. No `catch` that swallows; no `catch (e) { console.log(e) }` anywhere.
4. **User-facing errors follow the brand voice:** calm, accountable, actionable — say what happened, the most likely cause, and the next step. Never blame the user; never leak internals; never fake success.
5. **Partial failure is honest failure:** if 4 of 5 repos analyzed, the product says exactly that and proceeds with what it has — degraded results are labeled, never silently presented as complete.
6. **Async jobs:** every processor has a top-level handler that classifies the failure (retryable vs. terminal), updates the job's user-visible status, and never leaves a job in `processing` limbo. Terminal failures produce a user-facing state, not a vanished spinner.
7. **React error boundaries** wrap each major surface (report, search, interview) so one failed panel never blanks a page; each boundary renders the designed error state.
8. **Every error path is tested** — expected failures get unit tests; boundary behavior gets integration tests. An unhandled rejection in CI logs fails the build.

## 20. Logging Strategy

1. **Structured JSON logs (Pino) only** — no `console.log` in committed code (lint-enforced). Every log line: `timestamp`, `level`, `msg`, `requestId`/`jobId`, `feature`, and typed context fields.
2. **Correlation everywhere:** a request ID is minted at the edge, propagated through services, queue jobs, and AI calls, and returned to clients in error envelopes — one ID reconstructs a full story.
3. **Levels have meanings:** `fatal` (process dying) · `error` (failed operation needing attention — every `error` is actionable or it's mislabeled) · `warn` (degraded/suspicious, incl. integrity flags) · `info` (business events: analysis completed, consent changed, contact requested) · `debug` (dev diagnosis; off in prod by default).
4. **Privacy in logs is a hard rule:** no secrets, no tokens, no assessment contents, no interview text, no candidate PII beyond opaque IDs. LLM prompt/response bodies are never logged in production; metadata (model, tokens, latency, prompt_version, stop_reason) always is. Log fields are allowlisted per event type — new fields are reviewed, not sprayed.
5. **Audit logs are separate from operational logs** (§18.7): append-only, longer retention, access-controlled — never mixed into the app log stream.
6. **The AI pipeline is observable end-to-end:** each stage logs start/finish/duration/outcome with the pipeline version, so any assessment's production can be traced without reading its content.
7. **Metrics & tracing:** OpenTelemetry traces on requests and jobs; dashboards for the golden signals plus product-critical ones — analysis pipeline duration/failure rate, interview completion, token spend per task, consent-check denials.
8. **Alerts page on user impact** (error-rate spikes, dead-letter growth, pipeline stalls), not on noise. Every alert links to a runbook entry.

## 21. Performance Requirements

Budgets are enforced, not aspired to. A change that busts a budget needs either optimization or an explicit, documented exception.

| Surface | Budget |
|---|---|
| Recruiter search results | p95 < 500 ms server time |
| Credibility report render | p95 < 1.5 s to meaningful content (LCP) |
| Interactive interview turn (first streamed token) | p95 < 2.5 s |
| API mutations | p95 < 400 ms (excluding queued work) |
| Full repo analysis job | Minutes, but with staged progress updates at least every 15 s of wall time |
| Frontend | Core Web Vitals "good"; JS per route < 250 KB gzipped; route-level code splitting |

1. **Slow work never blocks a request** — it's queued, with honest progress (§14.2).
2. **Measure before optimizing:** performance PRs include before/after numbers; no speculative micro-optimization at readability's expense.
3. **Database performance is design-time work:** query plans reviewed for new access paths; N+1 queries are review rejections; pagination is mandatory on all list endpoints.
4. **AI latency is managed structurally:** caching of stable prompt prefixes, streaming for interactive turns, parallel analysis of independent repos, and precomputation (reports are generated when evidence changes, not when the recruiter clicks).
5. **Perceived performance follows brand rules:** skeletons and staged progress with truthful labels — never fake progress bars, never indeterminate spinners where stages are known.
6. Load-test recruiter search and the analysis pipeline before each major release; Lighthouse CI guards web vitals on key pages.

## 22. Testing Strategy

**Philosophy: test behavior at the highest level that runs fast; reserve E2E for the flows that define the company.** Coverage is a byproduct — the target is *confidence per critical path*, and the critical paths are: evidence→assessment integrity, consent enforcement, interview flow, and recruiter search.

1. **Unit tests (Vitest)** for pure domain logic: confidence computation, evidence linking, integrity heuristics, schema validation. Fast, deterministic, no I/O.
2. **Integration tests (Vitest + test Postgres)** for feature services: real database (per-test transactional isolation), real Zod boundaries, queue and LLM faked at the client seam. **Every service-level consent check has an explicit denial test.**
3. **Component tests (Testing Library)** for policy-critical components: `EvidenceCard` refuses to render without evidence; `ConfidenceIndicator` states; all four data states; axe assertions included.
4. **E2E (Playwright)** for the golden paths only: student onboarding → report; interview completion; recruiter search → profile → contact request (consent-gated); consent revocation propagates. Run on every merge to main against a production-like environment.
5. **AI evaluation tests are first-class (§17.9):** the golden-dataset eval suite runs on any prompt/model/pipeline change and nightly; it asserts structural validity, evidence-grounding (no invented sources), calibration bounds, and fairness metrics. These are release gates, not dashboards.
6. **LLM calls are never made in unit/integration/component tests** — the AI client interface has a deterministic fake with recorded realistic fixtures. Only the eval suite and a small smoke test hit the real API, in a dedicated workspace.
7. **Contract discipline over mocks:** fake at architectural seams (AI client, GitHub client, queue) only; never mock internal functions of the module under test.
8. **Test data:** builders/factories with realistic anonymized shapes; no production data in tests, ever.
9. **Regression rule:** every fixed bug gets a test that fails on the old code, in the fixing PR.
10. **CI order:** lint + typecheck → unit → integration → component/a11y → E2E → (on AI-touching changes) eval suite. A red pipeline blocks merge with no override culture.

## 23. Git Workflow

1. **Trunk-based, short-lived branches** off `main`; branches live days, not weeks. `main` is always deployable.
2. **Branch names:** `feat/…`, `fix/…`, `refactor/…`, `docs/…`, `chore/…` (kebab-case description).
3. **Conventional Commits** (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`), imperative mood, body explains *why* when non-obvious. Commits are logical units — no `wip` merged to main.
4. **PRs are small** (target < 400 changed lines; split otherwise) and complete: code + tests + migrations + docs updates travel together.
5. **PR description states:** what changed, why, how it was tested, screenshots for UI (both themes), and rollback plan for risky changes. Migrations and prompt changes are called out explicitly.
6. **Review:** at least one approval; two for security-sensitive, consent-related, schema-destructive, or prompt/eval changes. Author merges after green CI; squash-merge with a clean conventional title.
7. **Never rewrite public history**; `main` is protected; force-push only to own feature branches.
8. **Releases** are tagged from main with generated changelogs; deploys are automated from tags; hotfixes follow the same PR flow, expedited — never patched directly on infrastructure.
9. **Incomplete features hide behind flags,** not long-lived branches. Merge early, release deliberately.

## 24. Documentation Standards

1. **Docs live with the code** in `docs/`, numbered and kebab-case (`01-product-definition-document.md`, `02-brand-guidelines.md`, …). The repo is the single source of truth — no drifting wikis.
2. **Architecture Decision Records** in `docs/adr/NNNN-title.md` (context → options → decision → consequences). Required for: new dependencies/services, schema-architecture changes, AI-pipeline design changes, anything §3 marks forbidden-without-ADR. ADRs are immutable; superseding ADRs link back.
3. **Each feature module has a `README.md`** (10–30 lines): purpose, public interface, key invariants, links to relevant ADRs. Updated in the PR that changes the behavior it describes.
4. **The AI layer is documented to audit standard:** every prompt file carries a header (purpose, version, inputs, output schema, eval results reference); the pipeline has an end-to-end data-flow document; this is what makes "explain any assessment" possible retroactively.
5. **Runbooks** in `docs/runbooks/` for every alert and operational procedure (deploy, rollback, queue drain, incident response, data-deletion request).
6. **Code comments:** *why*, not *what* (§6.5); every exported function of a feature's public interface gets a doc comment stating purpose and failure modes.
7. **Stale documentation is a bug.** If a PR makes a doc wrong, fixing the doc is in scope for that PR — reviewers check.
8. **Writing style follows the brand:** plain before clever, specific before general, honest about limits.

## 25. Code Review Checklist

Reviewers verify, in order:

**Correctness & safety**
- [ ] Does the change do what the PR claims? Are edge cases and failure paths handled (§19)?
- [ ] Any authorization/consent path touched? Is it deny-by-default and covered by a denial test?
- [ ] Any input boundary added? Is it Zod-validated?
- [ ] Migrations backward-compatible with running code? Rollback stated?

**Product invariants (Credence-specific)**
- [ ] No claim without evidence + confidence + reasoning — in schema, API payload, and UI.
- [ ] No red rendering of any person's assessment; semantic tokens used correctly.
- [ ] AI-generated content labeled; monospace reserved for raw evidence.
- [ ] Prompt/pipeline changes carry eval results and version bumps.
- [ ] No forbidden vocabulary (candidates as pipeline/inventory/leads; "score" for "assessment").

**Quality**
- [ ] Types honest (no `any`, no unjustified casts); illegal states unrepresentable where feasible.
- [ ] Tests cover the behavior that would break if this code regressed; bug fixes include the regression test.
- [ ] All four UI states designed; both themes verified; a11y checks pass (§13).
- [ ] Logs added for new business events; no PII/secret leakage in logs or errors.
- [ ] Naming follows §5; structure follows §4; no cross-feature internal imports.
- [ ] Performance budgets respected; new queries indexed and paginated.

**Hygiene**
- [ ] Docs/READMEs/ADRs updated where behavior changed.
- [ ] No dead code, commented-out code, stray `console.log`, or leftover TODOs without linked issues.

Reviewers approve only what they'd be willing to maintain. "It works" is not the bar; "the next engineer will understand and trust this" is.

## 26. Definition of Done

A change is **done** only when *all* of the following hold:

1. Code merged to `main` behind CI: lint, typecheck, unit, integration, component/a11y, E2E green (plus eval suite if AI-touching).
2. Tests exist for the new behavior and its failure modes.
3. Accessibility verified (automated + manual pass for assessment/consent/interview surfaces).
4. All four UI states implemented; both themes verified.
5. Logging, metrics, and (if new failure modes) alerts + runbook entries in place.
6. Security & privacy reviewed: authz paths, data classification, log hygiene.
7. Documentation current: feature README, ADRs, API contract, prompt headers as applicable.
8. Performance budgets met or exception documented.
9. Feature-flagged if risky, with a rollout and removal plan.
10. Deployed to staging, exercised via the golden-path E2E, and verified in production after release ("done" means *observed working*, not *merged*).
11. For AI changes: eval results attached, versions bumped, assessments reproducible.

Anything less is *in progress*, whatever the ticket says.

## 27. Technical Debt Policy

1. **Debt is borrowed deliberately or not at all.** Taking a shortcut requires a `// DEBT(#issue):` comment linking a tracked issue that states the shortcut, the cost of leaving it, and the trigger for repayment. Undocumented debt found in review is treated as a defect.
2. **The debt register is the issue tracker** (label `tech-debt`), triaged monthly by severity: *hazardous* (threatens correctness, security, or explainability — scheduled immediately), *dragging* (slows development — scheduled within a quarter), *cosmetic* (batched opportunistically).
3. **Sustained repayment:** roughly 15–20% of each cycle's capacity goes to debt and platform health — protected, not "when we have time."
4. **Non-negotiable exclusions — never debt-eligible:** consent enforcement, evidence-provenance integrity, security controls, accessibility of assessment/consent surfaces, and eval-suite coverage of shipped prompts. Shortcuts here are not accepted at any velocity price.
5. **Expiry rules:** feature flags fully rolled out > 2 release cycles, `@ts-expect-error`s, skipped tests, and deprecated code paths all count as debt with default 1-quarter expiry.
6. **Boy-scout rule, bounded:** leave touched code slightly better, but refactors beyond the PR's purpose get their own PR — no stealth rewrites inside feature changes.
7. Dependency currency is debt management: scheduled updates, no major-version cliffs.

## 28. Development Workflow

1. **Local setup is one command** (`pnpm setup` or documented equivalent): env from a validated `.env.example`, Docker Compose for Postgres/Redis, seeded realistic (anonymized) dev data including fixture candidates and repos. A new engineer runs the app within 30 minutes.
2. **Environments:** local → preview (per-PR deploy) → staging (production-parity, fake AI spend limits) → production. Config differences live only in environment variables validated by `src/config/`.
3. **The loop:** pick a ticket → branch → write/adjust tests with the change → implement → run the full local check (`pnpm check`: lint + typecheck + unit + affected integration) → PR with preview deploy → review → merge → auto-deploy → verify.
4. **AI development discipline:** prompt iteration happens against the eval suite locally with recorded fixtures first, live API second; a dedicated dev workspace API key with hard spend caps; never the production key locally.
5. **Schema changes:** migration + code in one PR; run against a production-clone locally before merge for destructive changes.
6. **Definition of Ready** for tickets: user-visible behavior stated, affected surfaces (student/recruiter/both) named, edge/failure UX specified, and — for assessment features — the evidence/explainability requirements spelled out.
7. **Weekly rhythms:** dependency review, debt triage (monthly), eval-suite trend review, and a rotating "platform steward" who owns CI health, flaky tests, and alert noise for the week.
8. **Claude Code specifics:** follow this handbook without being re-told; prefer editing existing patterns over inventing new ones; when a request conflicts with a hard rule here (consent, provenance, semantic color, a11y), flag the conflict rather than silently complying; never commit directly to `main`; never touch `prisma/migrations` history.

## 29. Future Scalability Principles

1. **Scale the monolith first.** The path is: indexes & query tuning → read replicas → cache layers → dedicated worker pools per queue → extract a service *only* when a component has divergent scaling, isolation, or team-ownership needs proven by production data. Service extraction requires an ADR with the measured bottleneck.
2. **The seams are already drawn.** Feature-module boundaries (§4) and the queue-based pipeline (§14) are the future service boundaries. Keeping module isolation strict *today* is what makes extraction cheap *tomorrow* — this is why cross-feature imports are banned.
3. **Statelessness everywhere but the stores.** Web and worker processes hold no session or job state locally; anything that must survive a restart lives in Postgres or Redis. Horizontal scaling is then a dial, not a project.
4. **Versioning is the scalability of time:** pipeline, prompt, schema, and API versions let old data, old clients, and new code coexist — we can re-run improved evaluations over historical evidence without breaking issued assessments.
5. **Cost scales with users, not against us:** AI spend per candidate is a designed number (tiered analysis depth, caching, batch processing for non-interactive evaluation) reviewed as a first-class metric — unit economics are an engineering requirement (PDD risk §8).
6. **Multi-region and compliance readiness by hygiene:** UTC everywhere, i18n-safe string handling, data-residency-aware storage abstractions, and the data classification map (§15.9) — so geographic expansion is configuration and compliance work, not a rewrite.
7. **Evaluation throughput is the scaling frontier that matters.** As candidate volume grows, the analysis pipeline — not the web tier — is the bottleneck; it is designed for parallelism (independent repos, independent candidates) and for graceful backlog behavior (honest queue-position feedback) from day one.
8. **Rewrite nothing on speculation.** Every scalability investment is justified by a measured limit or a committed business milestone — the same evidence-over-claims principle we sell, applied to ourselves.

---

*This handbook is a living document. Amend it by PR, with the same review rigor as code — because it is the code behind the code.*
