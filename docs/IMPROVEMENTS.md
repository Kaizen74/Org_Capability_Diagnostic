# Improvements Log — Research Basis for the v3/v4/v2 Revisions

Date: 2026-07-02. This note records what was changed in the three source artefacts, and the best-practice research and emerging trends that motivated each change.

## Update — coherence review against the packaged skills (v4.1)

A full-code review against the two packaged skills (`capability-diagnostic-dashboard` and `capability-compass-rubric` v4, including its judgment-protocols, lens-indicator-library, and evidence-extraction references) found the app compliant on the visual system but short of the rubric's *prediction honesty* discipline. Fixes applied, all covered by tests:

1. **Unknown, never guessed** (judgment protocol #11): cells without qualifying trajectory evidence previously rendered "→ Stable" — a fabricated flat call. They now render `? Unknown`, carry no projection, appear in a dedicated alert group, and when >25% of cells are unknown the dashboard names the real finding: an evidence-infrastructure gap.
2. **Trajectory confidence** (H/M, mechanical): derived from evidence per the indicator library; rear-view-only cells are capped at Medium.
3. **Evidence mix** (`leading | lagging | both`): lagging-only cells are badged as photographs, per the library's rule.
4. **Watch signals** (protocol #10 — every trajectory has a falsifier): per-cell falsifiable thresholds with re-score triggers, editable in the drawer; the external-signals prompt now asks Claude for falsifiable calibration notes too.
5. **Cross-lens interdependency patterns** (indicator library): bench-starves-rollout, structure-without-people, and the adoption red flag are computed automatically and shown as hero cards in the Trajectory view.
6. **Binding constraint** (scoring workflow #6): each Priority Board card names the lowest-level cell that is *not already improving* — the true intervention target.
7. **Scoring discipline at the point of use** (protocols #5–6): the drawer's level picker now carries the anti-inflation rule — between two levels take the lower; announcements justify trajectory, not level.
8. Conditional outlook phrasing ("toward L3 within 2 cycles IF indicators hold") and a version/provenance footer per the dashboard skill's shipping checklist.

## Sources consulted

- [AIHR — 10 Workforce Analytics Trends Shaping HR in 2026](https://www.aihr.com/blog/workforce-analytics-trends/)
- [AIHR — 11 HR Trends for 2026: Shaping What's Next](https://www.aihr.com/blog/hr-trends/)
- [GoProfiles — The Analytics Maturity Gap in HR: Why Real-Time Workforce Insights Matter in 2026](https://www.goprofiles.io/blog/hr-analytics-maturity-gap-2026/)
- [SutiSoft — HR Analytics Maturity Model: Predictive Workforce Intelligence](https://www.sutisoft.com/blog/hr-analytics-maturity-model-predictive-workforce-intelligence/)
- [TechFunnel — The HR Leader's Guide to Workforce Analytics in 2026](https://www.techfunnel.com/hr-tech/hr-leaders-guide-workforce-analytics-2026/)
- [Deloitte — The skills-based organization: A new operating model for work and the workforce](https://www.deloitte.com/us/en/insights/topics/talent/organizational-skill-based-hiring.html)
- [Wowledge — 2026 HR Trends](https://wowledge.com/blog/2026-hr-trends)
- [Improvado — Analytics Maturity Model: A 2026 Guide](https://improvado.io/blog/analytics-maturity-model)

## What the research says, in brief

1. **Descriptive → predictive is the defining shift.** 2026 workforce-analytics practice centres on leading indicators and early-risk signals (predictive retention, skills-gap trajectories) rather than point-in-time reporting. A capability diagnostic that only answers "where do we stand?" is a year behind; it must also answer "where are we heading?".
2. **Dynamic capability sensing.** Skills intelligence — continuously assessing capabilities and predicting future needs from live signals — is replacing annual, static assessments. The practical version of this for an executive diagnostic is *user-maintained leading indicators per cell*, refreshed at each recalibration.
3. **Maturity advances unevenly; adoption beats sophistication.** Organisations commonly have strong tools with weak adoption. Deployment friction is a first-order product risk — which directly motivated the zero-install Local Edition for a non-technical owner.
4. **Explainability is a governance requirement.** Boards and reviewers must be able to interrogate any model-driven signal. Hence the deliberately simple, one-sentence-explainable momentum formula rather than black-box scoring.
5. **Evidence-grounded, versioned artefacts** remain the standard for board-grade people analytics — retained from v2 and strengthened (versioning now *feeds* the forecast, making the audit discipline self-rewarding).

## Changes by artefact

### PRD v2 → v3 (`Capability_Compass_PRD_v3.md`)
- Added the **predictive trajectory layer (F15)**: per-cell momentum, leading indicators, 2-cycle directional projection, trajectory classification vocabulary, Capability Velocity KPI. (Trends 1, 2.)
- Restructured into **Local Edition** (zero-dependency browser app, ships now) and **Pro Edition** (the v2 full-stack RAG/Claude spec, roadmap). (Trend 3 — the v2 stack was undeployable by the product's own primary persona.)
- Added the eleventh product principle: *directionally predictive, transparently so*. (Trend 4.)
- Promoted the Delta view to P0 because snapshots now anchor the momentum baseline. (Trend 5.)
- Added a forecast-honesty success metric (≥60% of directional calls confirmed at next recalibration) and a false-confidence risk with mitigations.

### Rubric v3 → v4 (`Capability_Diagnostic_Rubric_v4.md`)
- **Generalised**: all organisation-specific (restricted) content removed so the rubric can live in a shared repository; industry presets in the app supply cluster scaffolds instead.
- Added the **momentum scale** (leading indicators, blend formula, classification table) alongside the 4-level maturity scale, with the display rule that direction is always symbol + word, never colour.
- Added the **forecast honesty ritual** to the recalibration rules.

### Dashboard skill v1 → v2 (`capability_dashboard_skill_v2.md`)
- Specialised from "fix a static financial dashboard" to the capability-diagnostic domain.
- Added the **trajectory grammar**: now→projected dumbbells (solid vs outlined dots — a shape channel), momentum arrows always paired with words, classification badges as text, alert strips with glyph+heading reinforcement, and "directional, not deterministic" honesty labels.
- Added interaction guardrails: everything clicks through to one drawer; level edits require a typed rationale.

## What was deliberately kept

The colorblind-safe navy ramp with amber attention flags, quadruple encoding, the two contrasting reads (Signal Matrix / Priority Board), weakest-first sorting, always-visible priority moves, hero cross-cluster patterns, the drill-down drawer, evidence grounding, and mandatory change rationales. These were already ahead of common practice and are preserved verbatim.
