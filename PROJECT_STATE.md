# Project State — Capability Compass

**Read this first in any new session.** This file, not chat history, is the source of truth. If chat memory and this file disagree, this file wins.

- **Owner:** Eric (non-technical) · **Branch:** `claude/org-diagnostic-system-app-syt54v`
- **What it is:** a zero-install organizational capability diagnostic that runs by double-clicking `app/index.html`. No server, no accounts; all data stays in the browser. It is the first of four apps in the owner's six-stage leapfrog workflow (with Org Modeling, Process Map Studio and the AI Org Advisory Workbench): it runs Stage 0, Stage 1 and Stage 5 and writes the hand-off the others start from.
- **Last updated:** 2026-11-13

## Status: working and fully tested

| Check | Command | Current |
|---|---|---|
| Data contract (backend ↔ frontend) | `node tests/contract_test.js` | ✅ 315 checks passing |
| End-to-end browser (mock mode) | `node tests/e2e_mock_test.js` | ✅ 279 checks passing |
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
| Countries: one workspace per country from one frame (same IDs, blank scores); roles "to confirm" | Done |
| Current State — compare countries by ID; class each difference Required / Chosen / Inherited | Done |
| Current State — import the other apps' findings files; cite a finding on a cell | Done |
| Current State — six-page EXCO readout that prints as a PDF | Done |

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
- [x] K2 — Import the other apps' return files; findings register; cite a finding on a cell
- [x] K3 — Compare view: variation map, roles by country, differences classed Required / Chosen / Inherited
- [x] K4 — EXCO readout: six printable pages assembled from the above
- [x] K5 — Docs and final full mock test

## This session (2026-11-21) — make the Frame and Focus stages sound for a real current-state analysis

Owner approved seven changes after reviewing a real SG Hub workspace (2026-11-21). Spend cap: build in a few large increments, commit after each.
- [x] R1 — "Not scored" means not scored everywhere (tiles, KPIs, averages, ranking, money, trends, AI scan, hand-off); picking a level marks a cell scored; Clear score; migration marks cells that clearly carry a score. Versions must hold scores to count (warn on save; trends skip unscored; delete a version).
- [x] R2 — Cluster scope (Scored / Enabler / Context only, context synced to the Hand-off decision); rename asks keep-or-new-ID once the ID has travelled.
- [x] R3 — Units to compare: unit word, tier, a Charter card that creates units from the locked frame, and bringing frame changes into a unit (additions and renames only).
- [x] R4 — Diagnostic question relabel (no preset solutions seeded); quick-win candidates on cells, listed on readout page 6.
- [x] R5 — Workflow board, guide, decisions; full mock test plus a check on a copy of the owner's workspace (not committed).

## This session (2026-11-25) — answer five EXCO questions across units

Owner approved A, B and D (2026-11-25) after a review of the five questions (decision rights, steps and handoffs, spans and layers, common and unique roles, finance and productivity). Spend cap: few large increments.
- [x] E1 — Unit economics on each unit (revenue, manpower and non-manpower cost, head-count, one volume measure; derived ratios; estimate until validated; head-count and people cost can be taken from an Org Modeling file, always overridable). Readout page 1 table.
- [x] E2 — Structure table on readout page 4 from Org Modeling's structural findings (numbers read from an optional `metrics` object, else from the figure text).
- [x] E3 — Accountable beside who decides on readout page 3 (optional `accountable` and `accountable_contested` on findings; owner can enter or correct it).
- [x] E4 — Contract and browser checks, HANDOFF_FORMAT, GUIDE, DECISIONS, workflow board; PRDs for Org Modeling and Process Map Studio.

## Done in this session (2026-11-25)

1. Unit economics on each unit (Value Chain); ratios worked out; Org Modeling head-count and base-salary cost offered; readout page 1 table.
2. Spans-and-layers table per unit on readout page 4, from Org Modeling's numbers or, for older files, its wording.
3. On paper, decides in practice and accountable on readout page 3; the owner can fill or correct them in the findings register.
4. PRDs: `docs/sibling_prds/PRD_org_modeling_structure_numbers.md` and `docs/sibling_prds/PRD_process_map_studio_accountability.md`. Samples rebuilt with the new fields.
5. Not done, by owner choice: step and handoff counts per unit (C) and role families across units (E).

## Done in this session (2026-11-21)

1. Not scored is not Level 1, everywhere; picking a level scores a cell; Clear score; already-scored cells marked on load.
2. Versions must hold scores to count; warn on save; delete a version.
3. Cluster scope (Scored, Enabler, Context only); keep-or-new-ID on rename once the ID has travelled.
4. Units to compare on the Charter: unit word, tier, units created from the frame, frame changes brought in (additions and renames only).
5. Diagnostic question relabel; quick-win candidates on readout page 6.
6. Found by the new browser checks and fixed: "same capability" on rename did not save the description and question.
7. Checked on a copy of the owner's SG Hub workspace (not committed): imports cleanly, 0 of 28 scored, no false Action pills, empty versions ignored, calibration clears once Enterprise Leadership is an Enabler.

## Done later on 2026-11-13: PRDs for the two sibling changes

1. `docs/sibling_prds/PRD_org_modeling_countries.md`: Country column, by-country view, one packet per country, Compass roles by country with a reason, one findings file per country (new kind `role_reason`).
2. `docs/sibling_prds/PRD_process_map_studio_countries.md`: country on an engagement, start a country from another's scope, line up two published maps, class each difference, print, and return `variation` findings (`Vn`); topics on existing findings.
3. The Compass now reads the optional `country`, `topic`, `reason_class` and `compared_with` fields and the two new kinds, and shows "why" and "vs <country>" on findings.
4. Fixed: a pilot copied to another country, or dropped and chosen again, now keeps its `VS-nn` (it used to get a new number, which would have stopped Process Map Studio matching the two maps).
5. Fictional samples in `docs/samples/countries/` (three packets, an org file with a Country column, the two expected return files), rebuilt by `scripts/make_country_samples.js` and imported by the contract suite.
6. Fixed demo findings that used the Compass's `DC-n` prefix as their ID.

## Done in this session (2026-11-13)

1. Countries (`app/js/compare.js`, workspace box): a workspace says which country it covers; "Add another country" copies the frame and every ID with all judgements blank. Roles carried over are "to confirm".
2. Current State screen (`app/js/current.js`), after Hand-off, in three parts: Compare countries, Findings from the other apps, EXCO readout.
3. The comparison (classes, verdict, ask) is stored once per family of countries (`capability_compass_frame_<frameId>`), so it is the same whichever country is open, and also travels inside each export.
4. The demo gained two fictional countries (Belmar, Caldera) and fictional findings files, loaded from Current State.
5. Hand-off wording corrected: the other apps now read the packet. Journey Stage 3 points at Current State.
6. Checks: contract 250 → 315, end-to-end 224 → 279. All green. The readout is tested to print on exactly six pages.

## Done in the earlier session (2026-11-11)

1. Read the three sibling apps. None refers to the Compass, so the hand-off language was defined here: `docs/HANDOFF_FORMAT.md`.
2. Stable IDs that are never reused; one evidence grammar; a hand-off packet with a block shaped for each receiving app (`app/js/handoff.js`).
3. Workspaces and the value-stream option (`app/js/workspaces.js`).
4. Stage 0 Charter, Journey home, Hand-off view and Scoreboard (`app/js/stages.js`); navigation reordered to follow the six stages.
5. Evidence grades, cross-app IDs on evidence, and money at risk in currency.
6. Fixed a lost click when a button was pressed straight after typing in a field (found by the Charter browser test; fixed app-wide).
7. Unpinned the browser test from one Chromium build so it survives machine updates.
8. Checks: contract 185 → 250, end-to-end 152 → 224. All green.

## Not done, and why

- **"Why this role exists" has no field of its own here.** It arrives as an Org Modeling `role_reason` finding. The PRD is written (`docs/sibling_prds/PRD_org_modeling_countries.md`); the owner applies it in that repository.
- **Process Map Studio cannot yet compare two published maps** (one per country). The PRD is written (`docs/sibling_prds/PRD_process_map_studio_countries.md`); the owner applies it in that repository. Until then, the Compass lines up each country's findings side by side on readout pages 3 and 5.
- **Scores across countries are not calibrated between raters.** The Compare screen says so. A cross-country calibration step (country leads reviewing each other's evidence for the widest gaps) is a working practice, not a feature.
- **Operating-model hypotheses H1 to H4** (playbook Stage 1) are written in Org Modeling, not here.
- **A second rater** was deliberately not added (owner decision).

## Suggested next session

- When the owner has applied the two country PRDs, re-read both repositories, import their real return files, and check the readout pages 3–5.
- Run a real two-country comparison and note where the wording or the six pages fight you.
- A group roll-up workspace that reads the country workspaces, if EXCO asks for one number per capability.

## How to resume

1. `cd` into the repo and run `./run_checks.sh` — both suites must pass before new work. The browser suite needs Playwright (`npm install playwright`); it is skipped with a clear message when absent.
2. Read `DECISIONS.md` (59 entries) for why things are built the way they are, and `docs/HANDOFF_FORMAT.md` for the shared language.
3. Where things live: scoring and prediction in `app/js/engine.js`; IDs, gates, packet and scoreboard logic in `app/js/handoff.js`; Journey, Charter, Hand-off and Scoreboard screens in `app/js/stages.js`; workspace storage in `app/js/workspaces.js`; country comparison, findings files and the readout model in `app/js/compare.js`; the Current State screen in `app/js/current.js`; everything else in `app/js/app.js`; the data contract in `app/js/schema.js`.
4. Watch out for: workspaces copied from one frame share a `frameId`, and their comparison is kept under `capability_compass_frame_<frameId>` and re-read whenever a workspace is opened; the active workspace is stored under the original key `capability_compass_state_v1`, other workspaces under `capability_compass_ws_<id>`; a redraw is deliberately delayed while the mouse is down (`renderAll` in `app.js`).
