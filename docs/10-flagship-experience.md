# Credence AI — Flagship Experience Design

**Document type:** Experience Architecture & Design Direction
**Status:** Proposal — design only, nothing here is implemented
**Mission:** A recruiter should understand an engineer better in 60 seconds than after 20 minutes on GitHub.
**Companion documents:** [02-brand-guidelines.md](02-brand-guidelines.md) · [04-system-architecture.md](04-system-architecture.md) · CLAUDE.md

The brand guideline's founding sentence — *"the brand itself must behave like evidence"* — is the design brief. This document redesigns the experience around it, from first principles, with no obligation to any existing screen.

---

## 0. The one structural decision everything else follows from

**Credence has exactly one artifact: the Engineering Report. It has two audiences.**

The candidate *produces and owns* the report. The recruiter *reads and acts on* the report. Every screen in the product is either an on-ramp to the report, a chapter of it, or a control over who may read it. Anything that is none of those three is deleted.

This kills "dashboard syndrome" at the root: dashboards exist when a product has many equal surfaces competing for attention. Credence has one surface. The app stops being *pages containing cards* and becomes *a document with chapters* — the mental model shifts from "web app" to "the most rigorous technical reference letter ever produced, with every claim footnoted to source."

---

## 1. UX Architecture

### The disclosure ladder

One interaction model governs the entire product. Four altitudes, each one click apart, each strictly *more raw and less interpreted* than the one above:

```
GLANCE      The finding.           "Strong — Backend Service Design"        sans, large
   ↓ one click
EXPAND      The case for it.       level · confidence · trend · caveats     sans, dense
   ↓ one click
EVIDENCE    The raw record.        commit · diff · date · repo              mono
   ↓ one click
GITHUB      The source of truth.   leaves our product entirely              —
```

Rules of the ladder:

1. **Every claim sits on the ladder.** There is no statement anywhere in the product from which a reader cannot descend to a GitHub URL in ≤ 3 clicks.
2. **Descending never costs context.** Expansion happens in place (inline, or a side sheet on wide viewports) — never a navigation that loses your position in the report.
3. **Confidence increases monotonically downward.** Each click reveals something *less mediated by us*. This is the mechanism behind "every interaction should increase confidence" — the interaction physically moves the reader toward proof.
4. **Typography encodes altitude.** Interpretation is sans-serif. Raw evidence is monospace. The existing mono/sans boundary (Brand §8) is promoted from a styling rule to *the* navigational cue: when the type turns mono, you are looking at the record, not our reading of it.
5. **The top of the ladder is never AI prose.** GLANCE level shows findings — short, falsifiable claims with citation chips — never a summary paragraph. AI reasoning lives *inside* EXPAND, below the evidence that grounds it. (Principle 2: evidence before summaries — this inverts the current profile, which leads with the AI paragraph.)

### The 60-second contract

The mission is a time budget, and the report's first viewport is designed against it explicitly:

- **0–5 s:** Who + how much proof. Name, one-line capability headline, and the provenance line ("Built from 2 repositories · 14 verified evidence items · assessed July 25, 2026").
- **5–30 s:** The findings. Three to five evidence-anchored claims, scannable without scrolling.
- **30–60 s:** The capability matrix, collapsed. Every assessed skill on one screen: level, confidence, evidence count, trend direction. No expansion needed to form a first judgment.
- **60 s +:** Everything below is depth, entered voluntarily via the ladder.

If a recruiter closes the tab at 60 seconds, they leave with a defensible, evidence-cited opinion. That is the product promise, made literal in the layout.

---

## 2. Information Architecture

```
CREDENCE
│
├── The Engineering Report  ····························  THE product
│     Chapter 1  Cover & Findings
│     Chapter 2  Capability Assessment      (per-skill, expandable)
│     Chapter 3  Evidence Record            (the hero appendix)
│     Chapter 4  Repository Intelligence
│     Chapter 5  Growth Timeline
│     Chapter 6  Engineering DNA
│     Chapter 7  Methodology                (how this report was produced)
│
├── Candidate on-ramp
│     Landing → Connect & Select → Analysis Experience → Report (own view)
│     + Ownership rail: consent/visibility · who viewed · re-run analysis
│
├── Recruiter on-ramp
│     Roster (search) → Report (recruiter view)
│     + Decision rail: status · shortlist · private notes
│
└── Identity
      Sign in (GitHub) · Recruiter access (invitation-only)
```

Both audiences read the *same report* rendered from the same pipeline (the Shared Profile Model already in the architecture). The views differ only in the rail attached to the right edge: candidates get ownership controls, recruiters get decision controls. Content parity between the views is a trust feature in itself — a candidate can see exactly what a recruiter sees, nothing hidden, and we can say so.

**No tabs anywhere in the product.** The report is one continuous scroll with a chapter rail; the roster is one list. Tabs are how products apologize for unresolved information architecture.

---

## 3. Screen Hierarchy — and the kill list

Total screens in the flagship: **seven.** Every existing screen was challenged; here is the verdict on each.

| Existing screen | Verdict | Rationale |
|---|---|---|
| `/dashboard` | **Kill.** | It is a redirect stub pretending to be a screen. Routing logic is not a surface. Post-login resolution happens server-side with no rendered intermediate. |
| `/analysis` (holding card) | **Transform → Analysis Experience.** | The single longest wait in the product is currently a static card. It becomes the product's one motion showpiece (§6, §10) — and the candidate's first proof that we actually read their work. |
| `/profile` (9 stacked cards) | **Transform → Engineering Report.** | The content survives; the *form* dies. A stack of equal-weight cards has no argument structure. A document has chapters, hierarchy, and a reading order that mirrors reasoning order (Brand: context → evidence → interpretation → confidence). |
| `/onboarding` (3 steps) | **Compress → Connect & Select.** | Welcome + repo import + review is three screens for one decision ("which work may we read?"). One screen: connect, select, confirm — with the consent framing carried in the screen itself, not a preamble page. |
| `/onboarding/review` | **Kill (folded into Connect & Select).** | A separate confirmation page for a selection made 10 seconds ago is ceremony, not consent. The confirmation is the selection UI itself, with one explicit start action. |
| `/signup` | **Kill.** | OAuth makes login and signup the same act; two routes rendering the same form is inventory. One `/login`. |
| `/settings` | **Kill (for now).** | It is a stub. When real settings exist (account deletion, data export), they earn a surface. Until then the ownership rail on the report carries the two controls that matter: visibility and re-run. |
| `/recruiter/candidates` | **Transform → Roster.** | Survives as the recruiter's only list — rebuilt keyboard-first (§14), stripped to what supports a decision to open a report. |
| `/recruiter/candidate/[id]` | **Merge → Report (recruiter view).** | Not a separate experience — the same report document with the decision rail. |
| `/recruiter-access` | **Keep, barely.** | Invitation-only is a product fact that needs a public statement. One screen, mostly typography. |
| `/login` | **Keep.** | One button. It should feel like the cover of the product, not a form. |

The seven survivors: **Landing · Login · Connect & Select · Analysis Experience · Report · Roster · Recruiter Access.**

---

## 4. User Flows

### Candidate

```
Landing
  │  One promise, large type: "Proof of skill, made visible."
  │  One action: Connect GitHub. (Below the fold: how it works, in 3 evidence-first steps.)
  ▼
Connect & Select
  │  OAuth → repository list appears with our defaults pre-selected (own, non-fork, active).
  │  The consent sentence sits beside the action, not in a modal:
  │  "We read only what you select. You can revoke this at any time."
  │  One action: Begin analysis.
  ▼
Analysis Experience                                    (the motion showpiece — §6, §10)
  │  A live, staged, truthful narrative of the pipeline reading their work.
  │  Safe to leave; the report arrives when it arrives.
  ▼
Report — reveal
  │  First render is a moment: the cover composes itself (one staggered entrance,
  │  the only celebratory motion in the product), then it is a still document.
  ▼
Depth, at will (the ladder)
  │  Findings → Capability → Evidence → Repos → Timeline → DNA → Methodology
  ▼
Ownership rail
     Visibility & consent (the ConsentSurface, finally designed) · who viewed · re-run.
```

### Recruiter

```
Landing (authenticated) = Roster
  │  A list, not a dashboard. Search by capability, sort by freshness or name.
  │  Each row: name · capability headline · top skills · freshness · your status.
  │  No ranking. No composite score. The list refuses to pre-judge.
  ▼  one click (or Enter)
Report — recruiter view
  │  The 60-second contract (§1) delivers instant, defensible confidence.
  ▼  the ladder
Deep evidence
  │  Any claim → its evidence → GitHub. The recruiter can audit us.
  ▼
Decision rail (never leaves the report)
     Status: New → Reviewing → Interviewing → Archived
     Shortlist toggle · private notes (markdown)
     — then contact, consent-gated, when that ships.
```

Neither journey contains a screen whose only job is to route to another screen.

---

## 5. Component Hierarchy

The four policy components remain the constitutional layer — this design strengthens their mandate rather than replacing them:

```
Layer 0 — Policy (existing, unchanged in principle)
   EvidenceCard          the only way a claim renders (claim + evidence + confidence, mandatory)
   ConfidenceIndicator   the only way confidence renders
   AiContentMarker       the only container AI text renders in — now always *below* evidence
   ConsentSurface        the only visibility/sharing control — finally gets its flagship design

Layer 1 — Report primitives (new)
   Chapter               full-width section with editorial header, anchor, and chapter number
   Finding               one falsifiable claim + inline citation chips (the GLANCE unit)
   CitationChip          superscript-style evidence reference; hover = preview, click = descend
   ProvenanceLine        "Built from X repositories · Y evidence items · assessed Z" — one
                         component, rendered identically on cover, chapters, and roster rows
   Ladder                the expand-in-place container implementing GLANCE→EXPAND→EVIDENCE
   EvidenceRecord        the mono-typeset raw item: repo · ref · diff stats · date · link
   TrendGlyph            small multiples sparkline (activity/growth over time) — never a chart junk axis
   DistributionBar       repository-distribution strip for a skill (which repos ground it)
   CaveatNote            evidence limitations, neutrally typeset (see §13 — never red)

Layer 2 — Journey surfaces
   AnalysisStage         one truthful pipeline stage line with its live state
   RosterRow             recruiter list row (keyboard-first)
   DecisionRail / OwnershipRail   the right-edge rails; identical skeleton, different controls
   ChapterRail           the report's quiet position indicator / navigation
```

Composition rule: Layer 2 may only express claims through Layer 0/1 — a journey surface can never mint an un-cited statement, because no primitive exists for one.

---

## 6. Motion Philosophy

**Motion is spent like the color budget: almost nowhere, so that where it appears, it means something.**

Three sanctioned uses, in priority order:

1. **The Analysis Experience** — the product's single showpiece, and the only place motion is generous. A vertical narrative of truthful stages, each line materializing as the pipeline *actually* reaches it: "Reading 214 commits in `credence-web`…", "Cross-referencing 12 pull requests…", "Grounding assessments in evidence…". Numbers are real, stage transitions are driven by persisted pipeline state, and when something fails partially, the line says so honestly and the run continues (§19.5 honesty carries into motion). This is where the candidate falls in love: watching a rigorous reader take their work seriously.
2. **Disclosure** — the ladder's expand/collapse: 180–220 ms, ease-out, opacity + ≤ 8 px translate. Fast enough to feel like revealing, not animating.
3. **The report reveal** — one staggered entrance (cover → provenance → findings, ~600 ms total) on first render after an analysis completes. Then the document is *still*. A due-diligence document does not shimmer.

Prohibitions: no parallax, no scroll-jacking, no springs on data, no hover choreography, no ambient loops. `prefers-reduced-motion` gets full functional equivalence — the Analysis Experience degrades to the same truthful stage list, updating without transitions.

---

## 7. Typography System

Typography does the work color and chrome are refusing to do.

- **Two families, hard boundary.** The sans (Geist) for all interpretation and interface; the mono exclusively for raw evidence — commit refs, diff stats, code, dates-of-record. The boundary is the explainability boundary (Brand §8), now also the ladder's altitude cue.
- **Editorial scale.** The report uses a document scale, not an app scale: display (cover name, ~clamp 40–64 px), chapter heads (~28 px), findings (~20 px, generous leading), body (16 px, line-height ≥ 1.6), record/caption (13–14 px, mono for records). Maximum four sizes visible in any viewport.
- **Measure discipline.** Report prose is capped at ~68 ch. Whitespace is structural: chapters breathe with ~2× the vertical rhythm of the current card stack. Wide content (evidence tables, timelines) breaks the measure deliberately and scrolls in its own container.
- **Tabular figures everywhere numbers align** (evidence counts, dates, distributions) — a due-diligence document with wobbly number columns is a costume.
- **Weight over color for hierarchy.** Emphasis is medium/semibold ink, not tinted text. Color is reserved for meaning (§8).

---

## 8. Color Philosophy

**Near-monochrome, so the five meaningful colors are never diluted.**

- **Ink on paper.** Both themes are essentially two inks (foreground, muted) on one surface, with hairline borders. Target: ≥ 90 % of any report viewport is ink/paper/border.
- **The reserved semantics are the only real colors,** and their reservations are non-negotiable product law, not MVP styling: `strength` (verified strong signal), `growth` (opportunity, never warning), `ai` (violet — AI-generated content and confidence, nothing else), `alert` (errors and integrity flags only — **never any assessment of a person**).
- **Primary (blue) means "you can act."** Buttons and links only. If everything is blue, nothing is.
- **Scarcity is the feature.** On a monochrome page, a single violet `AI-generated` marker or one green `strength` accent is unmissable. Color frequency is inversely proportional to trust — every added splash makes each one mean less.
- Data visualization (timeline, distributions) uses the neutral→primary sequential ramp; skill levels are never red→green.

---

## 9. Empty States

Empty states are narrative moments, not apologies. Each answers: *what does this emptiness mean, and what does it invite?*

| Surface | State | Treatment |
|---|---|---|
| Candidate, no analysis yet | The report doesn't exist | The report *cover renders anyway* — name, then in place of findings: "This report hasn't been written yet. It will be built from your actual work — nothing else." One action: Connect GitHub. The empty state *is* the pitch. |
| Analysis complete, no assessable evidence | Honest thinness | "We read 3 repositories and found too little verifiable evidence to assess confidently. Here is exactly what we saw —" followed by the real (small) evidence record. Never pad, never apologize twice. |
| Recruiter roster, no visible candidates | Consent explains it | "Candidates appear when they complete analysis *and choose* to be visible to recruiters." The empty roster teaches the consent model — our differentiator — instead of looking broken. |
| A skill with thin evidence | Caveat, not absence | The skill renders with its `preliminary` confidence and a CaveatNote ("grounded in 2 evidence items from 1 repository") — thin evidence is shown as thin, never hidden and never inflated. |
| Notes, timeline gaps, filters with no matches | One quiet sentence each | Muted ink, body type, no illustration, no mascot. Emptiness in a due-diligence document is information. |

---

## 10. Loading Experience

Two kinds of waiting, two treatments — and never an indeterminate spinner where stages are knowable:

1. **The long wait (analysis)** is the Analysis Experience (§6): staged, truthful, narrative, safe to leave. Progress honesty is already product law; the flagship makes it *the* memorable moment. Requires the pipeline to persist stage-level progress (see §16 prerequisites).
2. **Every other wait** is a document-shaped skeleton: the report skeleton has a cover, chapter heads, and findings-width lines — so the page loads *as itself*, with zero layout shift on arrival. Sub-300 ms transitions get no loading state at all; flashing skeletons for fast responses is noise.

---

## 11. Trust Framework

Trust is not a section of the product; it is the product. Five structural guarantees, each visible to the reader:

1. **Provenance is ambient.** The ProvenanceLine (X repositories · Y evidence items · assessed date) appears on the report cover, on every chapter that makes claims, and on every roster row. No reader is ever more than one glance from "based on what?"
2. **Nothing un-cited.** Every claim is a Finding with CitationChips, structurally (§5 — there is no component for an un-cited claim). "No generic AI summaries" is enforced by the component system, not editorial discipline.
3. **Confidence is always priced in.** Levels are `high / moderate / preliminary`, always visible, always accompanied by the plain-language rule that produced them (evidence volume caps confidence, regardless of model enthusiasm). Underclaiming is brand-correct; overclaiming is a defect.
4. **The Methodology chapter is load-bearing.** Pipeline version, prompt version, model, date, evidence counts, and the confidence methodology close every report — the same information a skeptical reader would demand of any due-diligence document. "Learn how this was generated" always lands here.
5. **Symmetry.** Candidates see the recruiter view of themselves, verbatim. The product never says one thing to the subject and another to the reader — and states so.

And one guarantee about links: **no dead links, ever.** Evidence URLs are verified at ingestion and re-verified opportunistically; an evidence item whose source has vanished (repo deleted, force-pushed away) renders in an explicit *archived* state — record retained, marked "source no longer reachable, captured [date]" — rather than as a link that 404s. A dead link in a trust product is a small lie.

---

## 12. Evidence Framework

The Evidence Record (Chapter 3) is the hero because it is the only chapter that contains *no interpretation at all* — the reader's chance to audit us.

**Anatomy of one evidence record (full/EXPAND view):**

```
┌──────────────────────────────────────────────────────────────────┐
│ COMMIT   credence-web @ a3f9c21                    Mar 14, 2026  │   mono, record header
│ "Add table-driven tests for order state transitions"             │   the item's own title
│ +214 −38 · 6 files                                               │   diff shape (stats now; excerpt later — §16)
│                                                                  │
│ Grounds: Testing (1 of 4 citations) · Code Quality (1 of 9)      │   ← which findings cite THIS item
│ Timeline: month 14 of 22 · during the Go service's test ramp     │   position in the growth story
│                                                                  │
│ View on GitHub ↗                                                 │   one click to source of truth
└──────────────────────────────────────────────────────────────────┘
```

- **"Why it matters" is a back-reference, not new prose.** An evidence item matters because assessments cite it; the record shows *which* findings cite it and links back up the ladder. No new AI text is generated per evidence item — that would put interpretation inside the one interpretation-free chapter.
- **Navigation:** filter by kind, repository, skill (via citations), and time; keyboard traversal (j/k); every view is a real URL. A citation chip anywhere in the report deep-links to the item *in context*, explorer state intact.
- **Diff preview** (the stats today; a bounded excerpt once the pipeline captures patches — §16) renders mono, read-only, with the same "captured at analysis time" honesty as everything else.

---

## 13. AI Explanation Framework

Three layers, strictly ordered, visually distinct:

```
1  FINDING     sans, ink        "Every observed PR was merged with at least one review."
               falsifiable, cited (chips), evidence-derived
2  GROUNDING   mono, records    the cited evidence, expandable in place
3  REASONING   violet-marked    the model's connective prose — always inside AiContentMarker,
               collapsed        always below its grounding, always versioned (prompt/model/pipeline)
```

Rules:

- **AI never gets the first word.** Reasoning is available, labeled, and *below* the evidence it interprets — collapsed by default at every altitude. A reader who never expands an AI section still gets the complete factual report.
- **Observations, never verdicts.** Language rules from the brand carry into structure: the model describes evidence ("table-driven tests cover multiple state transitions"), never character ("is a diligent engineer"). Prompts already enforce this; the display frames it.
- **On "Risk flags" (challenged):** this design deliberately renames and reframes them as **CaveatNotes** — statements about *evidence limitations* ("grounded in one repository", "no activity in this skill for 9 months", "commit share unavailable"), typeset neutrally, never red. Product law forbids rendering any assessment of a person in `alert` color, and "risk" language converts an evidence gap into a character verdict — precisely the overclaiming this brand exists to replace. Integrity flags (suspected gaming, cloned work) are the one true `alert` case and remain so — they are claims about *evidence authenticity*, not about the person's ability.
- **On "Score" (challenged):** the handbook is explicit — a bare number in an assessment is a rejection, and the domain word is *assessment*, not score. The flagship keeps `strong / developing / not_yet_assessed` + confidence + evidence count + trend as the complete "score object." A 0–100 number would be the single fastest way to make this product look like every resume-screener we exist to replace. If a future ranking-adjacent need appears, it must arrive with its own evidence-grounding design — not as a numeral on this report.

---

## 14. Recruiter Workflow

Built like Linear: keyboard-first, list-to-detail, zero ceremony.

- **Roster:** `/` focuses search, `j/k` moves, `Enter` opens the report, `s` toggles shortlist, `1–4` sets status — all without leaving the list. Search matches names and assessed capabilities ("go testing", "react"). Sort: freshness or name. **No ranking, no composite ordering, ever** — the roster's refusal to pre-judge is a stated feature, visible in the UI copy.
- **Report, recruiter view:** the identical document + the Decision Rail — status, shortlist, notes (markdown, private) floating at the right edge, sticky, never occluding the document. Notes autosave. The rail is the only recruiter-specific chrome in the product.
- **Decision support ≠ recommendation.** The product's support is: the 60-second contract, the ladder to proof, the caveats stated plainly, and the recruiter's own accumulated notes/status. Credence never says "hire" — it makes the recruiter's *own* judgment fast and defensible. That restraint is the sales pitch to candidates and the legal/ethical spine of the company.
- **Session shape:** a recruiter reviewing 10 candidates should be able to do it start-to-finish from the keyboard in under 15 minutes, leaving with statuses set, 2–3 shortlisted, and notes they could read back to a hiring manager verbatim.

---

## 15. Candidate Workflow

The candidate's arc is *ownership of a professional artifact*, in four acts:

1. **Consent as the opening scene, not a checkbox.** Connect & Select puts "we read only what you choose" beside the action itself. Selection is granular, revocation is promised in the same breath, and the default selection is conservative (own, non-fork, active).
2. **The analysis as earned anticipation.** The Analysis Experience shows their work being *taken seriously* — named repos, real counts, honest stages. This is where the product's rigor becomes emotionally legible.
3. **The report as a possession.** The reveal moment, then a still, premium document with their name on the cover — something a student would *want* to send. Every caveat visible to them is visible to recruiters and vice versa (§11 symmetry), so the report is theirs to stand behind, not ours to spin.
4. **The rail as ongoing agency.** Visibility toggle (the ConsentSurface — deny-by-default, one switch, plain consequences stated), who-viewed history (the audit trail as a feature), and re-run analysis when their work has grown. Growth framing throughout: `developing` is a trajectory, `not_yet_assessed` is an invitation — never a verdict (Brand: momentum).

---

## 16. Design Rationale — and what this design honestly requires

### Why this shape

- **One artifact, two audiences** resolves every IA question by subordinating it: does this help produce, read, or govern the report? If none, it doesn't exist. That is how seven screens replace eleven.
- **The document beats the dashboard** because Credence's job is *argumentation*, not monitoring. Dashboards optimize for glancing at changing state; due-diligence documents optimize for building justified belief. Our reader is making a career-affecting judgment — the form should match the stakes.
- **The ladder beats tabs/pages** because trust is built by *descent toward source*, and the interaction model should be the trust model. Every existing pattern that navigates away from context (separate evidence page states, per-section pages) is replaced by expansion in place.
- **Restraint is the luxury.** Linear, Stripe, and Apple feel premium through subtraction: two typefaces, near-monochrome, motion twice, generous whitespace, perfect alignment. Nothing on this design's surface is decorative — which is also exactly how evidence behaves.

### Deliberate pushbacks on the brief (flagged, not silently absorbed)

1. **"Score" → assessment + confidence + trend** (§13). Bare numerals are product-law rejections and strategically self-defeating.
2. **"Risk flags" → CaveatNotes + integrity flags** (§13). Evidence limitations are stated plainly; red never touches a person's assessment.
3. **"Engineering DNA" archetypes ship only when evidence-derivable.** Labels like *Builder / Maintainer / Optimizer* are seductive and dangerously horoscope-adjacent. The flagship version derives working-style *observations* from measurable behavior (initiation vs. maintenance commit ratio, review participation, docs/test co-change patterns, refactor cadence, repo-spanning consistency) and presents them as cited findings — "62 % of commits extend existing systems rather than initiate new ones (214 records)" — with an archetype *word* used only as a chapter framing, never as an un-cited personality claim. If the pipeline cannot ground it, the chapter waits. Un-grounded DNA would violate the product's one law on its most memorable page.

### Data & pipeline prerequisites (design is ready; these are not)

| Flagship element | Requires |
|---|---|
| Analysis Experience (live stages) | Pipeline persists per-stage, per-repo progress events (partially exists via statuses/errors; needs stage granularity) |
| Diff previews in Evidence Records | Ingestion captures bounded patch excerpts (size-capped, private-repo consent implications reviewed) |
| No-dead-links guarantee | Link liveness verification at ingestion + re-check job + `archived` state in the evidence schema |
| Growth Timeline (skill-level trends) | Time-bucketed evidence→skill aggregation (first-observed dates exist; per-skill trend series is new) |
| Repository Intelligence (architecture/complexity/maintenance) | New derived metrics from existing evidence (commit cadence, file-type mix, co-change patterns); *complexity* claims only if computable honestly — otherwise omitted |
| Engineering DNA | The behavioral aggregations above, computed over the full evidence record |
| Who-viewed (candidate rail) | Exists (`view_events`) — needs its candidate-facing read surface |
| Contact flow (recruiter rail) | Exists in schema (`contact_requests`) — needs its consent-gated UX |

Nothing in this document is implemented, staged, or committed. It is the argument for what to build next.
