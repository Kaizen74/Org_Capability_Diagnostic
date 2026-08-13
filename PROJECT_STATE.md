# Project State — Capability Compass

**Read this first in any new session.** This file, not chat history, is the source of truth. If chat memory and this file disagree, this file wins.

- **Owner:** Eric (non-technical) · **Branch:** `claude/org-diagnostic-system-app-syt54v`
- **What it is:** a zero-install organizational capability diagnostic that runs by double-clicking `app/index.html`. No server, no accounts; all data stays in the browser.
- **Last updated:** 2026-08-12

## Status: working and fully tested

| Check | Command | Current |
|---|---|---|
| Data contract (backend ↔ frontend) | `node tests/contract_test.js` | ✅ 142 checks passing |
| End-to-end browser (mock mode) | `node tests/e2e_mock_test.js` | ✅ 128 checks passing |
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

## Done in the last session

1. **Closed the biggest coherence gap: the value chain now calibrates the Signal Matrix, not just the ranking.** Four automatic tests run whenever a lever or weight changes — ownership (money with no cluster), materiality (cluster with no money), separability (one cluster hiding two disciplines), diagnosability (a lever with no named capability) — plus overall map coverage.
2. Added a **Cluster calibration** panel to the Value Chain view: a plain-English verdict on whether the cluster set fits the economics, the findings, and one-click structural fixes (add a cluster for an orphan lever, split an overloaded one, merge or remove a weightless one).
3. Added an optional **"Tune clusters with Claude"** pass with full harvest discipline, returning add / merge / rename / split / **keep** proposals with rationale, source and confidence. Proposals only — every structural change needs a click.
4. **Industry presets now ship starter P&L levers** for all seven industries, each pointed at the cluster that should own it, all at **0% weight** — the structure of the money map without inventing a single economic figure.
5. **Materiality now travels with the ratings**: every Signal Matrix row shows its share of the P&L, the Matrix / Board / Trajectory views share one ordering basis, trajectory alerts lead with the biggest money at risk, and the cluster editor states the cluster's economic weight before you merge or remove it.
6. The **money map is now fed into the research and extraction prompts** — external scans and document analysis weight findings by which lever they touch (and it is omitted entirely when no weights exist).
7. Roles view grounds the *value-chain pivotalness* criterion in the cluster's actual economic weight.
8. Rubric extended with §4d; 77 new automated checks (contract 98 → 142, e2e 93 → 128).

## Suggested next session

- **Board briefing export**: a one-page PDF that leads with value exposure, the two role registers, and the top three moves
- **Half-yearly recalibration reminder**: prompt to re-score when a snapshot is older than 6 months
- **Second worked example**: a services-industry demo alongside the aviation one
- **Calibration history**: keep more than the latest Claude calibration and show what was applied vs dismissed over time

## How to resume

1. `cd` into the repo, run `./run_checks.sh` — everything must be green before new work
2. Read `DECISIONS.md` for why things are built the way they are
3. Pick the next item above, or ask the owner what matters most
