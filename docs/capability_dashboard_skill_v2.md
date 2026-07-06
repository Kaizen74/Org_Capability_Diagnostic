---
name: Capability Dashboard Data-Viz Skill
version: v2.0
supersedes: capability_dashboard_skill.md (v1 — financial dashboard revision skill)
description: Use when designing or reviewing a capability/maturity diagnostic dashboard (entity × dimension score grids with drill-down, prioritisation, and trajectory). Covers chart-type selection, the predictive-layer visual grammar, layout, and interaction patterns.
---

# Capability Dashboard Data-Viz Skill — v2

## What changed from v1

v1 was a general "fix a static financial dashboard" skill. v2 specialises it for capability diagnostics and adds the **trajectory grammar** — how to encode direction and forecast without breaking colorblind-safety. All v1 principles (encode the comparison directly, one consistent colour system, hover/drill for detail, no chart type by habit) still apply.

## Chart-type selection

1. **Entity × dimension maturity grid** → **heatmap grid**, not radar. Single-hue sequential ramp (navy). Rows = clusters, columns = lenses. Scales to any number of rows/columns; radar does not.
2. **"Where must action land first?"** → **weakest-first sorted cards** (avg ascending, tie-break count of weak cells descending), each carrying its priority move as a banner. Never make the reader compute the ranking.
3. **"Where is this heading?"** → **now→projected dumbbell** per cluster on a shared L1–L4 axis: solid dot = today, outlined dot = projection, connecting bar in the attention colour. Delta is directly encoded; the reader never mentally subtracts.
4. **"What changed between versions?"** → **delta table**, declines sorted first, old→new level pills with a direction word (▲/▼ + "moved up/down"), rationale inline.
5. **Signed adjustments to a base** (if you need it) → diverging waterfall, per v1.

## The quadruple encoding rule (unchanged, non-negotiable)

Every rating shows **fill + segment bar + text label + n/4**, plus an **amber "Action" pill** when level ≤ 2. Colour is never the only channel. Amber (`#E0912B` on `#FBF3E7`) is a *categorical* attention channel, separate from the sequential ramp, so weak (light) cells never visually recede.

## Trajectory grammar (new)

Direction and forecast get their own channels — and they are **shape/text channels, never colour**:

- **Momentum** = arrow symbol + word, always paired: `↗ Improving`, `→ Stable`, `↘ At risk` — and, critically, **`? Unknown`** when no qualifying evidence exists. Never render a guessed arrow, and never a red/green one. Confidence (High/Medium) accompanies the arrow as text in detail surfaces.
- **Projection** = outlined dot vs solid dot (shape distinction), connected by a thin amber bar. Label both dots with their values (`now 3.5`, `proj 4.0`).
- **Classification vocabulary** as text badges, not colours: *Weak & declining*, *Erosion risk*, *Stalled weakness*, *Breakout underway*, *Compounding strength*.
- **Alert strip** above the trajectory table: warning cards on the amber background, positive cards on the light-navy background — reinforced by ⚠/⚑/↗ glyphs and headings so background colour is never the sole signal.
- **Honesty labels**: anywhere a projection appears, label it *directional, not deterministic*, and keep the model explainable in one sentence next to the view.

## Palette

| Element | Fill / Text |
|---|---|
| L1 Absent | `#EDEFF4` / `#5A6474` |
| L2 Early | `#C6D2E6` / `#26344C` |
| L3 Emerging | `#6C8CBE` / `#FFFFFF` |
| L4 Established | `#233F6C` / `#FFFFFF` |
| Amber attention | `#E0912B` on `#FBF3E7` |
| Accent orange (priority-move arrows only) | `#C2410C` |
| Structural navy | `#233F6C` · Near-black `#141B2B` |

No gradients (one exception: the trajectory axis track may show the sequential ramp itself — it *is* the legend). No emoji. No traffic-light red/green, ever. Typography: Archivo 700–900 for headings/numbers/labels; IBM Plex Sans 400–700 for body. Radii 9 / 14 / 20 px; single-layer soft shadows; hover lifts 2px.

## Interaction patterns

- **Drill-down drawer** (right slide-in, header filled with the cell's maturity colour) instead of inline bullet walls: status → rationale with evidence citations → intervention (amber callout) → cluster priority move (navy callout) → leading indicators → items → change history. Close via ✕, backdrop, or ESC.
- **Everything clicks through**: matrix cells, board lens chips, trajectory chips, and alert-list entries all open the same drawer — one consistent detail surface.
- **Edit-in-place with guardrails**: level changes require a typed rationale before saving; the UI blocks otherwise.
- **KPI strip** on top: average maturity, cells needing action (amber tile when > 0), capability velocity (momentum arrow + signed number), trajectory alerts, evidence coverage.
- **Print stylesheet**: each view is a print section with an org/version header, so browser print → PDF is the export path in a zero-dependency app.

## Layout

Top to bottom: dark header (identity + actions + view tabs) → KPI chips → the active read. Reads mirror how an executive consumes a review: **Matrix** (compare everything at once) → **Priority Board** (hero patterns + weakest-first action) → **Trajectory** (where it's heading) → **Delta** (what changed). One consistent colour system across all four — a cluster's cell colour, chip colour, and pill colour always agree.
