# Component Library

The reusable UI primitives every feature and page builds on. Companion docs:
[docs/design-system.md](../../../../docs/design-system.md) (tokens),
[docs/02-brand-guidelines.md](../../../../docs/02-brand-guidelines.md),
[CLAUDE.md](../../../../CLAUDE.md) §10–13.

## Folder structure

```
components/
├── ConfidenceIndicator.tsx  Platform-defining — the only way confidence renders (CLAUDE.md §11)
├── EvidenceCard.tsx         Platform-defining — claim + evidence + confidence, together, always
├── AiContentMarker.tsx      Platform-defining — wraps every AI-generated string, no exceptions
├── ui/          Display & overlay primitives, plus Button (used everywhere, not form-specific)
├── forms/       Form-field controls — every input a form actually submits
├── feedback/    Status communication — loading, progress, empty/error states, toasts
├── navigation/  Wayfinding — tabs, breadcrumbs, pagination
└── layout/      Reserved for future structural primitives (Container, Stack, PageHeader…) — empty for now
```

## Platform-defining components

`ConfidenceIndicator`, `EvidenceCard`, and `AiContentMarker` sit outside the `ui/`/`forms/`/`feedback/`/`navigation/` categories deliberately — they are not generic primitives, they encode product policy (CLAUDE.md §11.1). A future `ConsentSurface` (visibility/sharing controls) belongs here too when that feature is built; it does not exist yet.

| Component             | Contract                                                                  | Notes                                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `ConfidenceIndicator` | `confidence: ConfidenceLevel` (required)                                  | Always the `ai` token — confidence is a property of the assessment process, never restyled to `strength`/`growth`/`alert`             |
| `EvidenceCard`        | `claim`, `confidence`, `evidenceRefs` (non-empty tuple type) all required | No prop lets a caller render a claim without its evidence — `evidenceRefs: readonly [T, ...T[]]` makes an empty array a compile error |
| `AiContentMarker`     | wraps `children`                                                          | The one place AI-authored text becomes visually labeled; nothing renders AI text outside it                                           |

Each category has a barrel `index.ts` re-exporting every component in it, so `import { Button, Card } from '@/components/ui'` works alongside the direct `@/components/ui/button` path. This also means a future Storybook config can glob `src/components/*/*.tsx` without any restructuring.

## Provenance

Every primitive except `Combobox`, `Spinner`, `EmptyState`, and `ErrorState` originates from shadcn/ui's registry (generated via the Lovable connector, which ships the full registry pre-installed) and was reviewed and refactored against this project's tokens and standards before being moved here. `Combobox` is the standard shadcn _composition_ pattern (`Popover` + `Command`), not a registry primitive — hand-built for the same reason shadcn itself doesn't ship it standalone. `Spinner`, `EmptyState`, and `ErrorState` are hand-built; shadcn has no equivalents.

## What changed during review (not accepted as generated)

- **Hardcoded colors removed.** `Dialog`/`Drawer` overlays used `bg-black/80` — replaced with a new `overlay` token (`docs/design-system.md`). `Skeleton` used `bg-primary/10` — replaced with `bg-muted`, since a loading placeholder is neutral chrome, not a brand moment (Brand Guidelines §7: "if everything is blue, nothing is").
- **Arbitrary values removed.** `Drawer`'s handle used `rounded-t-[10px]` — replaced with the token-based `rounded-t-lg`.
- **Semantic z-index applied.** Every overlay (`Dialog`, `Drawer`, `DropdownMenu`, `Popover`, `Tooltip`, `Select`) used a flat `z-50` — replaced with the semantic scale (`z-overlay`, `z-modal`, `z-dropdown`, `z-popover`, `z-tooltip`) from the token system.
- **Bare `shadow` utility fixed.** `Card`, `Button`, `Badge` used Tailwind's unsuffixed `shadow` class, which fell through to Tailwind's own built-in default (not any of our four elevation tokens) — the token file now aliases bare `shadow` to `shadow-sm`, and call sites were made explicit.
- **Semantic accents added to `Badge`.** The original only had `default`/`secondary`/`destructive`/`outline`. Added `strength` / `growth` / `alert` / `ai` variants — `Badge` is the most likely place these reserved evidence-labels actually get used (e.g. a "Verified" badge, an "AI-generated" badge).
- **Toast severities wired to our tokens.** Sonner's built-in `success`/`warning`/`error`/`info` styling otherwise uses its own defaults, not necessarily matching `strength`/`growth`/`alert`/`ai` — explicit `classNames` mappings were added.
- **Accessibility gaps closed.** `Skeleton` had no accessible name at all (a bare `<div>`) — added `role="status"` + `aria-label`. `Input`/`Textarea`/`Select` gained `aria-invalid:` styling using the `alert` token, so validation errors are visually distinguishable, not just structurally marked. Fixed a `displayName` typo (`BreadcrumbElipssis`) inherited from the generated source.
- **`Button` gained a `loading` prop** (spinner overlay, `aria-busy`, width-stable) — the one component in the required set that genuinely needed new behavior beyond the shadcn default.
- **`Toaster` tracks our actual theme, not the OS preference.** Found during runtime QA: Sonner defaults to `prefers-color-scheme`, which visibly mismatched the app when toggled independently of the OS (a light-styled toast rendered on a dark page). Fixed with a small, local `MutationObserver` on `document.documentElement`'s `class` attribute — no new app-wide theme provider, since that's a separate concern from this component.

## Component reference

### `ui/` — display, overlay & Button

| Component                                                                        | Variants                                                                                                 | Notes                                                                                   |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `Button`                                                                         | `default` · `secondary` · `destructive` · `outline` · `ghost` · `link`; sizes `default`/`sm`/`lg`/`icon` | Supports `asChild`, `loading` (spinner + `aria-busy`, implies `disabled`)               |
| `Card` (+ `CardHeader`/`CardTitle`/`CardDescription`/`CardContent`/`CardFooter`) | none                                                                                                     | Composition-based; `CardTitle` uses `text-title`, `CardDescription` uses `text-caption` |
| `Badge`                                                                          | `default` · `secondary` · `outline` · `strength` · `growth` · `alert` · `ai`                             | Reach for a semantic variant whenever the badge means one of those specific things      |
| `Avatar` (+ `AvatarImage`/`AvatarFallback`)                                      | none                                                                                                     | Always provide a fallback; `AvatarImage` needs a real `alt`                             |
| `Separator`                                                                      | none, `orientation` prop                                                                                 | `decorative` defaults `true` (removed from a11y tree)                                   |
| `Tooltip` (+ `Trigger`/`Content`/`Provider`)                                     | none                                                                                                     | Mount one `TooltipProvider` near the app root; shows on keyboard focus, not just hover  |
| `Label`                                                                          | none                                                                                                     | Pair with every form field (CLAUDE.md §13.7)                                            |
| `Dialog` (+ subcomponents)                                                       | none                                                                                                     | Focus-trapped, `Escape`-dismissible; always include `DialogTitle`                       |
| `Drawer` (+ subcomponents)                                                       | none                                                                                                     | Bottom-sheet variant of `Dialog` (vaul-based); prefer for mobile-first flows            |
| `DropdownMenu` (+ subcomponents)                                                 | none                                                                                                     | Full arrow-key nav, typeahead, submenus                                                 |
| `Popover` (+ `Trigger`/`Content`/`Anchor`)                                       | none                                                                                                     | Building block behind `Combobox`                                                        |
| `Command` (+ subcomponents)                                                      | none                                                                                                     | Rarely used directly — prefer `Combobox`                                                |

### `forms/`

| Component                         | Variants | Notes                                                                            |
| --------------------------------- | -------- | -------------------------------------------------------------------------------- |
| `Input`                           | none     | `aria-invalid:` styling uses `alert`                                             |
| `Textarea`                        | none     | Same conventions as `Input`                                                      |
| `Checkbox`                        | none     | Supports indeterminate via `checked="indeterminate"`                             |
| `RadioGroup` (+ `RadioGroupItem`) | none     | Arrow-key navigation between items                                               |
| `Switch`                          | none     | For immediate-effect settings; use `Checkbox` in explicit-submit forms           |
| `Select` (+ subcomponents)        | none     | Use `Combobox` instead once the list needs search                                |
| `Combobox`                        | none     | Hand-built (`Popover` + `Command`); typed `options: {value, label, disabled?}[]` |

### `feedback/`

| Component           | Variants                                                                                        | Notes                                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `Toaster` / `toast` | severities: default · `success` (strength) · `warning` (growth) · `error` (alert) · `info` (ai) | Mount `<Toaster />` once; call `toast(...)` anywhere                                                    |
| `Skeleton`          | none                                                                                            | `role="status"`; use `muted`, never a tinted brand color                                                |
| `Progress`          | none                                                                                            | Pair with real staged status text for long-running work — never a fake bar                              |
| `Spinner`           | sizes `sm`/`default`/`lg`                                                                       | Always carries an accessible `label` (visually hidden)                                                  |
| `EmptyState`        | none (slot-based: `icon`/`title`/`description`/`action`/`secondaryAction`)                      | Presentation-only — write the specific, evidence-oriented copy at the call site                         |
| `ErrorState`        | none (slot-based: `icon`/`title`/`description`/`action`)                                        | `role="alert"`; uses `alert` token; follows the brand's calm/accountable/actionable error copy register |

### `navigation/`

| Component                      | Variants | Notes                                                        |
| ------------------------------ | -------- | ------------------------------------------------------------ |
| `Tabs` (+ subcomponents)       | none     | Full `role="tablist"` semantics                              |
| `Breadcrumb` (+ subcomponents) | none     | `BreadcrumbPage` is `aria-current="page"`                    |
| `Pagination` (+ subcomponents) | none     | Link-based (`<a>`), not buttons — pagination changes the URL |

## Cross-cutting requirements every component satisfies

- **Tokens only** — no hardcoded colors or arbitrary values in application code; every color is a semantic Tailwind utility backed by `src/styles/globals.css`.
- **Dark mode** — inherited automatically; every token has an independently-tuned `.dark` value.
- **Typed props, `forwardRef`** — every component wrapping a real DOM element forwards its ref; CVA (`class-variance-authority`) is used wherever a component has visual variants.
- **Keyboard & screen-reader support** — inherited from Radix UI primitives where applicable (verified during review, not assumed); hand-built components (`Spinner`, `EmptyState`, `ErrorState`, `Combobox`) were given explicit `role`/`aria-*` attributes.
