---
name: capability-diagnostic-rubric
version: v4.0
date: 2026-07-02
supersedes: Capability_Diagnostic_Rubric_v3.md (organisation-specific edition)
classification: Generic / shareable — contains no organisation-specific data
---

# Capability Diagnostic Rubric — v4.0 (Industry-Agnostic, Predictive)

## 1. Purpose and what changed from v3

v3 was calibrated for a single organisation and embedded its confidential data. v4 makes two changes:

1. **Generalised** — all organisation-specific content removed; industry presets (in the app) supply cluster scaffolds instead. v4 is safe to share and version in an open repository.
2. **Predictive extension** — the rubric now scores *direction* as well as *position*. Every cell carries leading indicators and a momentum classification alongside its maturity level, because maturity levels are lagging indicators and capability decisions are forward-looking.

Every rating **must** still be traceable to a defined level, backed by named evidence, and versioned with a change rationale.

## 2. Core model

Three nested objects drive every dashboard layout:

- **Clusters** (rows): the 5–8 units being assessed — `no`, `name`, `desc`, `priority_move` (the one sentence of *what we must do next*).
- **Lenses** (columns): default four — **Structure** (roles, span, layers), **People** (skillsets, bench, behaviours), **Process** (systems, workflows), **Culture** (engagement signals). Presets may substitute (e.g. add *Regulatory* for financial services).
- **Cells** (cluster × lens): `level` 1–4, `status` (2–4 word headline), `rationale` (one sentence of evidence with real numbers), `intervention` (imperative verb phrase), `items[]` (drill-down detail), **and the v4 additions**: `evidence[]`, `leading[]`, `history[]`.

## 3. The 4-step maturity scale (position — lagging)

Colorblind-safe sequential single-hue navy ramp. **Never traffic-light red/green.**

| Level | Label | Fill | Text | Meaning |
|-------|-------|------|------|---------|
| 1 | Absent | `#EDEFF4` | `#5A6474` | Materially missing — strategic execution risk |
| 2 | Early | `#C6D2E6` | `#26344C` | Exists but sub-scale, fragmented, or immature |
| 3 | Emerging | `#6C8CBE` | `#FFFFFF` | Established but uneven — building toward scale |
| 4 | Established | `#233F6C` | `#FFFFFF` | Well established, scaled, and effective |

### Level definitions per lens

**Structure** — L1: no owner; capability sits nowhere in the org chart. L2: owner named but structure immature; overlap or gaps in reporting lines. L3: structure defined; span and layers appropriate; some regional/BU coverage. L4: reinforced structure, clear reporting lines, enterprise integration.

**People** — L1: zero visible specialists. L2: critical bench gaps; single points of failure; hiring in progress. L3: bench building; core capabilities acquired. L4: deep, distributed bench with successor pipeline.

**Process** — L1: no systems; manual and ad hoc. L2: systems in early build; fragmented. L3: systems in rollout; workflows defined; standardisation in flight. L4: enterprise systems live and scaling with measurable productivity outcomes.

**Culture** — L1: signals materially below benchmark, declining across categories. L2: one or more categories in significant concern vs benchmark. L3: on par with benchmark; improving; specific gaps remain. L4: above benchmark; consistent values alignment; positive momentum.

## 4. The momentum scale (direction — leading) *(new in v4)*

Each cell carries 0–3 **leading indicators**: named, forward-looking signals the owner maintains (e.g. *specialist hiring funnel*, *CRM adoption rate*, *near-miss reporting rate*, *pulse-survey trend*). Each is marked **improving / stable / declining** at every refresh.

**Momentum score** m ∈ [−1, +1] = 50% version-over-version level movement (clamped ±1) + 50% mean leading-indicator signal. If only one input exists, it carries 100%. The formula is deliberately simple: every score must be explainable to a board in one sentence.

**Display rule:** momentum always renders as symbol + word (`↗ Improving`, `→ Stable`, `↘ At risk`) — a shape/text channel, never a colour channel.

### Trajectory classification

| Class | Condition | Board reading |
|-------|-----------|---------------|
| **Weak & declining** | L≤2, m ≤ −0.25 | Intervene now — compounding downside |
| **Erosion risk** | L≥3, m ≤ −0.25 | A strength is being lost; invisible in maturity-only views |
| **Stalled weakness** | L≤2, −0.25 < m < +0.25 | Flagged for action but nothing is moving |
| **Breakout underway** | L≤2, m ≥ +0.25 | Weakness on the move — protect its resourcing |
| **Compounding strength** | L4, m ≥ 0 | Sustain and harvest |
| **Steady** | otherwise | Monitor |

**Projection:** directional only — over two review cycles, +1 level if m ≥ +0.25, −1 if m ≤ −0.25, else hold. Projections are labelled *directional, not deterministic* wherever shown, and phrased conditionally (*"toward L3 IF indicators hold"*).

### v4.1 prediction-honesty extensions (implemented in the app)

- **Unknown is a professional answer.** A cell with no qualifying trajectory evidence (no version history AND no leading indicators) renders **`? Unknown`** — never a guessed "stable" arrow — carries no projection, and is listed in a dedicated *Direction unknown* alert group. When >25% of cells are unknown, the dashboard states the real finding explicitly: an evidence-infrastructure gap.
- **Trajectory confidence (mechanical, about evidence not conviction):** **High** = version history + ≥2 leading indicators; **Medium** = history *or* ≥1 indicator; unknown cells carry none. Shown with the trajectory in the drawer and cell tooltips.
- **Evidence mix per cell:** `leading | lagging | both | none`. Cells citing only rear-view sources are badged *"Rear-view evidence only"* and their trajectory confidence is capped at Medium.
- **Watch signals (falsifiers):** each cell holds 0–3 falsifiable signals with thresholds and re-score triggers (e.g. *"CRM adoption <60% at 90 days → flip trajectory down"*). A trajectory call without a falsifier is a hope, not a call.
- **Binding constraint per cluster:** the intervention target is the lowest-level cell **that is not already improving** — not simply the lowest level. Named on every Priority Board card.
- **Cross-lens interdependency patterns** (computed automatically): *bench-starves-rollout* (People ≤ L2 with Process ≥ L3), *structure-without-people* (Structure L4 with People ≤ L2), and the *adoption red flag* (Process improving while Culture declines in the same cluster — declining during change is an adoption problem, not normal lag).
- **Scoring discipline surfaced at the point of scoring:** between two levels, take the lower; announcements and approvals justify trajectory, never a higher level — levels score what is operating today.

## 4b. Value chain — the precursor layer (v4.2)

**Scoring capabilities before understanding the economics produces a well-formed answer to the wrong question.** Before any cell is scored, map the business model:

1. **Follow the money** across five stages: demand owner → platform → billing unit → cost consumption → value created. This states plainly who pays, what is invoiced, where revenue is consumed, and what lands as profit.
2. **Translate each P&L lever into the capability that moves it**, the ambition it serves, and the cluster that owns it. A lever with no capability owner is an accountability gap, and the diagnostic should say so.
3. **Give each lever a rough economic weight** (share of economic significance, 0–100). Precision is not the point; materiality is.

This yields **value exposure = economic weight × capability gap**, which replaces naive weakest-first prioritisation. A capability at L2 carrying 30% of the cost base outranks one at L2 carrying 2%. Where no value chain is mapped, the diagnostic falls back to weakest-first and says which basis it used.

## 4c. The role layer — two axes, four routes (v4.2)

A maturity level with no accountable owner is an opinion. Roles are the checkable half of the rubric, and **presence or absence of the anchor seat is direct evidence** for the Structure and People lenses: a capability nobody holds cannot score as established.

But role presence alone is insufficient. Two different risks hide behind "critical role", and they have different fixes:

**Axis A — Criticality Index** (weighted, each criterion 1–5):

| Criterion | Weight |
|---|---|
| Strategic impact (P&L / stated ambition) | 30% |
| Market scarcity / replaceability | 25% |
| Vacancy risk (safety, licence, contract) | 20% |
| Value-chain pivotalness (choke point) | 15% |
| Future-fit (accelerating trend) | 10% |

**Axis B — Tacit-Knowledge Intensity** (mean of five factors, each 1–5): time-to-competence · codifiability · concentration / bus-factor · consequence of inexperience · relationship and context capital.

**Routing** (threshold 3.5 on both axes, stated explicitly so it can be challenged):

| | Low tacit | High tacit |
|---|---|---|
| **High leverage** | **Critical role** — succession bench; acquire or build ahead of need | **Dual-critical** — succession bench AND knowledge capture; a successor name alone is insufficient |
| **Low leverage** | **Standard population** — productivity, automation, standard resourcing | **Specialist / key-person** — knowledge transfer, apprenticeship, retention; belongs on a knowledge-transfer register, not the leadership succession list |

**Two registers, not one.** The critical-role register (led by absent and thin anchor seats) and the key-person risk register (led by tacit intensity) are maintained separately. One combined list hides the knowledge-drain exposure — which is precisely the failure this axis exists to prevent. For high-tacit roles, plan for years of overlap and shadowing; a name on a chart is not a mitigation.

**Role status** is recorded as *exists · thin bench · absent*, grounded in the organisation's actual job titles rather than an idealised org chart.

## 5. Attention flag rule

An **amber attention flag** (`#E0912B` on `#FBF3E7`) is automatically applied to any cell rated Level 1 or 2, rendered as an "Action" pill. This is a separate categorical channel from the sequential ramp, so weak (light) cells never recede visually. It appears in every view.

## 6. Grounding guardrail

Every cell must cite at least one named evidence source (`label` + what it evidences), or it renders with an amber **"Unsupported"** badge in every view. The enterprise **Evidence Coverage** KPI reports % of grounded cells. Users must never see a rating whose provenance they cannot inspect.

## 7. Recalibration rules

Event triggers that mandate re-scoring (save a version snapshot each time — snapshots are also the momentum baseline):

- **Strategy offsite / CEO strategy update** — full re-scoring; major version bump.
- **Annual engagement-survey release** — Culture lens re-scored across all clusters.
- **Major leadership hire or exit** — Structure and People lenses re-scored.
- **Programme milestone** (system go-live, scale-up) — Process lens re-scored.
- **Quarterly refresh** — evidence + leading-indicator updates; minor bump.

Every cell update requires `updated_by`, `updated_at`, and — for level changes — a mandatory `change_rationale` in plain English with real numbers. The app enforces this.

**Forecast honesty ritual:** at each recalibration, compare the previous cycle's directional calls against the new assessment in the Delta view. Persistent misses mean the leading indicators are wrong — replace them.

## 8. Versioning

Semantic versioning: patch = evidence refresh, minor = quarterly recalibration, major = strategy-level re-scoring. Every version snapshot is labelled with the moment it captures and is restorable/comparable in the Delta view.
