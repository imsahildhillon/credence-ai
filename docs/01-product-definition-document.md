# Credence AI — Product Definition Document

**Document type:** Product Definition Document (PDD)
**Product:** Credence AI — Evidence-Based Talent Intelligence Platform
**Version:** 1.0
**Date:** July 2026
**Status:** Draft for review

---

## 1. Vision Statement

A world where engineering talent is discovered by what people can actually do — not by where they studied, what keywords they wrote, or who they know.

Credence AI will become the trust layer of technical hiring: the place where a student's demonstrated capability is measured, verified, and made legible, and where recruiters hire with evidence instead of intuition.

---

## 2. Mission Statement

Credence AI closes the credibility gap between students and recruiters by converting scattered signals of real work — code, projects, interviews, and learning progress — into a verified, evidence-based profile that recruiters can trust and students can improve.

We exist to make **proof of skill** cheaper to produce, easier to verify, and impossible to fake.

---

## 3. Problem Statement

Technical hiring is built on proxies, and the proxies are failing both sides.

**For students:**
- Resumes reward writing ability and keyword optimization, not engineering ability.
- CGPA and institution brand dominate screening, disadvantaging capable students from non-elite backgrounds.
- Students with genuine skills — real projects, open-source contributions, self-taught depth — have no standardized way to prove them. Their evidence is scattered across GitHub, portfolios, and course platforms, and none of it is verified or comparable.
- Feedback is absent: a rejected student rarely learns *why* they were not credible, so they cannot improve.

**For recruiters:**
- Screening at volume is expensive. A single opening can attract hundreds of near-identical resumes.
- Resume claims are unverifiable at scale; inflated skills sections are the norm, and AI-generated resumes have made keyword matching actively misleading.
- Technical interviews are the only reliable evaluation tool, but they cost senior engineering hours and arrive late in the funnel — after most filtering damage is done.
- The result: recruiters over-index on brand names and CGPA because they are the only *cheap* signals available, even though everyone knows they are weak predictors.

**The core problem:** the market lacks a low-cost, high-trust signal of demonstrated engineering capability. Students cannot supply one; recruiters cannot demand one. Credence AI creates it.

---

## 4. Why Existing Solutions Fail

| Category | Examples | Why they fall short |
|---|---|---|
| Job boards & ATS platforms | LinkedIn, Naukri, Indeed, Greenhouse | Optimized for *distribution and workflow*, not evaluation. They move unverified claims faster; they do not verify them. |
| Coding assessment platforms | HackerRank, Codility, CodeSignal | Measure algorithmic puzzle performance under time pressure — a narrow skill weakly correlated with real engineering work. Point-in-time tests, no longitudinal signal, high candidate anxiety, widely gamed via pattern memorization. |
| Competitive programming profiles | LeetCode, Codeforces ratings | Self-selected, narrow, and opaque to non-technical recruiters. Say little about system design, code quality, collaboration, or shipping ability. |
| Portfolio & profile tools | GitHub itself, personal sites, Wellfound profiles | Raw evidence without interpretation. A recruiter cannot evaluate a repository in 30 seconds; green squares and star counts are gameable and frequently misread. |
| Credentialing & certificates | Coursera, Udemy, bootcamp certificates | Certify *course completion*, not capability. Low completion rigor means low market trust; recruiters largely ignore them. |
| AI interview tools | HireVue and similar | Built for the employer as a filtering cost-cutter; students get no value, no feedback, and no portable artifact. One-sided tools breed distrust and legal/ethical scrutiny. |

**The pattern:** every existing solution serves one side of the market and produces either *unverified evidence* (portfolios), *narrow evidence* (coding tests), or *no evidence at all* (job boards). None produces a **verified, holistic, portable, and improvable** signal of engineering capability. That gap is Credence AI's category.

---

## 5. Target Users

**Primary users (two-sided platform):**

1. **Students and early-career engineers** — final-year undergraduates, recent graduates, bootcamp graduates, and self-taught developers (0–2 years of experience) seeking software engineering, data, and adjacent technical roles. Initial geographic focus: markets with high engineering graduate volume and intense screening pressure (e.g., India), expanding globally.

2. **Recruiters and hiring teams** — campus recruiters, technical recruiters at startups and mid-size companies, and engineering hiring managers who currently screen high volumes of early-career candidates. Early focus: startups and SMBs (50–500 employees) that lack dedicated technical screening infrastructure and feel the pain most acutely.

**Secondary stakeholders (not primary users in v1):** university placement cells, bootcamps and training providers, and staffing agencies.

---

## 6. User Personas

### Persona A — "Aarav," the Under-Credentialed Builder
- **Profile:** 21, final-year CS student at a tier-3 college, 7.4 CGPA.
- **Reality:** Has built three substantial projects including a deployed full-stack application with real users; 400+ meaningful GitHub commits; contributes to one open-source library.
- **Pain:** Gets filtered out at resume screening before anyone sees his work. Applies to 150 companies, hears back from 4. Has no idea what to fix.
- **Goal:** Be evaluated on his projects and code, not his college's brand. Understand exactly what makes him credible or not credible to employers.
- **Success moment:** A recruiter reaches out to him because his verified profile surfaced in a capability-based search.

### Persona B — "Meera," the Startup Technical Recruiter
- **Profile:** 29, sole recruiter at a 120-person Series-B SaaS company hiring 15 engineers this year, including 6 early-career roles.
- **Reality:** Receives 300+ applications per junior opening. Cannot evaluate code herself. Every bad candidate who reaches the interview stage costs her senior engineers 2+ hours.
- **Pain:** Her only filters are college, CGPA, and keyword matching — and she knows they miss great people and pass through weak ones. Her engineering team is losing faith in the pipeline she sends them.
- **Goal:** A ranked, evidence-backed shortlist she can defend to her hiring managers, produced in minutes rather than days.
- **Success moment:** Her interview-to-offer conversion rate doubles because the candidates reaching engineers are pre-validated.

### Persona C — "Rohan," the Engineering Hiring Manager
- **Profile:** 35, engineering manager who makes the final call on junior hires and conducts final-round interviews.
- **Pain:** Distrusts resumes entirely. Wants to see code and reasoning but has no time to review portfolios for every candidate.
- **Goal:** A one-page evidence summary per candidate — what they built, how well, and where they are weak — that lets him walk into an interview already knowing what to probe.
- **Success moment:** He opens a Credence profile before an interview and finds the candidate's strongest project, code-quality assessment, and AI-interview reasoning transcript in one place.

### Persona D — "Priya," the Anxious High-Performer (anti-persona check)
- **Profile:** 22, strong student at a top-tier institution with internships at brand-name companies.
- **Relevance:** Priya doesn't *need* Credence to get interviews — but she represents the supply-side credibility ceiling. If top candidates also adopt the platform (to differentiate further and skip redundant screening rounds), the recruiter-side value compounds. The product must offer her value too: interview-skip privileges, benchmark positioning, and profile portability — otherwise the platform risks adverse selection ("only students who can't get hired elsewhere are on it").

---

## 7. Value Proposition

### For students
> **"Prove what you can actually do — and learn exactly how to become more hireable."**
- A single verified profile that aggregates and *interprets* GitHub activity, projects, AI-interview performance, portfolio, and learning progress.
- A credibility signal that travels with them to every application, independent of college brand.
- Actionable, personalized guidance: not "you were rejected," but "your backend depth is strong; your testing practices and system-design articulation are your gap for the roles you want."

### For recruiters
> **"Screen on evidence, not claims — and cut your cost-per-qualified-candidate dramatically."**
- Search and rank candidates by *demonstrated* capability, not keyword presence.
- Every profile claim is backed by inspectable evidence: the actual repository, the actual interview reasoning, the actual project.
- Reduce engineering hours spent on unqualified interviews; defend shortlists with data.

### For the market
- A shared, portable standard of technical credibility that gets more valuable as both sides adopt it — the network effect that job boards have on *distribution*, applied to *trust*.

---

## 8. Product Principles

These principles resolve design disputes. When in doubt, the earlier principle wins.

1. **Evidence over claims.** Every score, badge, or rank must be traceable to inspectable evidence. If we can't show *why*, we don't show the number.
2. **The student is a user, not inventory.** Students get genuine, standalone value (insight, improvement guidance) even if no recruiter ever views their profile. We never become a surveillance tool sold over students' heads.
3. **Explainable by default.** Any AI-derived assessment must be explainable to a non-technical recruiter and contestable by the student. Black-box scores are prohibited.
4. **Improvable, not just judged.** Every assessment ships with a path to improve it. Credence measures a trajectory, not a verdict.
5. **Hard to game, honest about limits.** We design against gaming (forked-repo padding, memorized interview answers, AI-generated projects) and we state confidence levels rather than fake precision.
6. **Fairness is a feature, not a compliance checkbox.** The entire premise is correcting proxy bias. We measure and publish whether our signals reduce or reproduce it.
7. **Privacy and consent are non-negotiable.** Students explicitly control what is analyzed and who sees it. Visibility is opt-in, revocable, and granular.
8. **Depth before breadth.** One role family evaluated excellently beats ten evaluated shallowly. We expand coverage only when the current vertical's signal quality is proven.

---

## 9. Core Features

### 9.1 Student-side

**Evidence Ingestion & Unified Profile**
- Connect GitHub, upload resume, link portfolio/deployed projects, and record learning progress into one structured profile.
- The system parses, deduplicates, and organizes all evidence into a coherent capability narrative.

**GitHub & Project Intelligence**
- Deep analysis of repositories: originality (vs. forks/tutorials), code quality, architectural complexity, consistency of contribution, technology depth, and whether projects are deployed/used.
- Distinguishes "tutorial-following" from "independent building" — the single most important signal recruiters cannot currently extract.

**AI Interview**
- Structured, conversational technical interviews (project deep-dives, applied problem-solving, system reasoning) conducted asynchronously.
- Produces a reviewable transcript plus an assessment of reasoning quality, communication, and depth — evidence a recruiter can read, not just a score.
- Cross-validates: interview questions are grounded in the student's *own* projects, making memorized or outsourced answers detectable.

**Credibility Report & Skill Graph**
- A verified capability profile: skill-by-skill assessment with confidence levels, each linked to its supporting evidence.
- Benchmarked against role requirements ("readiness for Backend Engineer — Early Career") rather than against other students alone.

**Personalized Improvement Engine**
- Concrete, prioritized guidance: which gaps matter most for target roles, which projects to build or improve, which evidence is weak or missing.
- Progress tracking that turns the profile into a living document rather than a static snapshot.

### 9.2 Recruiter-side

**Capability Search & Discovery**
- Search candidates by demonstrated skills, evidence strength, role readiness, and project characteristics — not keyword matching.
- Ranked shortlists with the *reason* for each ranking shown inline.

**Evidence-Backed Candidate Profiles**
- One-page candidate summary: strongest evidence, verified skills, interview highlights, flagged gaps — with one-click drill-down into raw evidence (repos, transcripts, projects).

**Role-Fit Matching**
- Recruiters define a role's actual capability requirements; the platform maps candidates to it with fit rationale, replacing JD-keyword roulette.

**Pipeline Intelligence**
- Comparison views across a shortlist; interview-prep briefs for hiring managers highlighting what to probe per candidate.

### 9.3 Platform

- **Trust & anti-gaming layer:** plagiarism/AI-generation detection on projects, fork and tutorial-clone detection, interview integrity checks, anomaly flagging.
- **Consent & visibility controls:** granular student control over profile visibility, per-recruiter access, and full audit of who viewed what.
- **Explainability layer:** every assessment renders a human-readable rationale for both audiences.

---

## 10. MVP Scope

**MVP thesis to validate:** *An AI-generated, evidence-based credibility profile changes screening decisions — recruiters shortlist differently and better when they see it, and students find the insights valuable enough to complete onboarding.*

**Target vertical for MVP:** early-career **Software Engineering (full-stack/backend)** roles only. One role family, evaluated deeply.

### In scope

**Student side:**
1. Onboarding: GitHub connect + resume upload + target-role selection.
2. GitHub/project analysis for the chosen role family: originality detection, code-quality assessment, contribution consistency, tech-stack depth.
3. One AI interview format: a project deep-dive interview grounded in the student's own repositories, with transcript.
4. Credibility Report v1: skill assessment with linked evidence and confidence levels.
5. Improvement insights v1: top 3–5 prioritized, concrete recommendations.
6. Shareable profile link (student-controlled visibility) usable in any application today — delivering value before recruiter-side liquidity exists.

**Recruiter side:**
7. Recruiter workspace: browse/search opted-in candidates by demonstrated capability for the target role family.
8. Evidence-backed candidate summary page with drill-down to raw evidence.
9. Simple shortlist + contact-request flow (contact gated by student consent).

**Platform:**
10. Consent and visibility controls (binary public/private + per-recruiter grant is sufficient for MVP).
11. Basic anti-gaming: fork/tutorial detection and interview-integrity flags.

### MVP success gate
The MVP graduates when: (a) students complete the full onboarding-to-report flow at an acceptable rate and share their profiles voluntarily, and (b) design-partner recruiters state they would shortlist differently based on Credence profiles — and demonstrate it on real openings. (Numeric targets in §13.)

---

## 11. Features Intentionally Excluded from MVP

Deliberate exclusions, with reasoning — these are decisions, not omissions:

1. **Multiple role families (data science, ML, mobile, DevOps, etc.)** — Depth-before-breadth. Signal quality in one vertical is the existential question; breadth multiplies evaluation-model surface area before the core is proven.
2. **Multiple AI interview formats (algorithms, system design, behavioral).** One grounded interview format proves the mechanism; a battery of interviews is an optimization.
3. **Job postings / application workflow / ATS integration.** Credence is a *trust layer*, not another job board. Workflow features are recruiter-retention tools for later; building them now dilutes the category claim and competes with incumbents on their strength.
4. **University/placement-cell portals and B2B2C channels.** High-leverage distribution, but only worth activating once the profile demonstrably changes hiring outcomes.
5. **Automated outreach/messaging systems.** Until liquidity exists, messaging infrastructure is empty rooms. A gated contact request suffices.
6. **Learning content or courses.** We point students to gaps; we do not become a course platform. Adjacent, but a different business with different economics.
7. **Ranking leaderboards / public candidate rankings.** Actively harmful early: they encourage gaming, humiliate the bottom of the distribution, and contradict the "judged vs. improvable" principle.
8. **Proctored/timed assessments.** Reintroduces the anxiety-test model we are displacing; our differentiation is longitudinal evidence, not exam supervision.
9. **Salary data, offer benchmarking, negotiation tools.** Valuable later; zero bearing on the core hypothesis.
10. **Mobile applications.** Both personas do this work on desktop. Responsive web is sufficient.

---

## 12. Future Roadmap

### Phase 1 — Prove the signal (MVP → ~6 months)
- MVP as scoped in §10, with 3–5 design-partner companies and a concentrated student cohort (e.g., a set of partner campuses/communities in one region).
- Instrument everything: does the profile change shortlisting decisions? Do improved students get better outcomes?

### Phase 2 — Deepen the evaluation (6–12 months)
- Additional interview formats (system reasoning, applied debugging).
- Expanded evidence sources: open-source contribution analysis, deployed-app verification, hackathon and internship evidence.
- Recruiter role-fit matching v2 with custom role definitions.
- Second role family (most likely data/ML, chosen by design-partner demand).
- Fairness auditing published as a product feature: bias metrics on Credence signals vs. traditional proxies.

### Phase 3 — Build the marketplace (12–24 months)
- University and bootcamp partnership channel (placement-cell dashboards) for supply-side scale.
- ATS integrations (Greenhouse, Lever) so Credence profiles flow into existing recruiter workflows.
- Interview-skip agreements: partner companies waive early screening rounds for high-confidence Credence profiles — the flywheel moment where the credential acquires market-clearing power.
- Team/enterprise recruiter plans; pipeline analytics.

### Phase 4 — Become the standard (24+ months)
- Expansion beyond early-career into experienced-hire verification (a much harder but much larger market).
- Credence Score as a portable, API-accessible credential embeddable in any hiring product.
- Geographic expansion; localization of role benchmarks.
- Longitudinal outcome data (who got hired, who succeeded) feeding back into evaluation-model calibration — the defensible data moat.

---

## 13. Success Metrics

### North Star
**Evidence-based hires:** the number of candidates hired where the Credence profile materially influenced the decision (recruiter-attributed). Everything else is a lead indicator of this.

### Student-side (activation & value)
- Onboarding completion rate (GitHub connect → report generated): target ≥ 60% for MVP cohort.
- AI interview completion rate among onboarded students: target ≥ 40%.
- Profile share rate (students voluntarily using their link in applications): target ≥ 30% — the strongest possible signal that students believe the profile helps them.
- Improvement-loop engagement: % of students acting on at least one recommendation within 30 days.
- Student NPS, segmented by profile strength (a fair product must be valued even by students who score modestly).

### Recruiter-side (adoption & efficacy)
- Design-partner activation: ≥ 3 companies running a real opening through Credence in MVP phase.
- Shortlist adoption: % of Credence-surfaced candidates recruiters advance to interview.
- **Screening efficiency:** reduction in engineering-hours per hire for design partners (self-reported, then instrumented).
- **Signal quality (the metric that matters most):** interview pass-rate of Credence-shortlisted candidates vs. the partner's traditional pipeline. If Credence candidates don't outperform, nothing else matters.
- Weekly active recruiter searches; repeat-usage rate across openings.

### Marketplace health
- Liquidity: median time for a strong profile to receive its first recruiter view / contact request.
- Consent friction: contact-request acceptance rate (low acceptance signals recruiter-side spam or student-side distrust).

### Trust & integrity (guardrail metrics)
- Gaming-attempt detection rate and false-positive rate on integrity flags.
- Assessment-dispute rate and resolution time (students contesting evaluations).
- Fairness audit: correlation of Credence outcomes with institution tier vs. correlation of *hiring* outcomes with institution tier — Credence should measurably weaken the proxy, and we should be able to prove it.

---

## 14. Risks

### 1. Signal-quality risk (existential)
If Credence assessments do not actually predict engineering ability better than existing proxies, the product is a nicer-looking resume. *Mitigation:* narrow vertical focus; calibrate against design-partner interview outcomes from day one; publish confidence levels instead of overclaiming; treat evaluation quality as the primary engineering investment.

### 2. Cold-start / two-sided liquidity risk
Recruiters won't come without candidates; candidates won't invest without recruiters. *Mitigation:* the student product must be valuable single-player (insight + shareable profile usable in any application today); concentrate supply geographically and by role family; recruit design partners before public launch.

### 3. Adverse-selection risk
If only struggling candidates join, the platform becomes a negative signal. *Mitigation:* explicit value design for strong candidates (differentiation, interview-skip potential, benchmarking); seed early cohorts with visibly strong builders; never market Credence as remedial.

### 4. Gaming and integrity risk
AI-generated projects, outsourced interviews, and portfolio padding will target the platform in proportion to its success. *Mitigation:* evidence cross-validation (interview grounded in the candidate's own code), longitudinal signals that are expensive to fake, continuous adversarial testing, and honest confidence downgrades when integrity is uncertain.

### 5. AI-fairness and bias risk
An evaluation model that reproduces the biases it claims to fix is both an ethical failure and a legal exposure (hiring-tool regulation is tightening globally — e.g., AI-hiring audit laws). *Mitigation:* explainability by design, dispute mechanism, regular bias audits treated as launch blockers, legal review of assessment claims per market.

### 6. Privacy and consent risk
Deep analysis of a student's work and recorded interviews is sensitive data. A single mishandling incident destroys the trust the entire brand depends on. *Mitigation:* opt-in visibility, granular consent, data-minimization, clear deletion rights, and consent architecture built in MVP, not retrofitted.

### 7. Incumbent-response risk
LinkedIn, HackerRank, or a well-funded ATS could ship a "verified skills" feature. *Mitigation:* incumbents are structurally committed to their existing signal (self-reported profiles; timed tests); Credence's moat is depth of evidence interpretation plus outcome-calibration data they don't collect. Speed in the chosen vertical matters more than breadth.

### 8. Unit-economics risk
Deep AI analysis and interviews per free student could make CAC/COGS unsustainable. *Mitigation:* tiered analysis depth, recruiter-side monetization as the primary revenue engine, cost-aware evaluation pipeline design as an explicit engineering requirement.

### 9. Over-scoring risk (product-design risk)
Reducing a person to a number invites backlash and misuse. *Mitigation:* profiles lead with evidence and narrative, not a single score; scores always carry confidence intervals and rationale; principle 1 and 3 enforced in review.

---

## 15. Competitive Differentiation

**Category claim:** Credence AI is not a job board, not a testing platform, and not a portfolio host. It is a **talent trust layer** — the first platform whose product is *verified interpretation of real evidence*.

| Axis | Incumbents | Credence AI |
|---|---|---|
| Unit of evaluation | Resume keywords, test scores, self-reported profiles | Demonstrated work: real code, real projects, grounded interviews |
| Evidence model | Claims (unverified) or exams (narrow, point-in-time) | Longitudinal, cross-validated, holistic evidence |
| Who gets value | One side (employer-paid filters, or candidate-paid prep) | Both sides — students get insight and improvement; recruiters get trust and efficiency |
| Explainability | Opaque scores or no scores | Every assessment traceable to inspectable evidence |
| Candidate posture | Judged once | Measured on a trajectory, with a path to improve |
| Gaming resistance | Keyword stuffing and pattern-memorization are the meta | Interviews grounded in the candidate's own work; longitudinal signals expensive to fake |
| Data moat over time | Application volume | Outcome-calibrated evaluation data: which evidence patterns predict hiring success |

**Sustainable moats, in order of durability:**
1. **Calibration data:** every hire and interview outcome sharpens the evaluation models — data no competitor collects at this altitude.
2. **Two-sided trust network:** once recruiters trust the signal and students carry it, switching costs are social, not technical.
3. **Depth of evidence interpretation:** the hard, compounding work of distinguishing real capability from its imitations.

---

## 16. Elevator Pitch

**Ten seconds:**
> Credence AI is the trust layer for technical hiring — we turn a student's real work into verified proof of skill, so recruiters can hire on evidence instead of resumes.

**Thirty seconds:**
> Hiring junior engineers is broken on both sides: students with real skills can't prove them, and recruiters drowning in identical resumes fall back on college brands and CGPA — signals everyone knows are weak. Credence AI analyzes what candidates have actually built — their GitHub, projects, and portfolio — and validates it with AI interviews grounded in their own code. Students get a verified credibility profile and a concrete path to become more hireable. Recruiters get ranked, evidence-backed shortlists that cut screening cost and raise interview pass rates. We're starting with early-career software engineers, where the credibility gap is widest — and building the standard for proof of skill in hiring.

---

*End of document. Next recommended artifacts: MVP PRD (feature-level requirements for §10), design-partner one-pager, and evaluation-quality measurement plan.*
