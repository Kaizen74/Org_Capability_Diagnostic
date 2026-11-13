# Project State — Capability Compass

**Read this first in any new session.** This file, not chat history, is the source of truth. If chat memory and this file disagree, this file wins.

- **Owner:** Eric (non-technical) · **Branch:** `claude/org-diagnostic-system-app-syt54v`
- **What it is:** a zero-install organizational capability diagnostic that runs by double-clicking `app/index.html`. No server, no accounts; all data stays in the browser. It is the first of four apps in the owner's six-stage leapfrog workflow (with Org Modeling, Process Map Studio and the AI Org Advisory Workbench): it runs Stage 0, Stage 1 and Stage 5 and writes the hand-off the others start from.
- **Last updated:** 2026-11-13

## Status: working and fully tested

| Check | Command | Current |
|---|---|---|
| Data contract (backend ↔ frontend) | `node tests/contract_test.js` | ✅ 250 checks passing |
| End-to-end browser (mock mode) | `node tests/e2e_mock_test.js` | ✅ 224 checks passing |
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
| Journey home and stage-ordered navigation | Done |
| Workspaces (several named diagnostics); capability-cluster or value-stream rows | Done |
| Stage 0 Charter with lock and logged amendments | Done |
| Stable IDs on clusters, levers, roles, signals, pilots and charter items | Done |
| Evidence grade per cell and signal (assessor's judgement); cross-app ID on evidence | Done |
| Optional amount at stake per lever; money at risk in currency, an estimate until validated | Done |
| Stage 1 readiness check, pilot shortlist, hand-off packet and per-app briefs | Done |
| Stage 5 Scoreboard: trend across versions and forecast check | Done |

## This session (2026-11-11) — make the Compass the first app of the four-app leapfrog workflow

Owner decisions (2026-11-11): keep one rater per cell · evidence grade is the assessor's judgement with the evidence visible, NOT a two-source rule · optional currency figure per lever, an estimate until validated · add a Stage 1 readiness check and pilot shortlist · one stable ID language across the four apps · multiple named workspaces and a value-stream option · Delta becomes the Stage 5 scoreboard · embed Stage 0 (Frame) here · simplify navigation.

Sibling apps read for context (read-only clones): Org Modeling, Process Map Studio, AI Org Advisory Workbench. None of them knows about the Compass, so there was no hand-off format to match; it is defined here (`docs/HANDOFF_FORMAT.md`).

Increments (each ends green and committed):
- [x] I1 — Stable IDs, hand-off logic and contract (`app/js/handoff.js`, schema, contract tests)
- [x] I2 — Workspaces (several named diagnostics) and the value-stream option
- [x] I3 — Stage 0 Charter view (thesis, principles, reference model, criteria, gate, rules, decision log, lock)
- [x] I4 — Evidence grade per cell and signal; cross-app ID on evidence; currency per lever and money at risk
- [x] I5 — Stage 1 readiness check, pilot shortlist, hand-off packet and per-app briefs
- [x] I6 — Stage 5 scoreboard (trend across versions, forecast check) on the Delta view
- [x] I7 — Journey home and stage-ordered navigation (done with I3)
- [x] I8 — Docs (GUIDE, README, DECISIONS, HANDOFF_FORMAT), final full mock test

## This session (2026-11-13) — current-state analysis across countries, and an EXCO readout

Owner decisions (2026-11-13): the comparison unit is **country** · start with the Compass · Process Map Studio's "no cross-engagement comparison" rule may be reversed later (not this session).
Context checked today: all three sibling apps now read the `compass-handoff` file and write `compass-return` v1.0 (ref, kind, title, detail, grade, figure, relates_to, source_note).

Increments (each ends green and committed):
- [x] K1 — Country on a workspace; copy a workspace's frame to another country (same IDs, blank scores); comparison logic and contract (`app/js/compare.js`)
- [ ] K2 — Import the other apps' return files; findings register; cite a finding on a cell
- [ ] K3 — Compare view: variation map, roles by country, differences classed Required / Chosen / Inherited
- [ ] K4 — EXCO readout: six printable pages assembled from the above
- [ ] K5 — Docs and final full mock test

## Done in this session (2026-11-11)

1. Read the three sibling apps. None refers to the Compass, so the hand-off language was defined here: `docs/HANDOFF_FORMAT.md`.
2. Stable IDs that are never reused; one evidence grammar; a hand-off packet with a block shaped for each receiving app (`app/js/handoff.js`).
3. Workspaces and the value-stream option (`app/js/workspaces.js`).
4. Stage 0 Charter, Journey home, Hand-off view and Scoreboard (`app/js/stages.js`); navigation reordered to follow the six stages.
5. Evidence grades, cross-app IDs on evidence, and money at risk in currency.
6. Fixed a lost click when a button was pressed straight after typing in a field (found by the Charter browser test; fixed app-wide).
7. Unpinned the browser test from one Chromium build so it survives machine updates.
8. Checks: contract 185 → 250, end-to-end 152 → 224. All green.

## Not done, and why

- **The other three apps do not read the hand-off packet.** That is a change in their repositories, which this session could only read. Until then the per-app briefs are pasted by hand.
- **The Compass does not import a file from the other apps.** Findings come back through Evidence, citing the other app's ID.
- **Operating-model hypotheses H1 to H4** (playbook Stage 1) are written in Org Modeling, not here.
- **A second rater** was deliberately not added (owner decision).

## Suggested next session

- Teach Org Modeling to read `for_apps.org_modeling` from the packet (criteria and strategy text), so that step stops being copy and paste. Then the same for Process Map Studio's engagement scope card.
- A board briefing export that leads with money at risk, the pilot decision and the two role registers.
- Run a real engagement through Stage 0 and Stage 1 and note where the wording or the defaults fight you.

## How to resume

1. `cd` into the repo and run `./run_checks.sh` — both suites must pass before new work. The browser suite needs Playwright (`npm install playwright`); it is skipped with a clear message when absent.
2. Read `DECISIONS.md` (44 entries) for why things are built the way they are, and `docs/HANDOFF_FORMAT.md` for the shared language.
3. Where things live: scoring and prediction in `app/js/engine.js`; IDs, gates, packet and scoreboard logic in `app/js/handoff.js`; Journey, Charter, Hand-off and Scoreboard screens in `app/js/stages.js`; workspace storage in `app/js/workspaces.js`; everything else in `app/js/app.js`; the data contract in `app/js/schema.js`.
4. Watch out for: the active workspace is stored under the original key `capability_compass_state_v1`, other workspaces under `capability_compass_ws_<id>`; a redraw is deliberately delayed while the mouse is down (`renderAll` in `app.js`).
