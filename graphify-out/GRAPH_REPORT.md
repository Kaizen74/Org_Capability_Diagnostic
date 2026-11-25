# Graph Report - Org_Capability_Diagnostic  (2026-11-25)

## Corpus Check
- 41 files · ~161,463 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .css 1, .csv 1)

## Summary
- 906 nodes · 1420 edges · 40 communities (35 shown, 5 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 75 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0201d1d5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- contract_test.js
- engine.js
- app.js
- llm.js
- presets.js
- schema.js
- handoff.js
- Capability Compass — Organizational Capability Diagnostic
- Capability Compass — Product Requirements Document v3.0
- parsers.js
- make_country_samples.js
- Capability Diagnostic Rubric — v4.4 (Industry-Agnostic, Predictive, Value-Calibrated)
- run_checks.sh
- Improvements Log — Research Basis for the v3/v4/v2 Revisions
- stages.js
- Capability Dashboard Data-Viz Skill — v2
- Capability Compass — Plain-Language Guide
- Project State — Capability Compass
- workspaces.js
- run
- compare.js
- PRD — Org Modeling: shared language and hand-off with the other three apps
- PRD — Process Map Studio: shared language and hand-off with the other three apps
- PRD — AI Org Advisory Workbench: shared language and hand-off with the other three apps
- CLAUDE.md
- .claude/CLAUDE.md
- current.js
- DECISIONS.md
- blueprint.js
- PRD: Process Map Studio, the same process in another country
- PRD: Org Modeling, roles and structure by country
- pk
- PRD: Org Modeling, structure and people cost as numbers for the Compass
- PRD: Process Map Studio, who decides and who is accountable, sent to the Compass
- econNum
- readoutModel
- compareFindings
- sourceAppName
- sopSummary
- unitStructure

## God Nodes (most connected - your core abstractions)
1. `renderAll()` - 37 edges
2. `toast()` - 33 edges
3. `esc()` - 26 edges
4. `Project State — Capability Compass` - 19 edges
5. `nowIso()` - 17 edges
6. `readoutModel()` - 17 edges
7. `renderView()` - 16 edges
8. `openClusterModal()` - 15 edges
9. `validateState()` - 15 edges
10. `Capability Compass — Plain-Language Guide` - 15 edges

## Surprising Connections (you probably didn't know these)
- `How to resume` --references--> `renderAll()`  [INFERRED]
  PROJECT_STATE.md → app/js/app.js
- `3. The packet` --references--> `validateHandoffPacket()`  [INFERRED]
  docs/HANDOFF_FORMAT.md → app/js/schema.js
- `7. Functional requirements` --references--> `validateCalibration()`  [INFERRED]
  docs/Capability_Compass_PRD_v3.md → app/js/schema.js
- `7. Functional requirements` --references--> `proposeClusterCalibration()`  [INFERRED]
  docs/Capability_Compass_PRD_v3.md → app/js/llm.js
- `migrateState()` --indirect_call--> `migrateRoleScores()`  [INFERRED]
  app/js/app.js → app/js/engine.js

## Import Cycles
- None detected.

## Communities (40 total, 5 thin omitted)

### Community 0 - "contract_test.js"
Cohesion: 0.01
Nodes (187): afterDelete, allIdx, allRefs, allTki, anaPrompt, anaPrompt2, appSrc, axA (+179 more)

### Community 1 - "engine.js"
Cohesion: 0.07
Nodes (52): avgOrLast(), AXIS_A_WEIGHTS, bindingConstraint(), calibrateClusters(), calibrationSummary(), cellAssessed(), cellConfidence(), cellMomentum() (+44 more)

### Community 2 - "app.js"
Cohesion: 0.07
Nodes (95): addCluster(), addCountryWorkspace(), addEvidenceFiles(), adoptNewState(), adoptSharedComparison(), afterPointer(), afterPointerQueue, applyCalibrationProposal() (+87 more)

### Community 3 - "llm.js"
Cohesion: 0.17
Nodes (22): analyzeEvidence(), anthropicRequest(), bufferToBase64(), buildAnalysisContent(), buildAnalysisPrompt(), buildCalibrationPrompt(), buildScanPrompt(), docKindFor() (+14 more)

### Community 4 - "presets.js"
Cohesion: 0.07
Nodes (30): buildDemoCountry(), buildDemoState(), DEFAULT_LENSES, DEFAULT_PATTERNS, DEFAULT_RUBRIC, DEMO_COUNTRIES, DEMO_DATA, DEMO_DECISIONS (+22 more)

### Community 5 - "schema.js"
Cohesion: 0.39
Nodes (17): _isArr(), _isObj(), _isStr(), _score1to5(), validateAnalysis(), validateBriefing(), validateCalibration(), validateCell() (+9 more)

### Community 6 - "handoff.js"
Cohesion: 0.13
Nodes (21): buildHandoffPacket(), cellRef(), clusterMoney(), criteriaWeightTotal(), defaultCharter(), ensureRefs(), EVIDENCE_GRADES, forecastCheck() (+13 more)

### Community 7 - "Capability Compass — Organizational Capability Diagnostic"
Cohesion: 0.06
Nodes (31): 1. One ID scheme, 2. One evidence grammar, 3. The packet, 4. What each app takes, and where it goes, 5. Coming back: the return file, 5a. Countries, 6. Changing this format, 7. Country samples (+23 more)

### Community 8 - "Capability Compass — Product Requirements Document v3.0"
Cohesion: 0.12
Nodes (15): 0. What changed from v2 and why (revision log), 10. Success metrics, 11. Risks & mitigations (Local Edition deltas), 12. Recalibration rules (carried from Rubric v4), 1. Vision, 2. Target users, 3. Product principles (v3 — eleven gates), 4.1 Local Edition (this repository — ships now) (+7 more)

### Community 9 - "parsers.js"
Cohesion: 0.36
Nodes (6): decodeXmlEntities(), docxXmlToText(), extractDocxText(), extractPptxText(), pptxXmlToText(), slideOrder()

### Community 10 - "make_country_samples.js"
Cohesion: 0.05
Nodes (25): belmar, belmarRows, bm, ceo, fs, header, holders(), layersIn() (+17 more)

### Community 11 - "Capability Diagnostic Rubric — v4.4 (Industry-Agnostic, Predictive, Value-Calibrated)"
Cohesion: 0.12
Nodes (15): 1. Purpose and what changed from v3, 2. Core model, 3. The 4-step maturity scale (position — lagging), 4. The momentum scale (direction — leading) *(new in v4)*, 4b. Value chain — the precursor layer (v4.2), 4c. The role layer — two axes, four routes (v4.2), 4d. The value chain calibrates the cluster set itself (v4.3), 5. Attention flag rule (+7 more)

### Community 13 - "Improvements Log — Research Basis for the v3/v4/v2 Revisions"
Cohesion: 0.18
Nodes (10): Changes by artefact, Dashboard skill v1 → v2 (`capability_dashboard_skill_v2.md`), Improvements Log — Research Basis for the v3/v4/v2 Revisions, PRD v2 → v3 (`Capability_Compass_PRD_v3.md`), Rubric v3 → v4 (`Capability_Diagnostic_Rubric_v4.md`), Sources consulted, Update — coherence review against the packaged skills (v4.1), Update — end-to-end coherence review (v4.3): the value chain calibrates the cluster set (+2 more)

### Community 14 - "stages.js"
Cohesion: 0.13
Nodes (23): bindCharterEvents(), bindCharterGate(), bindHandoffEvents(), bindUnitsCard(), CH_BLANK, chGate(), chRows(), chSet() (+15 more)

### Community 15 - "Capability Dashboard Data-Viz Skill — v2"
Cohesion: 0.22
Nodes (8): Capability Dashboard Data-Viz Skill — v2, Chart-type selection, Interaction patterns, Layout, Palette, The quadruple encoding rule (unchanged, non-negotiable), Trajectory grammar (new), What changed from v1

### Community 16 - "Capability Compass — Plain-Language Guide"
Cohesion: 0.12
Nodes (15): A first real diagnostic, step by step, Before you present it, Capability Compass — Plain-Language Guide, Current state across countries, Five questions EXCO asks of every unit (added 25 November 2026), Handing off to the other three apps, Ideas worth understanding, If something goes wrong (+7 more)

### Community 17 - "Project State — Capability Compass"
Cohesion: 0.10
Nodes (19): Done in the earlier session (2026-11-11), Done in this session (2026-11-13), Done in this session (2026-11-21), Done in this session (2026-11-25), Done later on 2026-11-13: PRDs for the two sibling changes, How to resume, Not done, and why, Project State — Capability Compass (+11 more)

### Community 18 - "workspaces.js"
Cohesion: 0.23
Nodes (6): wsEraseAll(), wsForget(), wsNewId(), wsReadIndex(), wsRegister(), wsWriteIndex()

### Community 19 - "run"
Cohesion: 0.50
Nodes (4): bad(), put(), run(), wfDemo()

### Community 20 - "compare.js"
Cohesion: 0.07
Nodes (26): applyFrameChanges(), blankCellLike(), charterCore(), cleanSop(), DECISION_FIELDS, DESIGN_CHOICES, DIFF_CLASSES, ECON_AMOUNTS (+18 more)

### Community 21 - "PRD — Org Modeling: shared language and hand-off with the other three apps"
Cohesion: 0.18
Nodes (10): 1. Why this change, 2.1 IDs, 2.2 Evidence grades, 2.3 The file this app reads: `compass-handoff` v1.0, 2.4 The file this app writes: `compass-return` v1.0, 2. The shared language (fixed; do not redesign), 3. What this means for Org Modeling, 4. How to build it (+2 more)

### Community 22 - "PRD — Process Map Studio: shared language and hand-off with the other three apps"
Cohesion: 0.18
Nodes (10): 1. Why this change, 2.1 IDs, 2.2 Evidence grades, 2.3 The file this app reads: `compass-handoff` v1.0, 2.4 The file this app writes: `compass-return` v1.0, 2. The shared language (fixed; do not redesign), 3. What this means for Process Map Studio, 4. How to build it (+2 more)

### Community 23 - "PRD — AI Org Advisory Workbench: shared language and hand-off with the other three apps"
Cohesion: 0.18
Nodes (10): 1. Why this change, 2.1 IDs, 2.2 Evidence grades, 2.3 The file this app reads: `compass-handoff` v1.0, 2.4 The file this app writes: `compass-return` v1.0, 2. The shared language (fixed; do not redesign), 3. What this means for the AI Org Advisory Workbench, 4. How to build it (+2 more)

### Community 26 - "current.js"
Cohesion: 0.10
Nodes (37): bindCurrentEvents(), CS_TABS, csCompare(), csDataCard(), csDecisionCard(), csFamilyCard(), csFindingRow(), csFindings() (+29 more)

### Community 28 - "blueprint.js"
Cohesion: 0.29
Nodes (14): BP_STAGES, BP_STRENGTHS, BP_WATCHOUTS, bpArrowDown(), bpBadge(), bpBandLabel(), bpBox(), bpBoxes() (+6 more)

### Community 29 - "PRD: Process Map Studio, the same process in another country"
Cohesion: 0.11
Nodes (18): 10. What to attach, 1. Why this change, 2. What this app already has (read on 2026-11-13; check it), 3. The shared language (fixed; do not redesign), 4.1 The country on an engagement, 4.2 Start a country from another country's engagement, 4.3 Line up the steps of two published maps, 4.4 What counts as a difference (+10 more)

### Community 30 - "PRD: Org Modeling, roles and structure by country"
Cohesion: 0.12
Nodes (15): 1. Why this change, 2. What this app already has (read on 2026-11-13; check it), 3. The shared language (fixed; do not redesign), 4.1 Country column, 4.2 By-country view, 4.3 One hand-off packet per country, 4.4 Compass roles, by country (the new screen), 4.5 One findings file per country (+7 more)

### Community 32 - "PRD: Org Modeling, structure and people cost as numbers for the Compass"
Cohesion: 0.13
Nodes (14): 1. Why this change, 2. What this app already has (read on 2026-11-25; check it), 3. The shared language (fixed; do not redesign), 4.1 `metrics` on every exported `structural_baseline` finding, 4.2 People cost is base salary, said on screen, 4.3 A unit column, not only Country, 4.4 Tell me when the numbers would mislead, 4. What to build (+6 more)

### Community 33 - "PRD: Process Map Studio, who decides and who is accountable, sent to the Compass"
Cohesion: 0.12
Nodes (15): 1. Why this change, 2. What this app already has (read on 2026-11-25; check it), 3. The shared language (fixed; do not redesign), 4.1 Send the fields on every decision-rights finding, 4.2 The decider "on paper", 4.3 Show it on the RACI view, 4.4 Who owns and updates each SOP, 4.5 Process owner and the process summary (+7 more)

### Community 34 - "econNum"
Cohesion: 0.15
Nodes (13): blankEconomics(), cleanDecision(), cleanFamily(), econNum(), ensureDataFacts(), ensureDecisions(), ensureEconomics(), ensureFamilies() (+5 more)

### Community 35 - "readoutModel"
Cohesion: 0.18
Nodes (12): cellGrades(), compareDifferences(), compareFrames(), compareRoles(), econEntered(), econRatios(), gradeCounts(), normName() (+4 more)

### Community 36 - "compareFindings"
Cohesion: 0.40
Nodes (5): allFindings(), compareFindings(), findingPage(), isDecisionFinding(), typedDecisionFindings()

### Community 37 - "sourceAppName"
Cohesion: 0.40
Nodes (5): familyComparison(), famKey(), sourceAppName(), unitFamilies(), unitProcesses()

### Community 38 - "sopSummary"
Cohesion: 0.40
Nodes (5): sopDate(), sopFlags(), sopOwnerDifferences(), sopSummary(), unitSops()

### Community 39 - "unitStructure"
Cohesion: 0.50
Nodes (4): econScale(), econSuggestions(), parseStructureText(), unitStructure()

## Knowledge Gaps
- **1 isolated node(s):** `RFC-4180`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 527 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cellAssessed()` connect `engine.js` to `make_country_samples.js`, `app.js`, `current.js`?**
  _High betweenness centrality (0.181) - this node is a cross-community bridge._
- **What connects `RFC-4180` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `contract_test.js` be split into smaller, more focused modules?**
  _Cohesion score 0.01020408163265306 - nodes in this community are weakly interconnected._
- **Why does `idTravelled()` connect `app.js` to `engine.js`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **Should `engine.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07467532467532467 - nodes in this community are weakly interconnected._
- **Why does `csCompare()` connect `current.js` to `engine.js`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Should `app.js` be split into smaller, more focused modules?**
  _Cohesion score 0.070446735395189 - nodes in this community are weakly interconnected._