# Graph Report - Org_Capability_Diagnostic  (2026-08-13)

## Corpus Check
- 30 files · ~64,249 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 431 nodes · 678 edges · 29 communities (21 shown, 8 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 37 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `73c6992e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- contract_test.js
- engine.js
- app.js
- llm.js
- presets.js
- schema.js
- What You Must Do When Invoked
- Capability Compass — Organizational Capability Diagnostic
- Capability Compass — Product Requirements Document v3.0
- parsers.js
- e2e_mock_test.js
- Capability Diagnostic Rubric — v4.3 (Industry-Agnostic, Predictive, Value-Calibrated)
- run_checks.sh
- Improvements Log — Research Basis for the v3/v4/v2 Revisions
- graphify reference: extra exports and benchmark
- Capability Dashboard Data-Viz Skill — v2
- Capability Compass — Plain-Language Guide
- Project State — Capability Compass
- graphify reference: query, path, explain
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- CLAUDE.md
- .claude/CLAUDE.md
- extraction-spec.md
- DECISIONS.md
- blueprint.js

## God Nodes (most connected - your core abstractions)
1. `renderAll()` - 27 edges
2. `toast()` - 23 edges
3. `esc()` - 19 edges
4. `renderView()` - 14 edges
5. `Capability Compass — Product Requirements Document v3.0` - 14 edges
6. `What You Must Do When Invoked` - 12 edges
7. `Capability Diagnostic Rubric — v4.3 (Industry-Agnostic, Predictive, Value-Calibrated)` - 12 edges
8. `bindEvidenceEvents()` - 11 edges
9. `cellTrajectory()` - 11 edges
10. `validateState()` - 11 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (29 total, 8 thin omitted)

### Community 0 - "contract_test.js"
Cohesion: 0.03
Nodes (73): allIdx, allTki, anaPrompt, anaPrompt2, appSrc, bind, blankKpis, blankNoEvidence (+65 more)

### Community 1 - "engine.js"
Cohesion: 0.08
Nodes (43): AXIS_A_WEIGHTS, bindingConstraint(), calibrateClusters(), calibrationSummary(), cellConfidence(), cellMomentum(), cellTrajectory(), clamp() (+35 more)

### Community 2 - "app.js"
Cohesion: 0.10
Nodes (66): addCluster(), addEvidenceFiles(), applyCalibrationProposal(), applyExtractedRole(), applyFinding(), applySignal(), bindCalibrationEvents(), bindEvidenceEvents() (+58 more)

### Community 3 - "llm.js"
Cohesion: 0.18
Nodes (21): analyzeEvidence(), anthropicRequest(), bufferToBase64(), buildAnalysisContent(), buildAnalysisPrompt(), buildCalibrationPrompt(), buildScanPrompt(), docKindFor() (+13 more)

### Community 4 - "presets.js"
Cohesion: 0.14
Nodes (8): DEFAULT_LENSES, DEFAULT_PATTERNS, DEFAULT_RUBRIC, DEMO_PRIOR_LEVELS, DEMO_ROLES, DEMO_STATE, DEMO_VALUE_CHAIN, PRESETS

### Community 5 - "schema.js"
Cohesion: 0.48
Nodes (12): _isArr(), _isObj(), _isStr(), _score1to5(), validateAnalysis(), validateBriefing(), validateCalibration(), validateCell() (+4 more)

### Community 6 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 7 - "Capability Compass — Organizational Capability Diagnostic"
Cohesion: 0.10
Nodes (19): Calibrating against external market research (Signals), Capability Compass — Organizational Capability Diagnostic, Checking you have the *right* clusters (Cluster calibration), 🧭 Design system & methodology, Establishing economic context first (Value Chain), Grounding the diagnostic in your own documents (Evidence), How the prediction works (in one paragraph), 🚀 How to deploy locally (step by step, non-technical) (+11 more)

### Community 8 - "Capability Compass — Product Requirements Document v3.0"
Cohesion: 0.12
Nodes (16): 0. What changed from v2 and why (revision log), 10. Success metrics, 11. Risks & mitigations (Local Edition deltas), 12. Recalibration rules (carried from Rubric v4), 1. Vision, 2. Target users, 3. Product principles (v3 — eleven gates), 4.1 Local Edition (this repository — ships now) (+8 more)

### Community 9 - "parsers.js"
Cohesion: 0.36
Nodes (6): decodeXmlEntities(), docxXmlToText(), extractDocxText(), extractPptxText(), pptxXmlToText(), slideOrder()

### Community 11 - "Capability Diagnostic Rubric — v4.3 (Industry-Agnostic, Predictive, Value-Calibrated)"
Cohesion: 0.12
Nodes (15): 1. Purpose and what changed from v3, 2. Core model, 3. The 4-step maturity scale (position — lagging), 4. The momentum scale (direction — leading) *(new in v4)*, 4b. Value chain — the precursor layer (v4.2), 4c. The role layer — two axes, four routes (v4.2), 4d. The value chain calibrates the cluster set itself (v4.3), 5. Attention flag rule (+7 more)

### Community 13 - "Improvements Log — Research Basis for the v3/v4/v2 Revisions"
Cohesion: 0.18
Nodes (10): Changes by artefact, Dashboard skill v1 → v2 (`capability_dashboard_skill_v2.md`), Improvements Log — Research Basis for the v3/v4/v2 Revisions, PRD v2 → v3 (`Capability_Compass_PRD_v3.md`), Rubric v3 → v4 (`Capability_Diagnostic_Rubric_v4.md`), Sources consulted, Update — coherence review against the packaged skills (v4.1), Update — end-to-end coherence review (v4.3): the value chain calibrates the cluster set (+2 more)

### Community 14 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 15 - "Capability Dashboard Data-Viz Skill — v2"
Cohesion: 0.22
Nodes (8): Capability Dashboard Data-Viz Skill — v2, Chart-type selection, Interaction patterns, Layout, Palette, The quadruple encoding rule (unchanged, non-negotiable), Trajectory grammar (new), What changed from v1

### Community 16 - "Capability Compass — Plain-Language Guide"
Cohesion: 0.22
Nodes (8): Before you present it, Capability Compass — Plain-Language Guide, If something goes wrong, Opening it, The eight views, and when to use each, The recommended order for a first real diagnostic, Two ideas worth understanding, Using the AI features

### Community 17 - "Project State — Capability Compass"
Cohesion: 0.29
Nodes (6): Done in the last session, How to resume, Project State — Capability Compass, Status: working and fully tested, Suggested next session, What the app does today

### Community 18 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 19 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 20 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 21 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 28 - "blueprint.js"
Cohesion: 0.29
Nodes (14): BP_STAGES, BP_STRENGTHS, BP_WATCHOUTS, bpArrowDown(), bpBadge(), bpBandLabel(), bpBox(), bpBoxes() (+6 more)

## Knowledge Gaps
- **211 isolated node(s):** `DEFAULT_VC_STAGES`, `docBlobs`, `CALIB_SEV`, `DOC_TYPE_LABELS`, `TEMPLATES` (+206 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `DEFAULT_VC_STAGES`, `docBlobs`, `CALIB_SEV` to the rest of the system?**
  _211 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `contract_test.js` be split into smaller, more focused modules?**
  _Cohesion score 0.02531645569620253 - nodes in this community are weakly interconnected._
- **Should `engine.js` be split into smaller, more focused modules?**
  _Cohesion score 0.0841813135985199 - nodes in this community are weakly interconnected._
- **Should `app.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09814563545906829 - nodes in this community are weakly interconnected._
- **Should `presets.js` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `What You Must Do When Invoked` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Capability Compass — Organizational Capability Diagnostic` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._