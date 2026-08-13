# Project State — Capability Compass

**Read this first in any new session.** This file, not chat history, is the source of truth. If chat memory and this file disagree, this file wins.

- **Owner:** Eric (non-technical) · **Branch:** `claude/org-diagnostic-system-app-syt54v`
- **What it is:** a zero-install organizational capability diagnostic that runs by double-clicking `app/index.html`. No server, no accounts; all data stays in the browser.
- **Last updated:** 2026-08-12

## Status: working and fully tested

| Check | Command | Current |
|---|---|---|
| Data contract (backend ↔ frontend) | `node tests/contract_test.js` | ✅ 164 checks passing |
| End-to-end browser (mock mode) | `node tests/e2e_mock_test.js` | ✅ 142 checks passing |
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

## Done in the last session

1. **Value chain now calibrates the cluster set** (previous session's core work): four automatic tests — ownership, materiality, separability, diagnosability — plus map coverage, a calibration panel with one-click structural fixes, an optional Claude tuning pass (proposals only), industry starter levers at 0% weight, and materiality propagated across all three reads.
2. **New Blueprint view** (`app/js/blueprint.js`): a five-band SVG of the whole workflow — Inputs → Ground it → Score → Engine → Reads — with both feedback loops drawn (calibration re-shapes the rows; a saved version becomes the momentum baseline). Counters read the live state, so every claim is checkable against the user's own diagnostic.
3. **The self-assessment ships inside the product**: 9 strengths and 9 watch-outs, each badged onto the exact stage it applies to. Every watch-out carries a concrete mitigation. The verdict states plainly that this is structured expert judgement, not a measurement instrument — and names single-rater scoring and the single-snapshot baseline as the first things a challenger will find.
4. **"How to fill this in" panels** on Value Chain and Roles — ordered steps, one worked line, scale anchors so two raters would agree, and the mistake that actually happens (false precision in weights; scoring seniority instead of the two axes). Collapsed by default.
5. Contract tests now enforce **both directions** between the diagram and the assessment: no badge without an explanation, no explanation without a badge — so the picture and the prose cannot drift apart.
6. Coverage: contract 142 → 164, e2e 128 → 142.

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
