# Credence AI — Design System

**Document type:** Engineering & Design Reference
**Companion documents:** [02-brand-guidelines.md](02-brand-guidelines.md) · [CLAUDE.md](../CLAUDE.md) §10–13 (UI Architecture, Component Design, Design Token Rules, Accessibility)
**Implementation:** `apps/web/src/styles/globals.css`

This document describes the token system that underlies every visual surface in Credence AI. It is the implementation-level companion to the Brand Guidelines — that document says *why* a rule exists; this one says *which CSS variable and Tailwind utility implement it*.

---

## Theme philosophy

Two rules govern the entire system (Brand Guidelines §7, CLAUDE.md §12):

1. **Semantic tokens only.** Application code never references a raw palette step (`bg-blue-600`) or a hardcoded color/size. It references a role (`bg-strength`, `text-alert`, `rounded-lg`, `shadow-md`). The token layer is the only place a raw value may appear.
2. **Both themes are first-class.** Light and dark are independently tuned for contrast — dark mode is not a CSS `invert()` of light mode. Every token below is defined once per theme in `src/styles/globals.css`.

All tokens are real CSS custom properties (not just Tailwind build-time constants), so they're inspectable at runtime and usable outside Tailwind utilities when needed (e.g. `style={{ color: 'var(--alert)' }}` in a chart library that can't take a class name).

---

## Colors

### Neutral scale

A warm-leaning gray scale, 12 steps (`--gray-50` → `--gray-950`), never blue-tinted steel. This carries roughly 90% of the interface: text, surfaces, borders.

### Semantic roles

| Token | Tailwind utility | Role | Brand rule |
|---|---|---|---|
| `background` / `foreground` | `bg-background` / `text-foreground` | Page canvas and default text | — |
| `surface` / `surface-foreground` | `bg-surface` | Cards, panels — distinct from page background | — |
| `primary` / `primary-foreground` | `bg-primary` | Deep saturated blue-indigo — brand, primary actions, links, focus | One primary action per view |
| `secondary` | `bg-secondary` | Neutral secondary actions | — |
| `muted` / `muted-foreground` | `bg-muted` / `text-muted-foreground` | De-emphasized content, captions | — |
| `accent` | `bg-accent` | Subtle interactive-state background (hover, selected) | — |
| `border` | `border-border` | Passive content dividers | Deliberately quiet |
| `input` | `border-input` | Interactive form-field boundaries | Tuned more visible than `border` — form usability needs it |
| `focus` | `outline-focus` (via `:focus-visible`) | Visible focus ring | Never suppressed (CLAUDE.md §13.3) |
| `disabled` / `disabled-foreground` | `bg-disabled` | Disabled controls | Intentionally low contrast — see Accessibility below |

### CLAUDE.md-canonical semantic accents (the reserved four)

These are the tokens Brand Guidelines §7 and CLAUDE.md §12.2 call out by name. **They are reserved** — each appears only when carrying its specific meaning, never as decoration, and never interchangeably with another.

| Token | Tailwind utility | Hue | Reserved for | Never used for |
|---|---|---|---|---|
| `strength` | `bg-strength` / `text-strength` | Deep, calm green | Verified evidence, strong skill signals | Generic success toasts, decoration |
| `growth` | `bg-growth` / `text-growth` | Warm amber-gold | Skill gaps framed as opportunities, in-progress states | Warnings or alarms — must never share a hue with `alert` |
| `alert` | `bg-alert` / `text-alert` | Soft red-coral | Destructive actions, integrity flags, genuine errors | **A person's skill assessment, ever** — this is the one rule that, if broken, means the product is no longer Credence |
| `ai` | `bg-ai` / `text-ai` | Violet | AI-generated content markers, confidence indicators | General branding |

**Ecosystem aliases:** `success`/`warning`/`error`/`info`/`destructive` are defined as aliases of `strength`/`growth`/`alert`/`ai` (in that order) purely for shadcn/ui and broader Tailwind-ecosystem convention compatibility (shadcn's default components expect `destructive` specifically). **Application code should prefer the canonical names** (`strength`, `growth`, `alert`, `ai`) — the aliases exist so a third-party component doesn't need to be forked just to speak our vocabulary.

### Data visualization

`chart-1` through `chart-5` — a categorical set built from the semantic tokens (primary, strength, ai, growth, plus one neutral), matched in perceived intensity. Skill-level scales must use the neutral-to-primary sequential ramp — **never** a red-to-green traffic light (Brand Guidelines §7: capability is a spectrum of development, not pass/fail).

---

## Typography

Two type families, a strict boundary between them (Brand Guidelines §8):

- **`--font-sans` (Inter)** — all interface text, headings, marketing. Loaded via `next/font/google` in `src/app/layout.tsx` (self-hosted, no external request, no layout shift).
- **`--font-mono` (JetBrains Mono)** — reserved *exclusively* for evidence artifacts: code excerpts, repository names, commit references, transcript quotes. This typographic boundary **is** the explainability boundary — a reviewer should be able to tell "this is raw evidence, untouched by us" purely from the font.

### Type scale

A fixed set of eight utility classes — no arbitrary sizes in application code.

| Utility | Size | Line-height | Weight | Use |
|---|---|---|---|---|
| `text-display` | 3.5rem | 1.1 | 600 | Hero/marketing headlines only |
| `text-h1` | 2.25rem | 1.2 | 600 | Page titles |
| `text-h2` | 1.75rem | 1.25 | 600 | Section headings |
| `text-h3` | 1.375rem | 1.3 | 500 | Subsection headings |
| `text-title` | 1.125rem | 1.4 | 500 | Card/component titles |
| `text-body` | 1rem | 1.6 | 400 | Default reading text — generous line-height for sustained reading |
| `text-caption` | 0.8125rem | 1.5 | 400 | Metadata, helper text — always `muted-foreground` |
| `text-code` | 0.875rem | 1.55 | 400 | Evidence content only — forces `--font-mono` |

Weight discipline: regular / medium / semibold only. No heavy bold, no italics for emphasis (poor legibility at UI sizes — use weight or color instead), no ALL-CAPS headlines (reserved for small overline labels with letter-spacing).

---

## Spacing

An 8-point scale (with one 4px half-step), exposed as Tailwind's spacing scale (`p-4` = 16px, etc.) and as raw variables (`--space-1` … `--space-10`) for non-Tailwind use.

| Token | Value |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 24px |
| `--space-6` | 32px |
| `--space-7` | 48px |
| `--space-8` | 64px |
| `--space-9` | 96px |
| `--space-10` | 128px |

---

## Radius

| Token | Utility | Value |
|---|---|---|
| `--radius-xs` | `rounded-xs` | 0.25rem |
| `--radius-sm` | `rounded-sm` | 0.375rem |
| `--radius-md` | `rounded-md` | 0.5rem |
| `--radius-lg` | `rounded-lg` | 0.75rem |
| `--radius-xl` | `rounded-xl` | 1rem |
| `--radius-2xl` | `rounded-2xl` | 1.5rem |
| `--radius-full` | `rounded-full` | 9999px |

---

## Elevation

Four levels (`shadow-sm` / `md` / `lg` / `xl`), deliberately subtle — Credence is a calm, evidentiary product, not a marketing surface competing for attention. Light-theme shadows are soft neutral-tinted drop-shadows; **dark-theme shadows lean on ambient depth (a lighter surface + a visible border) rather than a heavy black shadow**, which reads muddy on dark backgrounds.

---

## Motion

Motion is explanation, not decoration (Brand Guidelines §12) — it earns its place by showing continuity, confirming causality, communicating honest progress, or focusing attention on one defining moment. It never entertains.

| Duration token | Value | Use |
|---|---|---|
| `--duration-instant` | 100ms | Instant feedback (e.g. a toggle) |
| `--duration-short` | 180ms | Micro-interactions — Tailwind's default transition duration |
| `--duration-medium` | 240ms | Small component transitions |
| `--duration-long` | 340ms | Structural transitions (panel open/close) |
| `--duration-xlong` | 400ms | Full-page or major layout transitions |

| Easing token | Curve | Use |
|---|---|---|
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Default — Tailwind's default transition timing function |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Entrances |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Exits |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | Continuous/looping transitions |

**Hard rule:** nothing bounces, nothing overshoots. Springy physics reads playful; this brand is calm and serious. Assessment results never animate theatrically — no count-up scores, no confetti (Brand Guidelines §12, §18). All motion respects `prefers-reduced-motion` with full functional equivalence.

---

## Z-index

A fixed semantic scale — application code must never write a raw z-index number.

| Token | Value | Layer |
|---|---|---|
| `--z-base` | 0 | Default stacking |
| `--z-dropdown` | 1000 | Dropdown menus |
| `--z-sticky` | 1100 | Sticky headers/footers |
| `--z-overlay` | 1200 | Backdrop overlays |
| `--z-modal` | 1300 | Modal dialogs |
| `--z-popover` | 1400 | Popovers |
| `--z-toast` | 1500 | Toast notifications |
| `--z-tooltip` | 1600 | Tooltips (always on top) |

---

## Theme integration (Tailwind v4 + shadcn/ui)

- **Tailwind v4, CSS-first.** `src/styles/globals.css` uses `@theme inline` to map every custom property above onto the Tailwind theme — `bg-strength`, `rounded-lg`, `shadow-md`, `duration-short`, etc. all become real utility classes. There is no `tailwind.config.js`; Tailwind v4 is configured entirely in CSS.
- **A note on `@theme inline` self-references.** You'll see entries like `--radius-md: var(--radius-md);` inside the `@theme inline` block. This is **not circular** — `@theme inline` only tells Tailwind which CSS variable name backs a utility class; the variable's actual value still resolves through the normal CSS cascade against the `:root` / `.dark` declaration of the same name. This indirection is deliberate: every token stays a real, runtime-inspectable CSS custom property, while per-theme values (colors, shadows) can still change between light and dark.
- **shadcn/ui.** `apps/web/components.json` and `src/lib/utils.ts` (the `cn()` helper) are wired up so `npx shadcn add <component>` works out of the box against these tokens. `tw-animate-css` is installed for the entrance/exit transitions shadcn's Radix-based primitives use internally — our own custom motion tokens (above) govern everything else.
- **No hardcoded colors.** Every color in application code is a semantic Tailwind utility. A raw hex value or arbitrary Tailwind value (`bg-[#1a2b3c]`) outside `globals.css` is a code-review rejection (CLAUDE.md §12.1, §25).

---

## Accessibility

WCAG 2.2 AA is a merge gate, not a suggestion (CLAUDE.md §13). Every text/background pairing in this system was computationally verified (OKLCH → linear sRGB → WCAG relative luminance → contrast ratio), not eyeballed:

- **Two real issues were found and fixed** during integration: light-theme `alert`-foreground-on-`alert` initially measured 3.51:1 (failed the 4.5:1 text threshold) — the `alert` background was darkened until it cleared 4.5:1. The light-theme `border` token was raised from a nearly-invisible 1.22:1 to a legible-but-quiet 1.4:1, and given its own distinct, more-visible `input` value for interactive form boundaries.
- **`disabled` contrast is intentionally below 4.5:1.** WCAG 1.4.3 explicitly exempts disabled/inactive controls from the text-contrast requirement — a fully legible disabled state would misrepresent its own affordance. Do not "fix" this without removing the accompanying code comment that explains why.
- Every other semantic pairing (both themes) clears 4.5:1 for text or 3:1 for large text/UI components.
- Focus states use `--focus` (the primary color) via `:focus-visible` and are never suppressed.
- Color is never the sole carrier of meaning in a component — every semantic color pairs with a label or icon at the component level (enforced in component review, not the token layer).

---

## What's intentionally *not* here

This document covers the **token layer** only (Phase 1–2 of the design system). It does not cover:
- The governance components (`EvidenceCard`, `ConfidenceIndicator`, `AiContentMarker`, `ConsentSurface`) described in Brand Guidelines §11 and CLAUDE.md §11 — those are a separate, future component-library task.
- Iconography, illustration, and logo usage — see Brand Guidelines §6, §9, §14.
- Actual shadcn/ui component installation — the integration (`components.json`, `cn()`) is ready; components are added as features need them.
