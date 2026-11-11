# Project State — Capability Compass

**Read this first in any new session.** This file, not chat history, is the source of truth. If chat memory and this file disagree, this file wins.

- **Owner:** Eric (non-technical) · **Branch:** `claude/org-diagnostic-system-app-syt54v`
- **What it is:** a zero-install organizational capability diagnostic that runs by double-clicking `app/index.html`. No server, no accounts; all data stays in the browser.
- **Last updated:** 2026-11-11

## Status: working and fully tested

| Check | Command | Current |
|---|---|---|
| Data contract (backend ↔ frontend) | `node tests/contract_test.js` | ✅ 185 checks passing |
| End-to-end browser (mock mode) | `node tests/e2e_mock_test.js` | ✅ 152 checks passing |
| Both at once | `./run_checks.sh` | ✅ green |

## What the app does today

| Area | State |
|---|---|
| Signal Matrix, Priority Board, drill-down drawer | Done |
| Trajectory (momentum, confidence, watch signals, unknown-is-honest) | Done |
| Delta / version snapshots | Done |
| Value Chain — follow the money, P&L levers → clusters | Done |
| Cluster calibration — the money map tests and tunes the cluster set itself (4 automatic tests + optional Claude pass, nothing auto-applied) | Done |
| Roles — two-axis rubric (Criticality × Tacit-Knowledge), 4 routes, 2 registers | Done |
| Evidence — document upload (PDF/Word/PowerPoint/Excel/text parsed locally), Claude synthesis, role extraction, templates | Done |
| Signals — external market scan with harvest discipline | Done |
| Claude API settings (key isolated from exported data), mock mode | Done |
| Blueprint — workflow diagram + shipped self-assessment (9 strengths / 9 watch-outs, each with a mitigation) | Done |
| "How to fill this in" guidance on Value Chain and Roles | Done |
| Role rubric v4.4 — six criteria, embedded scoring guide with 1/3/5 anchors, legacy migration | Done |

## This session (2026-11-11) — make the Compass the first app of the four-app leapfrog workflow

Owner decisions (2026-11-11): keep one rater per cell · evidence grade is the assessor's judgement with the evidence visible, NOT a two-source rule · optional currency figure per lever, an estimate until validated · add a Stage 1 readiness check and pilot shortlist · one stable ID language across the four apps · multiple named workspaces and a value-stream option · Delta becomes the Stage 5 scoreboard · embed Stage 0 (Frame) here · simplify navigation.

Sibling apps read for context (read-only clones): Org Modeling, Process Map Studio, AI Org Advisory Workbench. None of them knows about the Compass, so there was no hand-off format to match; it is defined here (`docs/HANDOFF_FORMAT.md`).

Increments (each ends green and committed):
- [x] I1 — Stable IDs, hand-off logic and contract (`app/js/handoff.js`, schema, contract tests)
- [x] I2 — Workspaces (several named diagnostics) and the value-stream option
- [ ] I3 — Stage 0 Charter view (thesis, principles, reference model, criteria, gate, rules, decision log, lock)
- [ ] I4 — Evidence grade per cell and signal; cross-app ID on evidence; currency per lever and money at risk
- [ ] I5 — Stage 1 readiness check, pilot shortlist, hand-off packet and per-app briefs
- [ ] I6 — Stage 5 scoreboard (trend across versions, forecast check) on the Delta view
- [ ] I7 — Journey home and stage-ordered navigation
- [ ] I8 — Docs (GUIDE, README, DECISIONS, HANDOFF_FORMAT), final full mock test

## Done in the last session

1. **Role rubric simplified: ten criteria to six.** Axis A is now Consequence 45% / Scarcity 35% / Trend 20%; Axis B is Time to competence / Locked in heads / Relationship capital. Removed: the three-way consequence double count on Axis A, the cross-axis consequence duplicate on Axis B, and a 10% weight that could never cross the 3.5 routing threshold. Fixed: "codifiability" was scored backwards from its own label.
2. **Embedded scoring guide.** Every column heading opens its criterion's card — the question, what it covers, what it explicitly does *not* cover, written 1/3/5 anchors, and the remedy a high score points at. A Scoring guide button opens all six. Definitions now appear where the scoring happens.
3. **Deterministic legacy migration** in saved state, JSON import, the roles CSV (v4.2 headers still accepted) and LLM replies — routing preserved, idempotent, asserted by tests.
4. The register now fits a laptop without horizontal scrolling (12 columns, not 16).
5. Rubric §4c rewritten; PRD gains F19. Coverage: contract 164 → 185, e2e 142 → 152.

## Suggested next session

- **Board briefing export**: a one-page PDF that leads with value exposure, the two role registers, and the top three moves
- **Half-yearly recalibration reminder**: prompt to re-score when a snapshot is older than 6 months
- **Second worked example**: a services-industry demo alongside the aviation one
- **Calibration history**: keep more than the latest Claude calibration and show what was applied vs dismissed over time
- **Close watch-out D**: score last cycle's directional calls against what happened (the rubric's forecast-honesty ritual) in the Delta view
- **Close watch-out A**: an optional second-rater column on the highest-weight cells, with disagreement surfaced rather than averaged

## How to resume

1. `cd` into the repo, run `./run_checks.sh` — everything must be green before new work
2. Read `DECISIONS.md` for why things are built the way they are
3. Pick the next item above, or ask the owner what matters most
