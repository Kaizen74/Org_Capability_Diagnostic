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

**Projection:** directional only — over two review cycles, +1 level if m ≥ +0.25, −1 if m ≤ −0.25, else hold. Projections are labelled *directional, not deterministic* wherever shown.

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
