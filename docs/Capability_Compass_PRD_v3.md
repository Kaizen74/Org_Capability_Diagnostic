# Capability Compass — Product Requirements Document v3.0

**Industry-Agnostic, Directionally Predictive Capability Diagnostic**
v3.0 · July 2026 · Supersedes `Capability_Compass_PRD_v2_Generic_ClaudeCode_2.docx`

---

## 0. What changed from v2 and why (revision log)

PRD v2 specified a full-stack platform (React 18 + Vite frontend, FastAPI backend, ChromaDB RAG pipeline, docker-compose). That architecture is sound for a team/hosted deployment, but it fails the product's own primary constraint: **the primary user is non-technical and needs a local deployment that just works**. A stack requiring Node, Python, Docker, and pnpm is not "locally deployable by a non-technical user" in practice.

v3 therefore introduces a **two-edition strategy** and a **predictive layer**, informed by 2026 best-practice research (see `docs/IMPROVEMENTS.md` for sources):

| # | Change | Rationale |
|---|--------|-----------|
| 1 | **Two editions: Local (ships now) and Pro (roadmap)** | Local Edition is a zero-dependency browser app — download, double-click, done. Pro Edition retains the v2 full-stack spec (RAG, Claude API, multi-user) as the upgrade path. |
| 2 | **Predictive Trajectory layer (new F15)** | v2 was a point-in-time snapshot. 2026 workforce-analytics practice has moved from descriptive to predictive: leading indicators, momentum, and early-risk signals. Every cell now carries momentum and a 2-cycle directional forecast. |
| 3 | **Leading indicators per cell** | Levels are lagging indicators (what already happened). Each cell can now hold 1–3 forward-looking signals (hiring funnel, adoption rate, pulse trend) that drive the forecast — the "skills intelligence / dynamic sensing" pattern. |
| 4 | **Trajectory vocabulary** | Cells are classified: *Weak & declining*, *Erosion risk* (strength being lost), *Stalled weakness*, *Breakout underway*, *Steady*, *Compounding strength*. This converts the heatmap from a status report into an early-warning system. |
| 5 | **Capability Velocity KPI** | Enterprise-level average momentum — answers "are we getting better, faster?" not just "where are we?". |
| 6 | **Transparent, explainable forecasting** | The model is deliberately simple: momentum = 50% version-over-version movement + 50% leading-indicator signal; projection = ±1 level over two review cycles when |momentum| ≥ 0.25. Every score is explainable to a board in one sentence. No black-box ML. |
| 7 | **Evidence guardrail retained, simplified for Local Edition** | Every rating cites named evidence sources or is visibly flagged "Unsupported" (amber). Full RAG chunk-citation moves to Pro Edition. |
| 8 | **Versioning powers prediction** | Version snapshots are no longer just an audit trail — the latest snapshot is the baseline for the momentum calculation, making recalibration discipline directly valuable. |

| 9 | **Value chain calibrates the cluster set (v3.4, F17)** | An industry preset supplies plausible clusters; it cannot know where a given organisation's money flows. Scoring the wrong rows carefully is still the wrong answer. The value chain is therefore promoted from grounding context to the test of which clusters should exist — with human approval on every structural change. |

Everything else from v2 — the design system, the two contrasting reads, weakest-first sorting, quadruple encoding, colorblind safety, auditability — is retained unchanged.

---

## 1. Vision

> A living, scannable, drill-downable capability diagnostic that answers **four** questions on one canvas: *Where do we stand? Why? Where are we heading? What must we do next?*

The fourth question — *where are we heading?* — is the v3 differentiator. Maturity levels are lagging indicators; decisions need leading ones.

## 2. Target users

Unchanged from v2: CHROs/CPOs, Chief Strategy Officers, Chiefs of Staff, OD & Talent leaders, board people-committees, PE operating partners, consultants. All are assumed **non-technical**: the Local Edition must require zero command-line use (a one-command option exists for those comfortable with it).

## 3. Product principles (v3 — eleven gates)

1. **Signal, not clutter** — the grid shows headlines; the drawer holds detail.
2. **Colorblind-safe by default** — sequential single-hue navy ramp; never traffic-light red/green.
3. **Quadruple encoding** — fill + segment bar + text label + amber flag (L≤2). Colour is never alone.
4. **Priority Moves always visible** — in every view, without clicking.
5. **Cross-cluster patterns are hero** — top of the action view.
6. **Two contrasting reads** — analytical Signal Matrix and action-oriented Priority Board, one canvas.
7. **Weakest-first sort** — avg level ascending; tie-break by count of L≤2 descending.
8. **Auditability** — every level change requires a rationale, is timestamped and attributed, and versions can be compared and restored.
9. **Living document** — recalibration is expected, easy, and *rewarded* (it feeds the forecast).
10. **Ground in evidence** — every rating cites sources or is flagged "Unsupported".
11. **Directionally predictive, transparently so** *(new)* — every forecast is explainable in one sentence; leading indicators are user-maintained and inspectable; projections are labelled directional, not deterministic.

## 4. Editions

### 4.1 Local Edition (this repository — ships now)

- **Stack:** plain HTML + CSS + JavaScript. No build step, no server, no dependencies, no install.
- **Runs:** by double-clicking `app/index.html` in any modern browser (Chrome, Edge, Safari, Firefox).
- **Data:** stored only in the browser (localStorage) + explicit JSON export/import for backup and sharing. Nothing ever leaves the machine.
- **Fonts:** Google Fonts (Archivo, IBM Plex Sans) when online; graceful system-font fallback offline.

### 4.2 Pro Edition (roadmap — the v2 full-stack spec)

React + FastAPI + ChromaDB RAG document ingestion, optional Claude API enrichment (cell synthesis, sense-making chat, delta narration, preset generation), PDF/PPTX export service, Postgres team deployments. The v2 PRD sections 6–10, 18–19 remain the authoritative spec for this edition. The Local Edition's JSON export is designed to be importable into Pro.

## 5. Core model (unchanged shape, extended cell)

- **Clusters** (rows): 5–8 assessed units — `no`, `name`, `desc`, `priority_move`.
- **Lenses** (columns): default Structure / People / Process / Culture (presets may override).
- **Cells** (cluster × lens): `level` (1–4), `status`, `rationale`, `intervention`, `items[]`, **plus v3 additions:**
  - `evidence[]` — named sources (`label`, `note`), driving the grounding guardrail;
  - `leading[]` — leading indicators (`name`, `signal`: improving / stable / declining);
  - `history[]` — level changes with timestamp, actor, and mandatory rationale.

## 6. The predictive engine (F15 — new, P0)

**Momentum** per cell, in [−1, +1]:
- *Historical component* = level change vs the most recent saved version snapshot, clamped to [−1, +1].
- *Leading component* = mean of leading-indicator signals (improving = +1, stable = 0, declining = −1).
- Blend 50/50 when both exist; otherwise use whichever exists; 0 when neither.

**Projection**: over the next two review cycles, level moves +1 if momentum ≥ +0.25, −1 if ≤ −0.25, else holds. Clamped to [1, 4].

**Classification** (the early-warning vocabulary):

| Class | Condition | Meaning |
|-------|-----------|---------|
| Weak & declining | L≤2 and m ≤ −0.25 | most urgent — intervene now |
| Erosion risk | L≥3 and m ≤ −0.25 | a strength being lost — usually invisible in maturity-only views |
| Stalled weakness | L≤2 and −0.25 < m < 0.25 | flagged weakness with no progress signal |
| Breakout underway | L≤2 and m ≥ +0.25 | weakness on the move — protect its resourcing |
| Compounding strength | L4 and m ≥ 0 | sustain |
| Steady | otherwise | monitor |

**Aggregates**: cluster momentum (mean of cell momentum), cluster projected average, and enterprise **Capability Velocity** (mean momentum across all cells) as a headline KPI.

**Non-negotiable transparency rule:** the engine must remain a hand-auditable formula. Any future upgrade (e.g. Pro Edition regression on richer signals) must ship with a per-cell "why this forecast" explanation.

## 7. Functional requirements

| ID | Feature | Priority | Local Edition acceptance criteria |
|----|---------|----------|-----------------------------------|
| F1 | Rubric engine | P0 | Rubric text shown per lens/level in the drawer; levels editable; every level change requires rationale; reflected in <1s. |
| F2 | Signal Matrix | P0 | All clusters visible; quadruple encoding on every cell; momentum arrow + word on every cell; lens headers with sub-labels; **each row carries its share of mapped P&L weight, rows follow the same ordering basis as the Priority Board, and a calibration banner appears when the cluster set does not fit the economics (v3.4)**. |
| F3 | Priority Board | P0 | 3 editable hero patterns on top; clusters sorted weakest-first; navy priority-move banner; amber "N lenses need action" pill; 4 lens chips per cluster. |
| F4 | Drill-down drawer | P0 | Right-slide drawer, header filled with cell's maturity colour; status, rationale, intervention (amber callout), cluster priority move (navy callout), items, evidence, leading indicators, change history; ESC/backdrop/button close. |
| F5 | Versioning | P0 | Save named snapshots; Delta view compares any snapshot to current; snapshots anchor the momentum baseline; JSON export/import round-trips without loss. |
| F6 | Evidence guardrail | P0 | Ratings with zero sources show an amber "Unsupported" badge in matrix and drawer; Evidence Coverage KPI shows % grounded. |
| F6b | Document ingestion & synthesis (Evidence view) | P0 *(v3.2 — shipped in Local Edition)* | Drag-drop/pick/paste ingestion with **local parsing for all mainstream formats** (v3.3): txt/md/csv/json via FileReader; **PDF text via vendored pdf.js; Excel .xlsx/.xls via vendored SheetJS (per-sheet tables); Word .docx and PowerPoint .pptx (incl. speaker notes) via vendored JSZip + XML extraction** — all offline, nothing leaves the machine during parsing. Scanned/image-only PDFs (no text layer) and images fall back to Claude vision as native base64 blocks (memory-only — provably never persisted or exported, enforced by contract + e2e tests); legacy binary .doc/.ppt gated to save-as-PDF/paste-text. Per-document triage metadata (source label + type) per the evidence-extraction protocol. Analysis prompt encodes the protocol's discipline (verbatim figures, stated ≠ demonstrated, take-the-lower); findings return as a validated contract (cluster × lens, quote, figure, leading/lagging, direction, conservative level suggestion, falsifiable watch). One-click apply = evidence citation + leading indicator + watch signal; level changes remain human-only. Deterministic mock mode covers tests and demos. Full RAG (chunking/embeddings/hybrid retrieval) remains the Pro Edition upgrade. |
| F7 | Industry preset manager | P0 | 7 ships-with presets + fictional demo dataset; first-run wizard with preview; clusters/moves editable after generation. |
| F14 | Settings | P0 | Org name, actor name, hero-pattern editing, start-fresh wizard, full local-data erase (with confirm). |
| F15 | Predictive trajectory view | P0 | Alert strip (weak & declining / erosion / stalled / breakout); per-cluster now→projected dumbbell on an L1–L4 scale; per-lens momentum chips; all alerts click through to the drawer. |
| F10 | Delta view | P0 *(promoted from P1)* | Declines sorted first; level pills old→new; rationale column; baseline selectable. |
| F13 | Report export | P1 | Print-optimised briefing (browser print → PDF) with org header; JSON export for data. |
| F8 | Claude API integration | P0 *(v3.1 — shipped in Local Edition)* | API key + model configurable in Settings; Test Connection; key stored separately from state (provably never exported — enforced by the contract test); graceful gating of dependent features when absent; deterministic mock mode (`mock` key) used by all automated tests — the real API is never called in tests. Direct browser→Anthropic calls (no intermediary server). |
| F11 | Research & Recalibration engine (Signals view) | P0 *(v3.1 — shipped in Local Edition)* | On-demand scan via Claude + server-side web search using the preset's `signal_keywords` (user-editable); returns 3–5 validated signals (headline, summary, source, tailwind/headwind/neutral direction, affected clusters, lens, calibration note); each signal applies as a leading indicator + evidence source on the target cell, feeding the momentum model; briefings persist locally (last 10); human-in-the-loop — no rating changes automatically. |
| F16 | Shared data contract | P0 *(v3.1 — new)* | `schema.js` defines the state and briefing shapes once; enforced at runtime (import validation, API-response validation) and by `tests/contract_test.js` (presets, demo data, engine output ranges, key isolation). This is the Local Edition analogue of PRD v2 Section 10's TypeScript/Pydantic contract mandate. |
| F17 | Value-chain cluster calibration | P0 *(v3.4 — shipped in Local Edition)* | The money map is upstream of the ratings, not only context for them. Four deterministic tests re-run on every lever/weight change: **ownership** (a lever ≥3% weight with no cluster), **materiality** (a cluster at 0% while others carry weight), **separability** (one cluster ≥30% across ≥2 levers), **diagnosability** (a weighted lever with no capability named); plus overall map coverage (<80% mapped is stated, not silently ranked). Each finding carries a one-click structural fix (add cluster from lever, split, edit/merge/remove), and the Signal Matrix shows a banner when the mismatch is material. Optional Claude pass (`proposeClusterCalibration`) applies the full harvest discipline to research industry practice and returns add/merge/rename/split/**keep** proposals with rationale, source and confidence, validated by `validateCalibration`. **No structural change is ever auto-applied**; merge and remove state what they discard. Industry presets ship starter levers at **0% weight** — structure without fabricated figures, so the board keeps ranking weakest-first until real weights exist. Materiality then propagates: per-row P&L share in the matrix, one shared ordering basis across Matrix/Board/Trajectory, alerts ordered by money at risk, and the money map injected into the scan and extraction prompts. |
| F18 | Method blueprint & shipped self-assessment | P1 *(v3.5 — shipped in Local Edition)* | A Blueprint view rendering the end-to-end data and analysis workflow as one diagram (Inputs → Ground it → Score → Engine → Reads) with both feedback loops, counters bound to live state, and a numbered assessment of 9 strengths and 9 limitations anchored to the stages they apply to. Every limitation must carry a mitigation; the contract test enforces badge/explanation parity in both directions so the diagram and the prose cannot drift. Accompanied by collapsible population guidance on the two judgement-heavy sections (Value Chain, Roles) giving ordered steps, a worked line, 1–5 scale anchors, and the common failure mode. Rationale: a diagnostic presented to a board must state its own limits before a challenger does. |
| F19 | Role rubric simplification + embedded scoring guide | P0 *(v3.6 — shipped in Local Edition)* | Ten role criteria reduced to six (Axis A: consequence 45% / scarcity 35% / trend 20%; Axis B: time to competence / locked in heads / relationship capital), removing the three-way consequence double count, the cross-axis duplicate, and a 10% weight that could never cross the routing threshold; the inverted "codifiability" label is replaced rather than documented. Every criterion carries a question, a definition, an explicit **not** boundary, written 1/3/5 anchors and the remedy a high score points at — surfaced by clicking any column heading or the Scoring guide button, so the definition appears where the scoring happens. Legacy v4.2 scores migrate deterministically in saved state, imported JSON, the roles CSV (old headers still accepted) and LLM responses, with routing preserved; the contract test asserts idempotence and no silent re-routing. |
| F20 | Workflow layer: first app of four | P0 *(v3.7 — shipped in Local Edition)* | Journey home and stage-ordered navigation; workspaces (several named diagnostics; capability-cluster or value-stream rows); Stage 0 Charter (thesis, principles with refuting evidence, reference model, weighted design criteria in Org Modeling's shape, leapfrog gate, evidence rules, decision log; lock with logged amendments); stable IDs never reused within a workspace; evidence grade per cell and signal chosen by the assessor, never derived; optional amount at stake per lever with money at risk labelled an estimate until validated; Stage 1 readiness check (must and should items), pilot shortlist requiring a reason for every exclusion; hand-off packet (`compass-handoff` v1.0) validated before writing, never carrying an API key or document text, plus a copy-ready brief per receiving app; Stage 5 Scoreboard with trend across versions and a forecast check (right / wrong / not yet / no call). Format defined in `docs/HANDOFF_FORMAT.md`. Receiving apps do not yet import the packet. |
| F9/F12 | Sense-making chat, segment overlay | Pro | Per PRD v2. |

## 8. Design system

Unchanged from v2 / the dashboard skill: Archivo (700–900) headings + IBM Plex Sans (400–700) body; palette L1 `#EDEFF4`/`#5A6474`, L2 `#C6D2E6`/`#26344C`, L3 `#6C8CBE`/white, L4 `#233F6C`/white; amber attention `#E0912B` on `#FBF3E7`; accent orange `#C2410C` for priority-move arrows only; near-black `#141B2B`; radii 9/14/20px; soft single-layer shadows; no gradients (exception: the trajectory scale track, which *is* the sequential ramp legend); no emoji; no traffic-light red/green.

**v3 additions:** momentum is always symbol + word (`↗ Improving`, `→ Stable`, `↘ At risk`) — never colour-coded; projected positions render as outlined dots vs solid "now" dots (shape channel, not colour channel).

## 9. Non-functional requirements (Local Edition)

- **Zero-install**: opens from the filesystem (`file://`) with no server; also works via any static file server.
- **Privacy**: no network calls except optional font loading and — only when the user configures a key and clicks Scan — direct calls to Anthropic's API; no analytics; no intermediary server ever sees the data or the key.
- **Key security**: the API key lives in browser storage separate from diagnostic state; the shared contract rejects any state object carrying a key, so exports/backups provably cannot leak it. Never logged, rendered only masked.
- **Accessibility**: WCAG 2.1 AA contrast; all colour paired with text/shape; keyboard-dismissable overlays; aria-labels on cells.
- **Performance**: full render < 1s for 8 clusters × 6 lenses; drawer < 100ms.
- **Durability**: state survives browser restart (localStorage); JSON export is the durable backup and the migration path to Pro.

## 10. Success metrics

- Time-to-first-diagnostic ≤ **10 minutes** from download (v2 target was 60 — the zero-install edition should crush it).
- Time-to-recalibration ≤ 30 minutes.
- 100% of ratings cite evidence or are flagged Unsupported.
- ≥ 1 version snapshot per quarter per instance (recalibration discipline — this also keeps forecasts honest).
- Forecast usefulness: at each recalibration, ≥ 60% of prior-cycle directional calls (improving/stable/at-risk) confirmed by the new assessment; review misses in the Delta view.

## 11. Risks & mitigations (Local Edition deltas)

| Risk | Mitigation |
|------|------------|
| Browser data loss (cache clear, device change) | Prominent Export button; footer reminder; export before "erase all" is suggested in the confirm dialog. |
| False confidence in forecasts | Directional-not-deterministic labelling in the UI footer and Trajectory view; transparent formula; forecast-accuracy review ritual (metric above). |
| Single-user edit conflicts when file is shared | JSON export/import is whole-state; Pro Edition is the multi-user path. |
| Gaming the momentum score (optimistic leading indicators) | Leading indicators are named and visible in the drawer; delta review exposes indicator-vs-outcome mismatches. |

## 12. Recalibration rules (carried from Rubric v4)

Save a version snapshot at every: annual engagement-survey release (re-score Culture), major leadership hire/exit (Structure, People), programme milestone (Process), strategy offsite (full re-score), and quarterly refresh. Every cell update logs actor + timestamp + rationale.

---

*Companion documents: `Capability_Diagnostic_Rubric_v4.md` (scoring standard), `capability_dashboard_skill_v2.md` (design skill), `IMPROVEMENTS.md` (research basis for this revision).*
