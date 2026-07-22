# Credence AI — MVP Product Requirements Document (PRD)

**Document type:** Product Requirements Document — Version 1 (MVP)
**Product:** Credence AI — Evidence-Based Talent Intelligence Platform
**Version:** 1.0 · July 2026
**Owner:** Founding Product Manager
**Status:** Approved for implementation
**Companion documents:** [01-product-definition-document.md](01-product-definition-document.md) · [02-brand-guidelines.md](02-brand-guidelines.md) · [CLAUDE.md](../CLAUDE.md) (engineering handbook)

---

## 1. Executive Summary

Credence AI MVP is a two-sided platform that converts a student's real engineering work into a **verified, evidence-based credibility profile**, and lets recruiters discover and evaluate candidates on demonstrated capability rather than resumes.

**V1 builds exactly one vertical, deep:** early-career **full-stack/backend software engineering**. A student connects GitHub, uploads a resume, and selects a target role. The system analyzes their repositories, conducts one AI interview grounded in their own code, and produces a Credibility Report — skill assessments with linked evidence, confidence levels, and prioritized improvement recommendations. The student controls visibility via explicit consent and receives a shareable profile link usable in any application today. Recruiters search opted-in candidates by demonstrated capability, review evidence-backed summaries with drill-down to raw evidence, shortlist, and send consent-gated contact requests.

The MVP exists to validate one thing: **that an evidence-based profile changes screening decisions** — students find it valuable enough to complete and share; recruiters shortlist differently and better because of it.

Everything else — additional role families, multiple interview formats, job postings, ATS integration, messaging, leaderboards — is explicitly out of scope (§19).

## 2. Product Goal

Prove, with a concentrated cohort of students and 3–5 design-partner companies, that Credence AI's core mechanism works end-to-end:

> Real work in → verified, explainable assessment out → different (and better) hiring decisions.

Concretely, V1 must deliver:

1. A student can go from sign-up to a complete, shareable Credibility Report in a single session (plus asynchronous analysis time), with genuine standalone value even if no recruiter ever views it.
2. A recruiter can run a real opening through Credence: search by capability, review evidence, shortlist, and request contact — and afterwards state (and demonstrate) that the profiles changed their shortlist.
3. Every assessment shown to any user is explainable: evidence-linked, confidence-labeled, and contestable.

## 3. MVP Hypothesis

**Primary hypothesis:** An AI-generated, evidence-based credibility profile changes screening behavior. Recruiters shown Credence profiles will shortlist different candidates than they would from resumes alone, and those candidates will pass technical interviews at a higher rate than the recruiter's traditional pipeline.

**Supporting hypotheses:**

- **H1 (Student value):** Students will complete a non-trivial onboarding (GitHub connect + resume + AI interview) because the resulting report and improvement guidance are worth the effort.
- **H2 (Student trust):** Students will voluntarily share their profile link in real applications — the strongest evidence they believe it helps them.
- **H3 (Recruiter efficiency):** Evidence-backed summaries reduce recruiter screening time per qualified candidate versus resume review.
- **H4 (Signal quality):** Interviews grounded in the candidate's own repositories are materially harder to game than generic assessments, and recruiters perceive them as more credible.

Each hypothesis maps to metrics in §4. If the primary hypothesis fails after a fair test (instrumented, with engaged design partners), the product thesis — not the execution — must be revisited before further build-out.

## 4. Success Criteria

Measured over the MVP evaluation window (first 90 days post-launch with design partners).

### Student-side (activation & value)
| Metric | Definition | Target |
|---|---|---|
| Onboarding completion | Sign-up → report generated | ≥ 60% |
| Interview completion | Onboarded students completing the AI interview | ≥ 40% |
| Profile share rate | Students who use their share link at least once | ≥ 30% |
| Improvement engagement | Students acting on ≥ 1 recommendation within 30 days (new evidence added or recommendation marked addressed) | ≥ 25% |
| Student NPS | Segmented by profile strength — must be positive even in the bottom assessment tercile | > 0 in all terciles |

### Recruiter-side (adoption & efficacy)
| Metric | Definition | Target |
|---|---|---|
| Design-partner activation | Companies running ≥ 1 real opening through Credence | ≥ 3 |
| Shortlist adoption | Credence-surfaced candidates advanced to interview by recruiters | ≥ 20% of shortlists |
| Signal quality (primary) | Interview pass-rate of Credence-shortlisted candidates vs. partner's traditional pipeline | Measurably higher (partner-reported, then instrumented) |
| Repeat usage | Recruiters returning for a second opening | ≥ 2 of the design partners |

### Trust & integrity (guardrails — failing these fails the MVP regardless of growth)
| Metric | Definition | Target |
|---|---|---|
| Assessment dispute rate | Assessments contested by students | < 10%, with 100% receiving a response |
| Integrity false-positive rate | Integrity flags overturned on review | < 20% of flags |
| Consent violations | Any candidate data shown to a recruiter without valid consent | **Zero. One incident is a stop-ship.** |
| Explainability completeness | Assessments rendered anywhere without evidence link + confidence | **Zero** (enforced structurally; monitored anyway) |

## 5. Target Users

**V1 users (both required for the marketplace test):**

1. **Students / early-career engineers** — final-year students, recent graduates, bootcamp grads, self-taught developers (0–2 years experience) targeting full-stack/backend roles. Initial cohort: concentrated recruitment through partner campuses/communities in one region, deliberately seeded with visibly strong builders (adverse-selection mitigation, PDD risk §3).
2. **Recruiters & hiring managers at design-partner companies** — 3–5 startups/SMBs (50–500 employees) with active early-career engineering openings, recruited before public launch. Each partner gets a recruiter workspace with named seats; hiring managers get read access to candidate summaries.

**Not in V1:** universities/placement cells, staffing agencies, enterprise recruiting teams, experienced-hire candidates, non-engineering roles.

## 6. User Personas (summarized from the PDD)

| Persona | Who | Core need V1 must serve |
|---|---|---|
| **Aarav** — the Under-Credentialed Builder | Tier-3 college final-year CS student, 7.4 CGPA, three real projects, one deployed | Be evaluated on his work, not his college; know exactly what to fix; a credible link he can attach to any application |
| **Meera** — the Startup Technical Recruiter | Sole recruiter, 300+ applications per junior opening, can't evaluate code | A ranked, evidence-backed shortlist she can produce in minutes and defend to her hiring managers |
| **Rohan** — the Engineering Hiring Manager | EM who makes the final call and distrusts resumes | A one-page evidence summary per candidate that tells him what to probe in the interview |
| **Priya** — the Strong Candidate (adverse-selection check) | Top-tier student who doesn't need Credence to get interviews | Differentiation value: benchmark positioning and a profile that makes her *more* impressive — V1 must never feel remedial |

## 7. User Stories

### Student
- **S1.** As a student, I can sign up with my GitHub account so my identity is anchored to my actual work.
- **S2.** As a student, I can connect my repositories and upload my resume so Credence has my evidence.
- **S3.** As a student, I can select my target role (Backend / Full-Stack, early career) so assessments are benchmarked against something concrete.
- **S4.** As a student, I can see honest, staged progress while my repositories are analyzed so I trust the process.
- **S5.** As a student, I can take an asynchronous AI interview about *my own projects* so I can demonstrate reasoning that a resume can't show.
- **S6.** As a student, I can view my Credibility Report — every assessment with its evidence, confidence level, and plain-language reasoning — so I understand exactly where I stand and why.
- **S7.** As a student, I can see my top prioritized improvement recommendations so I know the highest-impact next steps for my target role.
- **S8.** As a student, I can control exactly who sees my profile (private by default; opt in to recruiter search; grant/revoke per-recruiter access) so I stay in control of my data.
- **S9.** As a student, I can generate a shareable profile link and revoke it at any time so I get value in any application today.
- **S10.** As a student, I can see who viewed my profile so visibility is transparent.
- **S11.** As a student, I can question any assessment so judgments about me are contestable.
- **S12.** As a student, I can accept or decline a recruiter's contact request with no penalty so contact is always my choice.
- **S13.** As a student, I can trigger re-analysis after improving my evidence so my report reflects my trajectory.
- **S14.** As a student, I can delete my account and data so my participation is fully reversible.

### Recruiter
- **R1.** As a recruiter, I can join my company's workspace via invitation so access is controlled.
- **R2.** As a recruiter, I can search opted-in candidates by demonstrated skills, evidence strength, and role readiness so I screen on capability, not keywords.
- **R3.** As a recruiter, I can view an evidence-backed candidate summary — strongest evidence, verified skills, interview highlights, flagged gaps — so I can evaluate in minutes.
- **R4.** As a recruiter, I can drill down from any claim to the raw evidence (repository, commit history, interview transcript excerpt) so I can verify rather than trust blindly.
- **R5.** As a recruiter, I can add candidates to a shortlist for an opening and compare them side by side so I can build a defensible slate.
- **R6.** As a recruiter, I can send a contact request that the candidate must accept before any identity/contact details are exchanged, so outreach is consent-gated.
- **R7.** As a recruiter, I can see integrity notes (e.g., tutorial-clone exclusions) presented factually so I get honest signal without character judgments.
- **R8.** As a hiring manager, I can open a candidate's summary before an interview and see what to probe.

### Platform/Admin
- **A1.** As an operator, I can review disputed assessments and integrity flags so contestability is real.
- **A2.** As an operator, I can view pipeline health (analysis queue, failure rates, AI spend) so the system is operable.

## 8. End-to-End User Flows

### Flow A — Student: sign-up → shareable report
1. Landing page → **Sign up with GitHub** (OAuth; minimal read scopes; scopes explained in plain language before redirect).
2. Onboarding wizard: (a) confirm repositories to include (default: public repos; each repo individually toggleable); (b) upload resume (PDF/DOCX); (c) select target role — `Backend Engineer — Early Career` or `Full-Stack Engineer — Early Career`; (d) consent screen — analysis consent (required to proceed) and visibility choice (default **Private**), presented without nudging.
3. Analysis begins asynchronously. Student sees staged, truthful progress ("Analyzing repository 3 of 7 — code structure and commit history · ~2 min remaining"). Student may leave; email notifies on completion.
4. Preliminary report available (GitHub + resume evidence only; interview-dependent assessments shown as *Not yet assessed*). Interview invitation presented: "Your report is preliminary. A 25–35 minute interview about your own projects gives it a firmer basis."
5. Student takes AI interview (Flow B) — skippable, resumable.
6. Full Credibility Report generated: skill assessments (evidence + confidence + reasoning), role-readiness view, top 3–5 improvement recommendations.
7. Student optionally: sets visibility to *Searchable*; generates share link; shares it anywhere.

### Flow B — Student: AI interview
1. Pre-interview screen: format, duration (25–35 min), what is assessed, that a transcript will be produced and who can see it, accessibility accommodations (pausing, extended time, text-based mode), and integrity notice. Explicit start confirmation.
2. Interview: text-based conversational session. Questions are generated from the student's own repositories (project deep-dive: design decisions, trade-offs, debugging narrative, "what would break if…"). One question at a time; streaming responses; visible progress (question k of ~n).
3. Student may pause (resumable within 7 days) or abandon (partial transcript stored; interview marked incomplete; no assessment produced from incomplete interviews).
4. On completion: transcript saved verbatim; asynchronous evaluation job assesses reasoning quality, communication, and depth — each finding tied to transcript excerpts.
5. Report updates; student notified; interview-derived assessments now carry their evidence (transcript excerpts) and confidence.

### Flow C — Recruiter: search → shortlist → contact
1. Recruiter accepts workspace invitation (email magic-link auth) → lands on search.
2. Sets criteria: role family, skills (from the fixed V1 taxonomy), minimum confidence, evidence characteristics (e.g., "has deployed project," "interview completed").
3. Results: ranked candidate cards — each showing top verified skills (with confidence), strongest evidence one-liner, readiness indicator, and the *reason for the ranking* inline. Only candidates with `Searchable` visibility appear; identity is partially anonymized (no name/photo/contact — handle + evidence only) until contact is accepted.
4. Opens candidate summary (Flow D). Adds to a named shortlist for an opening. Compares shortlisted candidates side by side.
5. Sends contact request with role context (company size, role family, required note). Candidate is notified, sees the request + role context + what will be shared on acceptance, and accepts or declines. On acceptance both parties see contact details; on decline the recruiter sees only "declined" with no further detail.

### Flow D — Recruiter: candidate evidence review
1. Summary page: capability overview (skill assessments with confidence), strongest evidence highlights, interview highlights (assessed excerpts), gaps stated factually, integrity notes if any.
2. Every claim supports one-click drill-down: skill assessment → contributing evidence items → the underlying artifact (repo link, commit metadata, transcript excerpt in monospace).
3. Interview-prep brief: auto-generated "what to probe" section derived from moderate/preliminary-confidence areas and stated gaps.
4. Export/print view carries evidence context and confidence within the exported frame (no bare-number exports).

### Flow E — Consent lifecycle (cross-cutting)
1. Default state: profile **Private** — visible to the student only.
2. Student may switch to **Searchable** (appears in recruiter search, partially anonymized) at any time; switch back at any time.
3. Share link: student-generated, revocable, regenerable; renders the report read-only to anyone with the link; view events logged and shown to the student.
4. Revocation (visibility off, link revoked, or contact-acceptance withdrawn) takes effect **synchronously**: the next read anywhere returns nothing. Existing recruiter shortlist entries render as "no longer available."
5. Account deletion: identity-verified request → grace period (7 days, cancelable) → hard delete of personal data; audit log retains only anonymized consent-event records required for compliance.

### Flow F — Student: dispute an assessment
1. "Question this assessment" on every assessment surface → structured form (which assessment, what's wrong, optional evidence).
2. Dispute acknowledged immediately with expected response time; assessment visibly marked "Under review" everywhere it renders (including to recruiters).
3. Operator reviews (A1): outcome = upheld (with improved explanation), revised (new assessment version supersedes; history retained), or evidence-added (student pointed to new evidence → re-analysis).
4. Student notified with a plain-language explanation of the outcome.

## 9. Functional Requirements

Notation: **FR-x.y**. MoSCoW priority marked [M]ust / [S]hould. All Must requirements gate launch.

---

### FR-1: Accounts, Identity & Auth

**Purpose:** Anchor student identity to GitHub; control recruiter access via workspace invitations.

**Inputs:** GitHub OAuth grant (students); invitation token + email (recruiters); session credentials.
**Outputs:** Authenticated sessions; user records with role (`student` | `recruiter` | `admin`); workspace membership.

**Business rules:**
1. [M] Students authenticate exclusively via GitHub OAuth; requested scopes are the minimum for public-repo read + email; scopes are explained in product language before redirect.
2. [M] Private-repo scope is a separate, optional, per-student escalation with its own consent screen; never requested by default.
3. [M] Recruiters join only via workspace invitation issued by an operator (design-partner model); email magic-link auth; invitations expire in 7 days and are single-use.
4. [M] One student account per GitHub identity; re-signup after deletion creates a fresh account with no inherited data.
5. [M] All roles: session expiry, secure cookie policy, and sign-out per the engineering handbook §18.
6. [S] Recruiters may hold seats in only one workspace in V1.

**Acceptance criteria:**
- Student completes GitHub sign-up in ≤ 3 screens; declining the OAuth grant returns to landing with a clear, calm explanation.
- Recruiter with an expired or reused invitation sees a specific error and a path to request a new one.
- No route or API serves any authenticated resource without a valid session (verified by integration tests, §CLAUDE.md 22.2).

---

### FR-2: Evidence Ingestion (GitHub + Resume + Role Selection)

**Purpose:** Collect and normalize the raw evidence corpus for one student.

**Inputs:** GitHub identity; per-repo inclusion toggles; resume file (PDF or DOCX, ≤ 10 MB); target role selection.
**Outputs:** Persisted `evidence_items` (repositories, resume-derived items) with provenance metadata; ingestion status per item.

**Business rules:**
1. [M] Repos listed with sensible defaults: public, non-fork, non-archived repos pre-selected; forks and archived repos visible but deselected with the reason shown ("Fork — excluded from originality analysis by default").
2. [M] The student explicitly confirms the inclusion set; nothing is analyzed without confirmation (analysis consent, FR-8).
3. [M] Resume parsing extracts: claimed skills, education, projects, experience entries — stored as *claims* (unverified) clearly distinct in the data model from *evidence* (verified artifacts). Resume claims are used for cross-referencing (does evidence support the claim?) and never directly produce assessments.
4. [M] Resume upload is optional to proceed (GitHub-only onboarding allowed); its absence is reflected as reduced cross-validation, not a penalty.
5. [M] Target role is one of exactly two V1 options: `backend-early-career`, `fullstack-early-career`. Role selection determines the benchmark rubric used everywhere downstream.
6. [M] Unsupported/corrupt/oversized resume files produce a specific, actionable error; the wizard continues without the resume.
7. [S] Student may add/remove repos and re-upload resume later, triggering re-analysis (FR-13).
8. Portfolio/deployed-app URLs: [S] a single optional "deployed project URL" field per repo; V1 verifies reachability (HTTP 200) only and records it as a `deployed` evidence attribute — no content analysis.

**Acceptance criteria:**
- A student with 30 repos can complete selection in under 2 minutes; toggles persist.
- Resume claims never appear anywhere labeled as verified; UI copy labels them "from your resume (unverified)."
- Ingestion failures per item are independent — one bad repo never blocks the rest (partial-failure honesty, handbook §19.5).

---

### FR-3: GitHub & Project Analysis Pipeline

**Purpose:** The core evaluation engine — convert repositories into per-repo intelligence and per-skill signals.

**Inputs:** Confirmed repo set; repo contents/metadata via GitHub API (code, commit history, languages, CI/test presence, README); role rubric.
**Outputs:** Per-repo analysis records (originality classification, code-quality signals, architecture signals, contribution-consistency signals, tech-depth signals) each carrying evidence pointers (files/commits/metrics), `pipeline_version`, `model_id`, `prompt_version`; aggregated per-skill signal inputs for FR-5.

**Business rules:**
1. [M] Analysis runs asynchronously as idempotent, resumable jobs (handbook §14); per-repo progress is persisted and rendered truthfully (stage + repo k of n + estimate).
2. [M] **Originality classification** per repo: `independent` | `tutorial-derived` | `fork-contribution` | `insufficient-signal`, with the reasoning stored. Tutorial-derived and fork repos are excluded from originality-weighted signals but still shown (transparency over silent omission).
3. [M] Signals assessed per repo (V1 fixed set): code structure & readability; testing presence & depth; API/data-model design (role-relevant); deployment/operability signals; commit-history consistency (cadence, message quality, incremental development vs. bulk-dump).
4. [M] Every signal stores: value, the specific evidence refs that produced it (file paths, commit ranges, metrics), plain-language reasoning, and a per-signal confidence.
5. [M] **Insufficient evidence produces `Not yet assessed`, never a low score.** Thin repos lower confidence, not the assessment value.
6. [M] Fairness constraint (handbook §17.10): analysis inputs exclude the student's name, institution, photo, and any demographic signal; repository author identity is pseudonymized before model calls.
7. [M] Analysis of a typical profile (≤ 10 repos, ≤ 50 MB total considered content) completes within 15 minutes; per-repo size caps and file-type filters (source files only; vendored/generated/lockfile content excluded) are enforced and documented.
8. [M] Rate-limit-aware GitHub API usage with backoff; a rate-limited analysis pauses and resumes rather than failing.
9. [S] Bulk-dump detection: a repo whose history is 1–3 giant commits is flagged `limited-history` — reflected in confidence and integrity notes, not as an accusation.

**Acceptance criteria:**
- Given the golden test dataset (§11.6), originality classification achieves the agreed precision threshold against human labels before launch.
- Re-running analysis on unchanged inputs yields identical persisted results (idempotency).
- No analysis record exists in the database without non-empty evidence refs and reasoning (schema-enforced; verified by integrity-check job).
- A repo that fails analysis shows a specific status ("couldn't analyze — repository too large") and the profile completes without it.

---

### FR-4: AI Interview (Grounded Project Deep-Dive)

**Purpose:** Cross-validate evidence and assess reasoning/communication via an interview about the candidate's own work — the primary anti-gaming mechanism.

**Inputs:** Completed repo analysis (interview requires ≥ 1 analyzable repo); the student's strongest 1–2 independent repos (auto-selected, student may override); role rubric.
**Outputs:** Verbatim transcript (persisted, immutable); interview-derived assessments (reasoning quality, communication, technical depth) each linked to transcript excerpts; interview integrity signals.

**Business rules:**
1. [M] Format: text-based, conversational, 8–12 questions, 25–35 minutes nominal. One active interview per student at a time; retake allowed after 30 days or after material new evidence (whichever first).
2. [M] Question generation is grounded: ≥ 80% of questions must reference specific artifacts from the student's selected repos (a file, a design decision, a commit, an architectural choice). Generic algorithm/trivia questions are prohibited by prompt contract and validated by the eval suite.
3. [M] Interview mechanics: one question at a time; streamed responses; per-question soft time guidance but **no hard per-question timer** (we are not a proctored exam — PDD exclusion §8); overall session expires after 90 minutes of inactivity with resume available for 7 days.
4. [M] Accessibility accommodations (handbook §13.8): pause/resume, extended-time mode, and the entire interview is text-based in V1 (no audio/video recording — deliberate privacy and scope decision).
5. [M] Pre-interview disclosure covers: purpose, duration, transcript storage and who can see it (the student always; recruiters only per visibility settings), assessment scope, and accommodation options. Explicit start consent recorded.
6. [M] Evaluation is asynchronous post-completion: each finding must quote its supporting transcript excerpt(s); findings without excerpt support fail validation and are not persisted.
7. [M] Interview integrity checks (V1 set): response-latency anomalies, paste-pattern heuristics, and consistency between interview claims and repository evidence. Anomalies produce internal integrity signals for the report (FR-6), phrased factually — never "cheating detected."
8. [M] Incomplete interviews produce no assessments; the report shows interview-dependent areas as `Not yet assessed` with the invitation to complete.
9. [S] Student may flag any question as unclear/unanswerable; flagged questions are excluded from evaluation and logged for prompt improvement.

**Acceptance criteria:**
- Eval suite verifies grounding ratio ≥ 80% and zero generic-trivia questions across the golden dataset.
- A paused interview resumes at the same question with prior answers intact.
- Transcript rendered to any user is verbatim and displayed in the evidence (monospace) style; interpretation is visually separate (brand §8).
- Extended-time mode produces no difference in how assessments are computed or labeled.

---

### FR-5: Credibility Report & Skill Assessment

**Purpose:** The defining product surface — synthesize all evidence into explainable skill assessments and role readiness.

**Inputs:** Repo analysis outputs (FR-3); interview evaluation outputs (FR-4); resume claims (FR-2, cross-reference only); role rubric.
**Outputs:** The Credibility Report: per-skill assessments, role-readiness view, evidence map, and versioned report record.

**Business rules:**
1. [M] **V1 skill taxonomy is fixed** (single source of truth in config): ~12–16 skills relevant to the two role rubrics (e.g., API design, data modeling, testing, debugging & problem-solving, code quality & readability, system reasoning, deployment/operability, version-control practice, communication of technical reasoning). No free-form skills in V1.
2. [M] Each skill assessment consists of, inseparably: **assessment level** (`strong` | `developing` | `not-yet-assessed` — three levels only in V1; no numeric scores, no decimals, per brand §16.3), **confidence** (`high` | `moderate` | `preliminary`, each with its plain-language basis), **evidence refs** (≥ 1 for any assessed skill), and **reasoning** (1–3 sentences, plain language, evidence-descriptive — never character-descriptive).
3. [M] Confidence derivation is rule-based and documented: e.g., `high` requires ≥ 2 independent evidence sources (repo + interview, or 2+ independent repos); single-source assessments cap at `moderate`; thin/ambiguous evidence yields `preliminary`.
4. [M] **Role readiness** is presented as a qualitative narrative against the role rubric ("ready to interview for…", "strongest areas…", "the gap that matters most…") — explicitly not a single number or rank.
5. [M] Resume cross-reference: where resume claims are supported by evidence, the skill shows "claim verified"; unsupported claims are simply not elevated (no "caught lying" framing — absence of evidence is displayed as not yet assessed).
6. [M] Reports are versioned append-only (handbook §15.3); a re-analysis produces a new version; the student sees "what changed" between versions; share links always render the latest version.
7. [M] The student sees exactly what a recruiter sees about them (transparency symmetry, brand §16.6) — implemented as one rendering component with audience-appropriate framing (student view leads with trajectory/next steps; recruiter view leads with current standing; identical underlying data).
8. [M] Student-facing report leads with strengths and direction; gap language follows brand §17 patterns exactly (concrete, forward-looking, never "poor/weak/failed").

**Acceptance criteria:**
- It is impossible (schema + component contract) to render or persist an assessed skill without evidence refs, confidence, and reasoning.
- No numeric score appears anywhere in the product or exports.
- Report renders meaningfully in all evidence states: GitHub-only, GitHub+resume, GitHub+interview, all sources.
- Version history shows a diff summary after re-analysis.

---

### FR-6: Integrity & Anti-Gaming Layer

**Purpose:** Protect signal quality; keep the report honest without humiliating anyone.

**Inputs:** Repo analysis signals (originality, history patterns); interview integrity signals; cross-source consistency checks.
**Outputs:** Integrity notes attached to specific evidence items (never to the person); confidence adjustments; internal review queue entries.

**Business rules:**
1. [M] V1 detections: tutorial/fork derivation (FR-3.2), bulk-dump history (FR-3.9), interview-response anomalies (FR-4.7), and interview↔repo inconsistency (claims in interview contradicted by the codebase).
2. [M] Integrity findings are expressed as **facts about evidence with consequences for confidence** — e.g., "This project closely matches a public tutorial and is excluded from originality-weighted assessment" — never as verdicts about the person (brand §17 integrity pattern is the required copy model).
3. [M] Every integrity note is visible to the student *before* any recruiter can see it (student is notified on flag creation), and carries the dispute affordance (FR-12).
4. [M] High-severity anomalies (strong evidence of outsourced interview) route to human review (A1) before any effect is shown to recruiters; the automated system alone never brands anyone.
5. [M] False-positive tracking: every flag records its eventual disposition; the FP rate is a guardrail metric (§4).

**Acceptance criteria:**
- No integrity-related copy anywhere uses accusatory vocabulary (reviewed against a banned-word list in the copy linter/review checklist).
- A flagged-then-cleared evidence item returns to full standing everywhere within one render cycle.
- Recruiters never see an integrity note that the student hasn't been shown first.

---### FR-7: Improvement Recommendations

**Purpose:** Every assessment ships with a path to improve it (product principle 4) — the student-side standalone value.

**Inputs:** Skill assessments + confidence levels; role rubric gap analysis; evidence inventory.
**Outputs:** 3–5 prioritized recommendations, each: the gap it addresses, the concrete action, why it matters for the target role, and which report area it would strengthen.

**Business rules:**
1. [M] Recommendations are concrete and evidence-anchored ("Add an automated test suite to `<their deployed repo>` — testing is currently your biggest gap for backend roles and none of your projects include tests"), never generic ("improve your skills").
2. [M] Prioritization is impact-based against the role rubric: gaps blocking readiness first, confidence-raising actions second, polish last.
3. [M] Each recommendation states which evidence would change which assessment — closing the loop with FR-13 re-analysis.
4. [M] Students can mark a recommendation "addressed," which prompts (but never auto-triggers) re-analysis.
5. [S] Recommendation quality is part of the eval suite (relevance and concreteness rubrics).

**Acceptance criteria:**
- Every generated recommendation names a specific artifact or specific missing evidence.
- After re-analysis that closes a gap, the recommendation is retired and the change is reflected in the "what changed" view.

---

### FR-8: Consent, Visibility & Share Links

**Purpose:** Students control what is analyzed and who sees what — the trust foundation; deny-by-default everywhere.

**Inputs:** Student consent actions; visibility toggles; share-link operations; recruiter access attempts.
**Outputs:** Consent state (append-only audit records); enforced access decisions; view logs.

**Business rules:**
1. [M] Two consent objects, separately recorded: **analysis consent** (required to run the pipeline; revocable — revocation halts analysis and hides derived assessments) and **visibility consent** (`private` default | `searchable`), changeable instantly at any time.
2. [M] Consent screens inform, never nudge (brand §4): no "boost your visibility!" framing, no dark patterns, no pre-checked boxes; copy per brand §17 consent examples.
3. [M] All recruiter-facing reads pass through the single consent-check implementation (handbook §16.5); deny-by-default; **zero caching of consent decisions across requests**.
4. [M] Revocation is synchronous: within the same request cycle, subsequent reads return nothing; shortlist entries render "no longer available"; open share links stop resolving.
5. [M] Share links: unguessable tokens; revocable and regenerable (regeneration invalidates prior links); render the report read-only; no recruiter account required; viewer events (timestamp, coarse source) logged and shown to the student. Share-link view **excludes** contact details and excludes any recruiter-workspace affordances.
6. [M] Every consent change and every recruiter/link view is an immutable audit record; the student's "who viewed my profile" surface is powered by that log.
7. [M] Searchable-mode anonymization: recruiter search and summaries show handle-level identity only (no legal name, photo, email, or exact institution) until a contact request is accepted.

**Acceptance criteria:**
- Automated test: recruiter query for a candidate who switched to private mid-session returns nothing (the consent-violation zero-tolerance test).
- Every consent screen passes copy review against brand §17.
- Audit log reconstructs the complete visibility history of any profile.

---

### FR-9: Recruiter Capability Search

**Purpose:** Recruiters discover candidates by demonstrated capability with the ranking reason shown.

**Inputs:** Search criteria: role family; required/preferred skills (from the fixed taxonomy); minimum assessment level and/or confidence per skill; evidence filters (`has deployed project`, `interview completed`, `independent projects ≥ n`); free-text is [S] and only matches evidence metadata, never used for ranking.
**Outputs:** Ranked result list of consenting candidates with per-result ranking rationale; saved searches [S].

**Business rules:**
1. [M] Only `searchable` candidates ever appear; consent checked per result at render time.
2. [M] Ranking is deterministic and explainable: an ordered, documented rubric over (match on required skills at required confidence) → (breadth of strong assessments) → (evidence strength: independence, deployment, interview-verified) → (recency of evidence). **No opaque ML ranking in V1.** The per-result rationale states the actual reasons ("Strong in 3 of 3 required skills, high confidence; independent deployed project").
3. [M] Results never display or use: name, photo, gender-signaling data, institution, CGPA. Ranking inputs exclude the same (fairness constraint carried into search).
4. [M] Empty/thin results are honest: "2 candidates match all criteria" with relaxation suggestions — never padded with weak matches presented as strong.
5. [M] p95 search latency < 500 ms (handbook §21); pagination cursor-based.
6. [S] Saved searches with change notifications are per-recruiter, no auto-outreach.

**Acceptance criteria:**
- Identical criteria always produce identical ordering over identical data (deterministic-ranking test).
- Each result card renders skills only via `ConfidenceIndicator` and states its ranking rationale.
- Search index updates reflect visibility changes within one minute, and per-result render-time consent check makes even stale index entries unservable.

---

### FR-10: Candidate Summary & Evidence Drill-Down (Recruiter)

**Purpose:** Minutes-to-confidence evaluation with one-click verification of every claim.

**Inputs:** Candidate ID (consent-checked); the candidate's current report version.
**Outputs:** Summary page; drill-down evidence views; interview-prep brief; export view.

**Business rules:**
1. [M] Summary structure follows reasoning order (brand §10.6): context (role readiness) → evidence highlights → skill assessments (with confidence) → interview highlights → gaps (factual) → integrity notes (if any).
2. [M] Evidence adjacency: every claim on this page reaches its evidence in ≤ 1 interaction; raw evidence renders in monospace; interpretation in sans (brand §8 — the typographic boundary is a functional requirement).
3. [M] Repository drill-down shows: repo link, originality classification with reasoning, key evidence excerpts (files/commits cited by the analysis), and the metrics used. Interview drill-down shows assessed transcript excerpts in context, with a link to the relevant full-transcript section.
4. [M] Interview-prep brief lists 3–5 probe areas derived from moderate/preliminary-confidence assessments and stated gaps, each with its reason.
5. [M] Export/print view includes, inside the exported frame: confidence levels, evidence citations, report version + date, and the statement that assessments are AI-generated (AiContentMarker equivalent in print).
6. [M] Every summary view is audit-logged and visible to the student (FR-8.6).

**Acceptance criteria:**
- Click-depth audit: no claim on the summary is > 1 interaction from its evidence.
- Export contains no bare assessment (spot-checked in E2E by asserting confidence text near every assessment string).
- A recruiter hitting a just-revoked profile mid-session gets the designed "no longer available" state, not an error page.

---

### FR-11: Shortlists & Contact Requests

**Purpose:** Let recruiters act on discovery — with candidate consent gating all identity exchange.

**Inputs:** Shortlist operations (create per opening, add/remove/annotate [S]); contact request (candidate, opening context, required note); candidate accept/decline.
**Outputs:** Shortlists with side-by-side comparison; contact-request lifecycle records; mutual contact reveal on acceptance.

**Business rules:**
1. [M] Shortlists are scoped to a named opening within the workspace; visible to workspace members; comparison view renders up to 4 candidates side by side using the same assessment components (no new visual language).
2. [M] A contact request must include role context (role family, company stage/size band, and a free-text note ≤ 500 chars); the candidate sees exactly what will be shared upon acceptance before deciding.
3. [M] Request states: `pending` → `accepted` | `declined` | `expired` (14 days). One active request per recruiter–candidate pair; declined requests block re-request for 60 days ("no penalty for declining" made real).
4. [M] On acceptance: both parties see names + contact email; nothing else changes in visibility. On decline/expiry: recruiter sees the state only — no reasons, no read receipts.
5. [M] Candidate notification is calm and complete (brand §17 contact-request example is the required copy pattern).
6. [M] No in-app messaging in V1 (PDD exclusion §5) — contact happens off-platform after mutual reveal.

**Acceptance criteria:**
- A declined candidate cannot be re-requested by the same recruiter for 60 days (enforced server-side).
- Comparison view shows confidence beside every compared assessment; no derived "winner" indicator exists.
- Contact details are absent from every payload until state = `accepted` (API contract test).

---

### FR-12: Assessment Disputes (Contestability)

**Purpose:** Every judgment is contestable — a visible, functioning affordance (brand §16.4).

**Inputs:** Dispute submissions (assessment ref, category: `factually wrong` | `evidence missed` | `explanation unclear` | `other`, description, optional evidence pointer).
**Outputs:** Dispute records with lifecycle; "Under review" markers; resolution notifications; operator review queue.

**Business rules:**
1. [M] "Question this assessment" appears on every assessment surface, styled as a legitimate action (not buried).
2. [M] Immediate acknowledgment with a stated response window (V1: 5 business days, human-reviewed).
3. [M] While open, the assessment renders "Under review" to all audiences including recruiters.
4. [M] Resolutions: `upheld` (with improved explanation added), `revised` (new assessment version supersedes; history retained), `re-analysis` (new evidence → pipeline re-run). Every resolution notifies the student in plain language.
5. [M] Dispute rate and resolution time are guardrail metrics (§4); disputes feed the prompt-improvement backlog.

**Acceptance criteria:**
- A dispute can be filed from every surface an assessment appears on (report, summary, share-link view is read-only — excepted).
- The "Under review" state propagates to recruiter views within one render cycle.
- Every closed dispute has a stored, student-visible resolution explanation.

---

### FR-13: Re-Analysis & Trajectory

**Purpose:** The profile is a living document; improvement is visible (measured on a trajectory, not a verdict).

**Inputs:** Student-triggered re-analysis; evidence-set changes (new repo, resume update, completed interview); recommendation-addressed prompts.
**Outputs:** New report version; "what changed" summary; updated recommendations.

**Business rules:**
1. [M] Student-triggered re-analysis available at most once per 7 days (cost control), always after material evidence changes regardless of cooldown.
2. [M] Re-analysis is incremental where valid (unchanged repos reuse prior results at the same pipeline version) and full when the pipeline version changed.
3. [M] "What changed": assessment-level diffs (level or confidence changes) with the evidence that drove each change; student-view leads with progress (brand §15.3).
4. [M] Prior versions remain viewable by the student; recruiters and share links see latest only.

**Acceptance criteria:**
- A student who adds tests to a repo and re-analyzes sees the testing assessment/confidence change with that repo cited as the driver.
- Cooldown communicates the next-available time plainly; material-change bypass works.

---

### FR-14: Notifications

**Purpose:** Close the loops (analysis done, interview evaluated, viewed, contact request, dispute resolved) without spam.

**Inputs:** Domain events. **Outputs:** In-app notification center + transactional email.

**Business rules:**
1. [M] V1 events: analysis complete/failed; interview evaluated; profile viewed (daily digest, not per-view); contact request received/accepted/declined/expiring; dispute updates; integrity flag created (student).
2. [M] All copy follows brand voice; zero urgency theatrics, zero "recruiters are waiting!" hype; per-category email opt-out except consequential ones (contact requests, disputes, integrity flags).
3. [M] Email is transactional only — no marketing sequences in V1.

**Acceptance criteria:** every event above produces exactly one notification (idempotent under retries); opt-outs honored; copy reviewed against brand §17.

---

### FR-15: Operator Console (minimal)

**Purpose:** Make contestability and integrity review real; keep the pipeline operable.

**Business rules:**
1. [M] Queues: disputes (FR-12), high-severity integrity reviews (FR-6.4) — with the full evidence context needed to decide, and structured resolution actions.
2. [M] Pipeline health: queue depths, failure rates, dead-letter view with retry, AI token spend per task type.
3. [M] Operator actions are audit-logged; operators cannot edit assessments directly — only trigger the defined resolution paths.
4. [S] Cohort metrics view (the §4 dashboard).

**Acceptance criteria:** every dispute and flagged review is resolvable end-to-end from the console; no direct-DB intervention needed for the defined flows.

---

## 10. Non-Functional Requirements

| Area | Requirement |
|---|---|
| Performance | Budgets per handbook §21: search p95 < 500 ms; report LCP p95 < 1.5 s; interview first-token p95 < 2.5 s; full analysis ≤ 15 min with progress updates ≥ every 15 s of wall time |
| Availability | 99.5% for the web app during the MVP window; analysis pipeline may degrade to queued-with-honest-ETA, never to silent failure |
| Scale envelope (V1 design targets) | 5,000 student profiles; 50 recruiter seats; 200 concurrent interview sessions; 1,000 analyses/day burst |
| Security | Handbook §18 in full; secrets management, encrypted at rest/in transit, CSP, audit logging |
| Accessibility | WCAG 2.2 AA merge gate; AAA target on report, interview, and consent surfaces; interview accommodations (FR-4.4) |
| Privacy | §13 of this PRD; data classification per handbook §15.9 |
| Observability | Handbook §20: correlated structured logs, pipeline tracing, golden-signal + product dashboards, alert runbooks |
| Browser support | Latest 2 versions of Chrome/Edge/Firefox/Safari; responsive web (desktop-first; no native apps) |
| Localization | English only in V1; all strings externalized; UTC + ISO 8601 throughout |
| Cost | AI spend per completed student profile is tracked and reviewed weekly; hard monthly budget alert thresholds configured before launch |

## 11. AI Requirements

1. **Tasks and defaults:** repo analysis, interview question generation, interview turn conduct, interview evaluation, report synthesis, and recommendation generation run on the evaluation-grade default model (`claude-opus-4-8` per handbook §17.1); utility tasks may use `claude-haiku-4-5` with justification. Model IDs live in config only.
2. **Structured outputs everywhere:** every assessment-producing call uses schema-constrained output validated against the same Zod schema on receipt; free-text is never parsed structurally.
3. **Output contract = product contract:** model outputs must include finding, evidence refs (citing only inputs we supplied — invented sources fail validation), reasoning, confidence. Partial/invalid outputs are never persisted.
4. **Interactive vs. batch:** interview turns stream; everything else is queued batch work with caching-friendly prompt structure (stable rubric prefix, volatile candidate content last).
5. **Prompt governance:** prompts versioned in-repo; every persisted assessment records `prompt_version` + `model_id` + `pipeline_version`; prompt changes require attached eval results (handbook §17.8).
6. **Eval suite is a launch gate:** a golden dataset (≥ 30 anonymized profiles spanning strong/typical/thin/gamed evidence, human-labeled) with automated assertions on: structural validity, evidence-grounding (zero invented citations), interview grounding ratio (≥ 80%), calibration (confidence levels correlate with human-judged reliability), fairness (no assessment shift when name/institution proxies are injected — must be nil because those inputs are excluded; the test guards the exclusion), and banned-language compliance.
7. **Refusals and failures** are explicit branches with product behavior (retry, degrade to `not-yet-assessed`, or surface the honest error) — never silent.
8. **Cost instrumentation:** token usage recorded per job with task labels; per-profile cost is a first-class metric.
9. **No training on candidate data;** API data-handling posture documented in the privacy policy.

## 12. Data Requirements

1. **Core entities** (implementation detail per handbook §15; this defines the required semantics): `users`, `student_profiles`, `recruiter_workspaces`, `evidence_items` (typed: repo, resume-claim, deployed-url, transcript), `repo_analyses`, `interviews`, `interview_transcripts` (immutable), `skill_assessments` (versioned, append-only, provenance-complete), `reports` (versioned), `recommendations`, `integrity_notes`, `consent_records` (append-only), `share_links`, `view_events` (audit), `shortlists`, `contact_requests`, `disputes`, `notifications`.
2. **Provenance is structural:** no `skill_assessment` without ≥ 1 evidence link + reasoning + confidence + pipeline/model/prompt versions (schema-enforced, integrity-job-verified).
3. **Append-only domains:** assessments, reports, consent, integrity notes, disputes, audit events — new versions supersede; nothing judgment-bearing is updated in place.
4. **Data classification:** transcripts, assessments, consent and audit records are `sensitive`; resume files and contact details `sensitive`; repo metadata of public repos `internal`. New read paths on `sensitive` require review.
5. **Retention:** active accounts retain all versions; deleted accounts hard-delete personal data after the 7-day grace period, retaining only anonymized aggregate metrics and legally required anonymized consent-event stubs; raw resume files deleted on account deletion and replaceable at any time before.
6. **GitHub data minimization:** we store analysis outputs, cited excerpts, and metadata — not full repository mirrors; cached repo content is expired after analysis completes.
7. **Exports:** student can export their own full data (report versions, transcripts, consent history) in a machine-readable format [S].

## 13. Privacy & Consent Requirements

1. **Lawful-basis clarity:** analysis and visibility each rest on explicit, recorded, revocable consent (FR-8); privacy policy written in plain language, versioned; material changes require re-acknowledgment.
2. **Deny-by-default access:** any recruiter-facing read passes the single consent check; default visibility is private; nothing is opt-out.
3. **Anonymized discovery:** searchable profiles expose no legal name, photo, contact, or institution pre-acceptance (FR-8.7); ranking and assessment inputs exclude the same attributes end-to-end.
4. **Transparency surfaces:** who-viewed log (FR-8.6); what-recruiters-see preview (the student can view their own profile exactly as a recruiter sees it); consent history visible to the student.
5. **Deletion & portability:** account deletion per FR-8/Flow E; data export per §12.7.
6. **Interview privacy:** text-only in V1 (no audio/video); transcripts visible to the student always, to recruiters only under visibility consent, to operators only in dispute/integrity review (access audited).
7. **Third parties:** GitHub (OAuth, declared scopes), Anthropic (analysis processing, documented), email provider (transactional). No analytics that profile candidates; product analytics are event-level with pseudonymous IDs.
8. **Breach protocol:** handbook §18.10; user communication follows brand voice — maximum clarity, zero spin.

## 14. Explainability Requirements

1. **Three-layer pattern everywhere** (brand §16.2): finding (plain language) → evidence (linked, monospace, inspectable) → reasoning (how evidence led to finding, and what would change it). Enforced by the `EvidenceCard` contract — no assessment renders outside it.
2. **Confidence always visible** via the single `ConfidenceIndicator`: `high` / `moderate` / `preliminary`, each with its basis on hover/tap; no numeric certainty theater anywhere.
3. **AI content born labeled:** every AI-generated string carries the marker in storage and renders inside `AiContentMarker`, including exports.
4. **Absence ≠ deficiency:** unassessed areas render `Not yet assessed` + what evidence would assess them — never a low level.
5. **Contestability affordance** on every assessment surface (FR-12).
6. **Transparency symmetry:** no recruiter-visible judgment invisible to the student (FR-5.7); integrity notes shown student-first (FR-6.3).
7. **Reproducibility:** any historical assessment can be traced to its pipeline/model/prompt versions and inputs (handbook §14.4) — "explain any assessment, retroactively" is an operational capability, not a slogan.
8. **Language rules** (brand §16.7) are encoded in prompts and verified by the eval suite's banned-language checks: evidence-descriptive, observation verbs, never character verdicts.

## 15. Error Handling Requirements

1. **Every failure mode in §17 (edge cases) has a designed state** — specific copy (brand-voice: calm, accountable, actionable), a defined next step, and telemetry. Generic "something went wrong" screens are a defect.
2. **Partial failure is honest:** per-item ingestion/analysis independence (FR-2/FR-3); the report states exactly what's included ("Based on 4 of 5 repositories — `payments-api` couldn't be analyzed").
3. **Async jobs never strand users:** every job reaches a terminal user-visible state; stalls beyond SLA trigger alerts and an in-product "taking longer than expected" state with a real ETA or an apology + notification promise.
4. **Interview resilience:** connection loss during an interview preserves all submitted answers; resume returns to the exact point; evaluation failures retry, then degrade to "evaluation delayed" — never lose a completed transcript.
5. **External-dependency degradation:** GitHub API outage → ingestion pauses with honest status; AI API failure → queued retry with backoff, user-visible delay state; email failure → in-app notification still delivered, email retried.
6. **Consent-related races fail closed:** any ambiguity in consent state denies access.
7. All errors follow the catalog + envelope of handbook §19/§16.3; request IDs surface in error states for support.

## 16. Acceptance Criteria (Release Gates)

V1 ships when all of the following hold, in addition to every FR's own criteria:

1. **Golden-path E2E green** (handbook §22.4): student sign-up → analysis → interview → report → searchable → share link; recruiter invite → search → summary → drill-down → shortlist → contact request → accept; consent revocation propagation; dispute round-trip.
2. **Consent zero-tolerance suite green:** all deny-by-default, revocation-synchrony, anonymization, and contact-gating tests pass; a deliberate consent-bypass attempt in tests is provably blocked at the service layer.
3. **Eval suite green** at launch thresholds (§11.6) on the golden dataset, including fairness and banned-language checks.
4. **Explainability audit:** manual pass over every surface confirms no bare assessment, all four data states, confidence everywhere, monospace boundary respected.
5. **Accessibility gate:** automated (axe) zero violations on key flows; manual keyboard + screen-reader pass on report, interview, consent surfaces; accommodations functional.
6. **Performance budgets met** under the §10 scale envelope in a production-like load test.
7. **Operational readiness:** dashboards live, alerts wired to runbooks, dispute/integrity console functional, cost tracking active, rollback rehearsed.
8. **Copy review complete:** all user-facing strings reviewed against Brand Guidelines §4/§17.
9. **Privacy sign-off:** policy published; data map current; deletion flow tested end-to-end on a real account.

## 17. Edge Cases

Engineering must design and test each of these explicitly:

**Evidence & analysis**
1. Student with zero public repos → GitHub-only onboarding impossible; designed empty state explains exactly what to add, offers private-repo grant path, no dead end.
2. All repos are forks/tutorials → report renders with `not-yet-assessed` majority + recommendations focused on creating independent evidence; never a "bad" report.
3. Monorepo or single huge repo → size caps with partial analysis of the most significant paths, disclosed.
4. Repos in languages outside the role rubric (e.g., all Unity/C#) → assessed where transferable (code quality, VCS practice), `not-yet-assessed` for role-specific skills, honestly explained.
5. Repo deleted/made private on GitHub after analysis → evidence link degrades gracefully ("source no longer accessible; analysis retained from <date>"), flagged for the student.
6. Two students, same shared project repo → each assessed on their own commits only; collaboration noted.
7. Resume in an image-based PDF (no text layer) → specific error + guidance; proceed without.
8. Non-English README/comments → analysis proceeds (code is code); communication-related signals draw from interview instead.

**Interview**
9. Student answers every question with pasted AI-generated text → paste/latency heuristics flag for review; grounded follow-ups ("why did *you* choose X in *your* file Y") make it self-evident in the transcript; handled per FR-6.4 (human review, factual notes).
10. Student's selected repo has too little substance for 8 grounded questions → interviewer falls back to the next-best repo; below minimum evidence, interview is postponed with an honest explanation, not padded with trivia.
11. Abandonment at question 2 vs. question 11 → both incomplete (no assessment); resume window; the near-complete case is called out ("2 questions left — resume to get your evaluation").
12. Student disputes an interview question's premise mid-interview → flag affordance (FR-4.9); interviewer moves on.

**Consent & access**
13. Revocation while a recruiter has the summary open → next interaction returns the "no longer available" state; export attempted post-revocation is blocked.
14. Share link posted publicly (e.g., on social media) and traffic spikes → rate limiting protects the platform; view log shows volume; one-click revoke+regenerate offered.
15. Student deletes account while a contact request is pending → request voided; recruiter sees "no longer available"; no data remnants.
16. Recruiter seat revoked mid-session → session invalidated on next request.

**Marketplace**
17. Zero searchable candidates matching a query at launch → honest empty state + criteria-relaxation suggestions (FR-9.4); design-partner expectations set operationally.
18. Candidate accepts two competing contact requests → allowed; no exclusivity; each recruiter sees only their own thread state.
19. The same person holds a student and a recruiter identity → separate accounts; recruiters can never view their own student profile through workspace tooling (self-view returns the student view).

**Pipeline & AI**
20. Model returns schema-valid but evidence-citation-invalid output (cites a repo not in input) → validation rejects, job retries, repeated failure → flagged to operators, area rendered `not yet assessed`.
21. Analysis job stuck > SLA → auto-alert, user-visible honest delay state, operator retry path.
22. Prompt/pipeline version bump mid-flight → in-flight jobs complete on their pinned version; mixed-version reports impossible (a report version is single-pipeline-version).

## 18. Risks

| # | Risk | Likelihood | Impact | Mitigation in V1 |
|---|---|---|---|---|
| 1 | **Assessment quality insufficient** — assessments don't beat proxies | Medium | Existential | Narrow vertical; eval suite as launch gate; design-partner outcome calibration from day one; confidence honesty (thin evidence → preliminary, never overclaim) |
| 2 | **Cold start** — too few candidates for recruiters / no recruiters for candidates | High | High | Single-player student value first (report + share link); concentrated cohort recruitment; design partners signed before launch; §4 targets sized for a small, dense marketplace |
| 3 | **Adverse selection** — only weak candidates join | Medium | High | Seeded strong-builder cohort; never-remedial positioning; benchmark/differentiation value visible in the report |
| 4 | **Gaming** — AI-generated projects, outsourced interviews | Medium | High | Grounded interviews (FR-4.2); integrity layer (FR-6); adversarial test set; human review before consequences |
| 5 | **Consent/privacy incident** | Low | Existential | Structural deny-by-default; zero-tolerance test suite; synchronous revocation; audit everywhere; stop-ship policy (§4) |
| 6 | **AI cost overrun** | Medium | Medium | Per-profile cost metric; re-analysis cooldown; caching; size caps; budget alerts |
| 7 | **Interview experience feels like an exam** → completion collapse | Medium | High | No per-question timers; pause/resume; conversational tone per brand; completion-rate monitoring with fast iteration |
| 8 | **Latency of analysis frustrates onboarding** | Medium | Medium | Honest staged progress; email-on-completion; preliminary report before interview; 15-min SLA |
| 9 | **Recruiters distrust an unfamiliar signal** | Medium | High | Drill-down-to-raw-evidence everywhere; deterministic explained ranking; design-partner onboarding sessions |
| 10 | **Regulatory exposure (AI hiring tools)** | Low–Med | High | Explainability + contestability by design; fairness input-exclusion architecture; jurisdiction review before expanding beyond design partners |

## 19. Features Explicitly Out of Scope for V1

Decisions, not omissions (rationale in PDD §11):

1. Additional role families (data/ML, mobile, DevOps…) — depth before breadth.
2. Additional interview formats (system design, algorithms, behavioral) and audio/video interviews.
3. Job postings, applications workflow, ATS integrations.
4. In-app messaging beyond the contact-request handshake.
5. University/placement-cell portals; B2B2C channels.
6. Leaderboards, percentile ranks, public candidate rankings, numeric scores of any kind.
7. Proctored or timed assessments; webcam monitoring.
8. Learning content, courses, or curricula.
9. Salary data, offer benchmarking, negotiation tools.
10. Native mobile apps (responsive web only).
11. Free-form/custom skill taxonomies and recruiter-defined rubrics (fixed taxonomy + two rubrics only).
12. ML-based search ranking (deterministic explained rubric only).
13. Multi-workspace recruiters, agency accounts, enterprise SSO.
14. Deployed-application content analysis (URL reachability check only).
15. Payments/billing (design partners run on agreements; monetization is post-validation).

Any scope addition to V1 requires PM + architect sign-off and an update to this document.

## 20. Future Roadmap (post-MVP, from the PDD)

- **Phase 2 (validate → deepen):** additional interview formats; expanded evidence sources (open-source contribution analysis, deployed-app verification, hackathons/internships); recruiter custom role definitions; second role family chosen by design-partner demand; published fairness audits.
- **Phase 3 (marketplace):** university/bootcamp channels; ATS integrations (Greenhouse, Lever); interview-skip agreements with partner companies; recruiter team plans and pipeline analytics; monetization launch.
- **Phase 4 (standard):** experienced-hire verification; portable API-accessible credential; geographic expansion; outcome-data feedback loop calibrating evaluation models — the durable moat.

Roadmap items are directional; each phase begins with its own PRD and is gated on the prior phase's success criteria.

---

*This PRD is the implementation contract for V1. Changes go through PR review with PM approval; engineering questions that reveal an underspecified requirement are resolved by amending this document, not by ad-hoc decisions in code.*
