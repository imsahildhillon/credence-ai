# Page Migration Conventions

**Document type:** Engineering Standard
**Status:** Adopted, derived from the Landing page migration (§§1–8 + WebGL/three.js pass)
**Companion documents:** [CLAUDE.md](../CLAUDE.md) · [02-brand-guidelines.md](02-brand-guidelines.md)

This document is the standing convention for migrating any remaining `/design` HTML mockup into the real application. It exists so each subsequent migration (Dashboard, Analysis, Report, Recruiter) starts from settled decisions instead of re-litigating them. Where this document is silent, defer to `CLAUDE.md`; where the two conflict, `CLAUDE.md` wins.

---

## Architecture

### When to use Server Components

Default to a Server Component for every section. A section stays a Server Component unless it has a concrete, current need for one of: browser APIs (`window`, `canvas`, `IntersectionObserver`), local interactive state, or an animation loop. "Might need interactivity later" is not a reason — convert when the need is real.

### When Client Components are justified

A `'use client'` boundary is justified only at the smallest possible leaf, never at a whole section. In this migration: `ScrollAwareNavShell` (scroll-shadow state), `Reveal` (intersection-based fade-in), `ReadingTraceCanvas` and `HeroShaderBackground` (canvas/WebGL). Every other section — including ones that *compose* a client leaf — stayed a Server Component. A section needing one animated element does not become a client section; the animation becomes a child.

### Progressive enhancement rules

1. Every section must be substantively meaningful with JavaScript disabled: real text, real headings, real links — never content that only exists inside a client-rendered tree.
2. Decorative client-only elements (canvas traces, shader backgrounds) degrade to either nothing or a static CSS fallback — never to a broken or missing layout.
3. Scroll-reveal and similar effects render content **visible by default**, then hide-and-reveal only after confirming, at mount, that the browser API exists *and* the element is genuinely below the fold. Never hide-first-then-show, since that fails open to "permanently hidden" if the client code never runs.
4. When a heavier, truer implementation becomes available after a section has already shipped (e.g., a real shader reference surfacing after the CSS-approximation was approved), prefer replacing the approximation with the real thing over maintaining two implementations — but keep the approximation as the progressive-enhancement fallback, not delete it.

### Dynamic import guidelines

1. `next/dynamic()` alone changes *where* code lives (a separate chunk) but not *when* it's fetched — a component rendered unconditionally on mount still ships in the route's initial JS unless explicitly deferred.
2. `{ ssr: false }` is what actually excludes a chunk from a route's measured "First Load JS" — and it is **only valid inside a Client Component**. The Next.js App Router rejects it from a Server Component's `dynamic()` call.
3. Pattern: for a Server Component section that needs a heavy client-only child (three.js, a charting library, anything non-trivial in size), create a one-line `'use client'` wrapper file whose entire job is `export const XLazy = dynamic(() => import('./X').then(m => m.X), { ssr: false })`, then render `<XLazy />` from the Server Component. Never reach for `{ ssr: false }` directly in a section file.
5. Reserve layout space (explicit height/width classes) around anything dynamically loaded that has intrinsic size, so its chunk arriving late never causes layout shift. Don't rely on the eventual content to define the space.
6. Verify with a real production build (`next build`), not dev mode — dev mode's bundle shape does not reflect what ships.

### Performance budgets

Enforce the budgets in `CLAUDE.md` §21 per route, not per project:
- JS per route < 250 KB gzipped (**First Load JS**, from the `next build` output table — not dev-mode size, not raw/uncompressed size).
- A budget breach is diagnosed by identifying which import pulled in the weight (`grep` the built chunk for a library-distinctive symbol, e.g. `WebGLRenderer`), not by guessing.
- A heavy library used for one decorative, non-critical-path feature is a strong signal to lazy-load it (§ Dynamic import guidelines above) rather than to avoid the feature.

---

## Components

### Naming conventions

- Section components are named for what they *are*, not their position: `HeroSection`, `ProblemStatement`, `InsightRows`, `WatchItThink`, `RecruiterTeaser`, `EvidencePanel`, `SiteFooter` — never `Section1`, `Section2`.
- A lazy-loading wrapper is named `<Thing>Lazy` (`HeroShaderBackgroundLazy`, `ReadingTraceCanvasLazy`) so it's unambiguous at the import site which file actually contains the implementation.
- Small colocated helpers get a name describing the operation, not the caller: `resolveThemeColor.ts`, `createReusableWebglRenderer.ts` — reusable by any future component with the same need, not named after the first component that needed them.

### File organization

- Page-specific sections live under `components/<page>/` (e.g. `components/landing/`), **never** under `app/(group)/components/`. Routing and UI stay separate.
- The route's `page.tsx` does page composition only — imports and arranges section components in order. If it does anything else (data shaping, conditionals beyond trivial JSX), that logic belongs in the section or a `server/` layer, per `CLAUDE.md` §4.
- One file per section component. A section's CSS Module (if any) sits next to it (`HeroSection.tsx` + `HeroSection.module.css`), not centralized.

### When to create shared components

Promote a page-specific component to the shared `components/` layer only when a **second real consumer** exists — not speculatively. Across the entire Landing migration, zero components were promoted: every section had exactly one consumer. Where a shared primitive already existed (`Card`, `Button`, `Badge`), it was reused as-is rather than forked.

### When not to abstract

- Three visually-identical rows (Insight Rows) are a local `const ROWS = [...] as const` array mapped into JSX — not a `<Row>` component, not a generic `<List>` component. A second, unrelated section with a superficially similar shape (three capability cards in the Recruiter Teaser) got its **own** local array — it was not forced through a shared "grid of three things" abstraction, because the two aren't the same concept wearing different data.
- A component crossing ~8 props, or a generic "Section" wrapper that takes children + 6 layout flags, is the signal to stop and use composition instead (`CLAUDE.md` §11.2).

---

## Styling

### Design token usage

- Every color, spacing, and type-scale value comes from the existing token layer (`styles/globals.css`) — semantic Tailwind utilities (`text-h2`, `text-muted-foreground`, `bg-primary/5`, `border-border/60`), never a new hex value, never an Tailwind arbitrary value without a comment justifying it.
- When a value needs to be read by non-CSS code (a `<canvas>` stroke color, a WebGL uniform), resolve it from the DOM at runtime via `getComputedStyle` rather than duplicating the token's value in JS/GLSL. For raw numeric floats (WebGL), paint a 1×1 canvas with the resolved CSS color string and read the pixel back — this keeps the token as the single source of truth even across a non-CSS rendering boundary.
- If a design calls for a token that doesn't exist (the original mockup's two-tone indigo/warm glow — this codebase has no "warm neutral accent" token), don't invent one under time pressure. Say so, and either drop the second value or flag it for a real design-system decision.

### CSS Modules vs globals.css

- `globals.css` is reserved for: design tokens, resets, typography, global utilities, and *application-wide* animations (e.g. the global `prefers-reduced-motion` collapse rule).
- Page- or section-specific static CSS (keyframes, one-off layout tricks) goes in a colocated `*.module.css` file next to the component. This is the sanctioned way to write scoped, static CSS without violating the zero-CSS-in-JS rule — CSS Modules are build-time-scoped, not runtime CSS-in-JS.
- Never add a page-specific `@keyframes` block to `globals.css`, even for something as small as one animation. Colocate it.

### Animation rules

1. Prefer the fewest moving elements that still communicate the intent. A mood-reinforcing animation competes for attention if there are three of it; restrained motion (one focal element) reads as more premium than a busy screen.
2. Every animation must have a `prefers-reduced-motion` path with full functional equivalence — not a slower version, a genuinely static one (a single still frame, not a paused mid-animation state).
3. The app already has a global CSS rule collapsing all `animation-duration`/`transition-duration` under reduced motion — a component only needs its **own** explicit reduced-motion branch when the motion is driven by JS (`requestAnimationFrame`, canvas/WebGL loops), since the global CSS rule can't reach into imperative code.
4. Treat the original HTML/JS as a **visual specification**, not a source-code specification. If the reference script has a real bug (a duplicate `const` declaration that means it never actually ran, a container-ID mismatch, a mislabeled technology), reproduce the *intended visual result*, not the bug.
5. When reusing a canvas/WebGL animation across two sections, keep it as a single component reused by reference — never fork a second copy with slightly different constants.

### Responsive layout principles

- Mobile-first Tailwind breakpoints throughout; verify the actual rendered layout at 375px and at `md:` (768px)+, not just at the design's presumed desktop width.
- Fixed-size type-scale utilities (`text-h1`, `md:text-display`) over ad hoc responsive font sizes — a headline that overflows at mobile width gets the smaller existing token at the base breakpoint and the larger one at `md:`, not a new arbitrary clamp.
- Flex children that must wrap/shrink correctly need `min-w-0`/`w-full` on both the child and its flex-parent explicitly — a `flex` parent does not make its text children wrap correctly by default.

---

## Accessibility

### Semantic HTML conventions

- Real headings (`h1`–`h3`) for real hierarchy; never a styled `<div>` standing in for a heading, never a heading level skipped for visual-size reasons.
- Label→description pairs (a row with a title and one sentence about it) are stacked `<h3>`/`<p>`, not forced into `<ul><li>` — reserve list semantics for genuinely enumerable items.
- A `<footer>` gets its own `<nav aria-label="Footer">` distinct from the page's primary navigation landmark.

### Keyboard interaction rules

- Every genuinely interactive element (link, button) is a native focusable element with the app's existing global `:focus-visible` ring — never a styled non-interactive element with a click handler.
- Do **not** add `tabIndex={0}` to a non-interactive element to give keyboard users "the same affordance" as a hover effect, unless that element has a real action. A focusable stop with no action is itself an accessibility anti-pattern (`jsx-a11y/no-noninteractive-tabindex` exists precisely to catch this) — if the hover effect is decorative recoloring of already-visible content, there is nothing hidden for a keyboard equivalent to expose, so no parity is owed.
- If a keyboard-parity requirement and an accessibility lint rule conflict, that's a signal to re-examine the requirement's premise (is there a real destination this element should have?) — not to suppress the lint rule.

### Decorative content rules

- Every purely decorative visual element (canvas traces, ambient shader glows, dwell-point glows) is `aria-hidden="true"`.
- Decorative motion never carries information a screen-reader user would otherwise miss — if it did, that information needs a text equivalent, not just an ARIA label on the animation.

### Reduced-motion expectations

- Every new animated component is tested with `prefers-reduced-motion: reduce` before being marked done, not assumed to inherit the global rule if it's JS-driven.
- Reduced motion must produce full functional equivalence, not degraded functionality — a static single line communicates the same "attention moves across work" idea as the animated wander, just without the wander.

---

## Product Integrity

These rules are non-negotiable and apply to every future migration without exception (`CLAUDE.md` §1, §17.10, §27.4 — evidence-provenance integrity is explicitly *never* debt-eligible).

### Never fabricate data

No commit hashes, repository names, PR counts, contributor names, timelines, or evidence counts that aren't real, ever — including as "just a mockup illustration." The original design's `"427 commits, 81 pull requests, 3 repositories, 4 years"` and `"14 separate incident response commits... an 18-month period"` are exactly the pattern to refuse: specific-sounding numbers about a specific (fictional) person's work.

### Never simulate analysis

A landing page may describe the *mechanism* of assessment (claim → evidence → confidence) but must never render an *instance* of one — no fabricated "Strongest Engineering Trait: X," no fake confidence percentages, no invented "Signal 01/02" reasoning strings. If a mockup shows the product mid-analysis, the migration output describes the same capability in the abstract instead of performing a fake demo of it.

### Evidence-first messaging

Every claim about what the product does must be a true, general statement about the real mechanism, reusing the same vocabulary the rest of the codebase uses (`evidence`, `claim`, `confidence` — never `score`). Where the real shared components that enforce this exist (`EvidenceCard`, `ConfidenceIndicator`), prefer explaining the concept they encode rather than instantiating them with placeholder data, since instantiating them implies a specific real assessment exists.

### Honest loading states

Progress and "coming soon" language must reflect actual product state, not aspirational status. Per this migration: dropped unverifiable partner/testing captions ("Currently in design partner testing," "Evaluating multi-repo comparison patterns") because their truth couldn't be confirmed — kept only "Coming soon" framing that is unconditionally true of an unshipped feature.

---

## Verification Checklist

Run this checklist for **every** migrated section, before reporting it complete — not just at the end of the whole page.

- [ ] **TypeScript** — `tsc --noEmit` clean, including `noUncheckedIndexedAccess` (index into `Record`-shaped objects, e.g. three.js `uniforms`/`attributes`, needs a captured direct reference, not repeated indexed access).
- [ ] **ESLint** — clean, including `jsx-a11y` and `import/order`.
- [ ] **Production build** — `next build` succeeds; check the route's First Load JS against budget, not just that the build didn't error.
- [ ] **Desktop** — rendered and screenshotted at **1024px, 1280px, 1440px, and 1920px** specifically, not just whichever width the browser tool defaults to. A layout can be correct at one desktop width and silently wrap or overflow at another (the Landing nav did exactly this — clean at the tool's default width, broken at a real 1024–1280px window) — the four widths are common real laptop/monitor breakpoints and the minimum spread that catches that class of bug.
- [ ] **Tablet** — checked at the `md:` breakpoint boundary specifically (768px), since that's where most layout rules switch.
- [ ] **Mobile** — 375×812, verified no horizontal overflow and no cut-off text.
- [ ] **Dark mode** — verified the section is legible and correctly themed, not assumed from light-mode correctness (a hardcoded/assumed color is the single most common dark-mode bug class seen in this migration).
- [ ] **Light mode** — verified explicitly too; don't assume "if dark mode works, light mode does."
- [ ] **Reduced motion** — verified the component's reduced-motion branch actually renders (not just that the code has an `if` for it).
- [ ] **Accessibility** — heading hierarchy correct; every interactive element keyboard-reachable with visible focus; decorative elements `aria-hidden`; `jsx-a11y` clean.
- [ ] **Bundle impact** — for any section adding a new dependency or a client component of non-trivial size, check whether it needs a lazy-loaded, `ssr:false` boundary before it ships, not after a budget regression is noticed.

---

## Lessons Learned

Concrete, mechanical improvements surfaced during the Landing migration — apply these automatically on every remaining page, don't rediscover them:

1. **Verify live in a browser before reporting a section done.** Three real bugs (a `noUncheckedIndexedAccess` narrowing failure, white-on-light-theme invisibility, mobile text overflow from a flexbox shrink issue) were only caught by taking real screenshots and reading real computed styles — none were visible from reading the code. Continue treating "looks right in the diff" as insufficient evidence.
2. **`next/dynamic()` without `{ ssr: false }` does not reduce First Load JS**, even though it looks like it should. If a component needs to be excluded from the initial bundle, the `ssr: false` option is mandatory, and it must live in a dedicated `'use client'` wrapper file since Server Components can't use it directly. Reach for the `<Thing>Lazy` wrapper pattern immediately when adding any client component wrapping a library over roughly 20–30 KB gzipped, rather than waiting for a budget regression to force the fix.
3. **A `<canvas>` can only bind one WebGL context for its lifetime.** React Strict Mode's dev-mode double-effect-invocation reuses the same DOM node across the two invocations, so a naive `new THREE.WebGLRenderer({ canvas })` on the second invocation fails **silently** (no thrown exception — just a permanently dead renderer). Any component creating a WebGL context must request the canvas's existing context first and hand it to the renderer via the `context` option, unconditionally — not just "when it happens to matter."
4. **An out-of-band `gl.readPixels()` call is not a reliable way to verify WebGL rendering.** Without `preserveDrawingBuffer: true`, the drawing buffer's contents are not guaranteed to persist past the frame that rendered them, so a devtools-console `readPixels()` executed asynchronously will often read back all-zero even when the actual composited frame (what a screenshot captures) is completely correct. Trust the visual screenshot over an ad hoc pixel readback; if a numeric check is truly needed, add `preserveDrawingBuffer: true` for the duration of the diagnostic.
5. **Reproduce the reference's visual intent, not its source code.** Two separate original reference scripts in this migration had real bugs (a duplicate `const container` declaration; a container-ID mismatch between the outer wrapper and the inner script; code mislabeled "Three.js" that was actually plain Canvas2D). In every case, the correct move was a clean reimplementation of the *described effect*, never a literal port.
6. **When a stricter or more literal interpretation of an instruction collides with a hard rule (accessibility, fabricated data, a forbidden dependency), stop and flag the conflict rather than picking a side silently.** This surfaced twice: the `tabIndex`-for-keyboard-parity request vs. `jsx-a11y`, and the original mockup's fabricated evidence/statistics vs. the product-integrity rules. Both times, surfacing the conflict (via a question or an explicit call-out) got a clean resolution; guessing either direction would have either shipped an a11y regression or fabricated data.
7. **Browser-automation tooling in this environment has real flakiness** (stale/cumulative console-log buffers across navigations, occasional blank screenshot captures, `navigate` sometimes behaving like a soft SPA transition rather than a hard reload). When a signal looks contradictory (e.g., a "still broken" console error alongside a correct-looking screenshot), prefer the accessibility tree (`read_page`) and direct visual screenshots over console-log timestamps, and use a genuine `location.reload()` from within the page (not just the tool's `navigate`) when a true hard reload is required to disambiguate.
8. **Ask before reversing a previously-approved architectural decision**, even when the request seems to imply it (e.g., "incorporate three.js" after CSS/Canvas2D was explicitly chosen for simplicity). Confirm scope (which pieces actually move) and get explicit sign-off on any new dependency before installing anything.
9. **Never assume a Tailwind utility suffix means its stock Tailwind value.** This project overrides the spacing scale for steps 0–10 (`globals.css`, `--space-*`/`--spacing-*`) with its own non-linear macro-layout scale (`--space-10` = 128px, not the default 2.5rem) — so `px-10`, `gap-8`, `gap-6`, etc. resolve to values a developer working from memory or from stock Tailwind docs would not expect, and nothing in the editor warns about it. This caused the Landing nav's desktop wrapping bug: spacing utilities chosen for "looks about right" nav spacing were silently 2–4× larger than intended. Before choosing any spacing utility, check what it actually resolves to in *this* project's token definitions (`getComputedStyle` in a live browser, or the `--space-*`/`--spacing-*` definitions in `globals.css`) — never assume from the class name alone.
10. **Verify navigation and other layout-critical components at multiple real desktop widths, not just the browser tool's default viewport.** A layout can render correctly at one width and wrap or overflow at another purely from flexbox's default `min-width: auto` shrink behavior — this is invisible until you actually resize and measure. Check 1024px, 1280px, 1440px, and 1920px specifically (see the Verification Checklist's Desktop item) for any section with more than one or two flex/inline-text items competing for horizontal space.
