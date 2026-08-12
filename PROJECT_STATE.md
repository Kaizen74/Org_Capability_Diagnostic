# Project State — Capability Compass

**Read this first in any new session.** This file, not chat history, is the source of truth. If chat memory and this file disagree, this file wins.

- **Owner:** Eric (non-technical) · **Branch:** `claude/org-diagnostic-system-app-syt54v`
- **What it is:** a zero-install organizational capability diagnostic that runs by double-clicking `app/index.html`. No server, no accounts; all data stays in the browser.
- **Last updated:** 2026-07-07

## Status: working and fully tested

| Check | Command | Current |
|---|---|---|
| Data contract (backend ↔ frontend) | `node tests/contract_test.js` | ✅ 98 checks passing |
| End-to-end browser (mock mode) | `node tests/e2e_mock_test.js` | ✅ 93 checks passing |
| Both at once | `./run_checks.sh` | ✅ green |

## What the app does today

| Area | State |
|---|---|
| Signal Matrix, Priority Board, drill-down drawer | Done |
| Trajectory (momentum, confidence, watch signals, unknown-is-honest) | Done |
| Delta / version snapshots | Done |
| Value Chain — follow the money, P&L levers → clusters | Done |
| Roles — two-axis rubric (Criticality × Tacit-Knowledge), 4 routes, 2 registers | Done |
| Evidence — document upload (PDF/Word/PowerPoint/Excel/text parsed locally), Claude synthesis, role extraction, templates | Done |
| Signals — external market scan with harvest discipline | Done |
| Claude API settings (key isolated from exported data), mock mode | Done |

## Done in the last session

1. Reviewed the rubric against the SATS value-chain blueprint as a test case
2. Added the Value Chain layer (economic weight per cluster → value-exposure ranking on the board)
3. Added the Roles layer: two-axis scoring, four routes, critical-role register + key-person register, CSV import
4. Applied the web-harvester discipline to the external-signal prompt (triangulation, source quality 1–5, anti-fabrication)
5. Taught the evidence analyser to extract anchor roles from org charts and job-title files
6. Added upload templates (role inventory, value chain, evidence checklist)
7. Navigation grouped into "Diagnose" and "Ground it"; project-state files added

## Suggested next session

- **Board briefing export**: a one-page PDF that leads with value exposure, the two role registers, and the top three moves
- **Half-yearly recalibration reminder**: prompt to re-score when a snapshot is older than 6 months
- **Second worked example**: a services-industry demo alongside the aviation one

## How to resume

1. `cd` into the repo, run `./run_checks.sh` — everything must be green before new work
2. Read `DECISIONS.md` for why things are built the way they are
3. Pick the next item above, or ask the owner what matters most
