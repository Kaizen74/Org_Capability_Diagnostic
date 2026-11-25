# PRD: Org Modeling, structure and people cost as numbers for the Compass

*Paste this whole document into Claude Code inside the **Org Modeling** repository. Section 9 lists the files to attach.*

## 1. Why this change

I run a six-stage workflow across four apps I own. Before any design work I run a **current-state analysis across units** (countries, stations, assets or business units). The first app, **Capability Compass**, prints a six-page readout for my executive committee (EXCO). EXCO has asked five questions of every unit:

1. Who decides, and who is really accountable?
2. How many steps and handoffs does the work take?
3. **How many spans and layers?**
4. **Which roles are common, which are unique, and why?**
5. **Revenue, manpower and non-manpower cost, and manpower productivity.**

This app already answers question 3 well on its **By country** view, and part of question 5 (people cost from the Salary column). But it sends those figures to the Compass **as sentences**, for example `"figure": "5 layers"` and `"source_note": "Computed from the uploaded org file (26 people in Belmar)"`. The Compass now shows a **spans-and-layers table per unit** on readout page 4, and a **cost-and-productivity table** on page 1. It can only line units up reliably if the numbers arrive **as numbers**.

The Compass was changed on 2026-11-25 to read a new optional `metrics` object on `structural_baseline` findings. Until this app sends it, the Compass reads the numbers out of the sentence wording, which breaks as soon as a sentence is reworded. This change makes that link exact.

I want this app to:

- (a) add a `metrics` object, with numbers only, to each `structural_baseline` finding it exports (whole organisation and per country);
- (b) include **people cost** in it, so I can use it as a starting figure for manpower cost in the Compass;
- (c) accept a column named for my comparison unit (Station, Asset, Business unit or Unit) as well as Country, so I can compare stations or assets without renaming my file;
- (d) show on screen, beside people cost, that it is **base salary only**.

I am not a developer. Follow this repository's own working rules (PROJECT_STATE.md, DECISIONS.md, CLAUDE.md, the check script and its gates). **Before writing code, read the code this touches and tell me in plain language what you found and your plan; wait for my go-ahead.** Where this document and the code disagree about what this app already does, the code is right: tell me.

## 2. What this app already has (read on 2026-11-25; check it)

- `services/metrics_service.py` works out, **per country**: `headcount`, `managers`, `manager_ratio_pct`, `layers`, `median_span`, `spans_vs_benchmark` (`below`, `within`, `above`), `single_report_managers`, `total_cost` (the sum of the Salary column, or the grade table where Salary is empty) and `health_score`. It also lists the differences from the largest country. The **By country** view on the Metrics page shows them.
- `services/compass_service.py`, `country_findings()`, exports per country three `structural_baseline` findings: `baseline.layers`, `baseline.spans` and `baseline.health`, with `topic: "role_presence"`. The whole-organisation export has the same three refs.
- A manager's span counts direct reports **in any country**; the benchmark is 10–20 for a manager whose Work Type is "Operational" and 5–10 otherwise.
- The Country column is optional (also read as "Country/Region").

Keep all of that working. Everything below is **additive**: the return format stays `compass-return` 1.0.

## 3. The shared language (fixed; do not redesign)

Unchanged: the ID scheme, the three evidence grades (**Confirmed**, **Indicated**, **Hypothesis**), `compass-handoff` 1.x in and `compass-return` 1.0 out, and the existing kinds, topics and reason classes.

**New (optional, additive):** a `metrics` object on any `structural_baseline` finding.

| Key in `metrics` | Number | Meaning |
|---|---|---|
| `headcount` | integer | People in this unit in the org file |
| `managers` | integer | People in this unit with at least one direct report |
| `manager_ratio_pct` | number, one decimal | managers ÷ head-count × 100 |
| `layers` | integer | Layers in the reporting chain for this unit's people |
| `median_span` | number | Median direct reports per manager |
| `spans_within` | integer | Managers within their span benchmark |
| `spans_below` | integer | Managers below it |
| `spans_above` | integer | Managers above it |
| `single_report_managers` | integer | Managers with exactly one direct report |
| `health_score` | integer 0–100 | The existing structural health score |
| `total_cost` | number | **Annual people cost in full currency units** (e.g. `2263000`, not `2.263`). The sum of the Salary column, or the grade table where Salary is empty. |

Rules the Compass applies, so this app must respect them:

- **Numbers only.** A string, a negative number or an unknown key is dropped on import, never trusted. Leave a key out rather than send `0` when it was not worked out.
- Send **the same `metrics` object on each of the three `structural_baseline` findings** of a unit (`baseline.layers`, `baseline.spans`, `baseline.health`). The Compass merges them; repeating them is safe and keeps each finding self-contained.
- Keep the existing `title`, `detail`, `figure` and `source_note` exactly as they are. Older Compass copies read the numbers from that wording, and people read it.
- The owner can type over any of these figures in the Compass (for example from an HR system). The Compass keeps this app's figure beside the typed one and shows both, so send what you calculated; do not try to guess.
- The Compass converts `total_cost` into the workspace's own unit (e.g. millions) and labels it "base salary only". **Say in `source_note` how the cost was made**, e.g. "People cost is the Salary column for 24 people and the grade table for 2."

## 4. What to build

### 4.1 `metrics` on every exported `structural_baseline` finding
- In `country_findings()` and in the whole-organisation export, add `metrics` from the row the By country view already computes (or, for the whole organisation, from the organisation-wide metrics). Map `spans_vs_benchmark.below/within/above` to `spans_below`, `spans_within`, `spans_above`.
- Extend `source_note` on these findings with how people cost was made (Salary column, grade table, or both, with counts).
- The readable text version of the export gains one line per unit: "Head-count 26 · managers 9 (34.6%) · layers 5 · median span 2 · 1 of 9 managers within benchmark · people cost 2,263,000 (base salary)".

### 4.2 People cost is base salary, said on screen
- On the By country view and the Metrics page, beside each people cost figure, add a small note: "Base salary only. Overtime, benefits and employer contributions are not included."
- No new calculation. Do not try to estimate on-costs.

### 4.3 A unit column, not only Country
- Accept any of these headers as the unit column, case-insensitive: `Country`, `Country/Region`, `Station`, `Asset`, `Business unit`, `Unit`. If more than one is present, use the first in that order and say which one was used.
- On screen, use the header's own word where the app says "country" (for example "By station"), the same way the Compass lets me choose the unit word. The exported field names stay `country` (the shared format does not change).
- Matching a Compass hand-off packet to a unit stays by name, as today.

### 4.4 Tell me when the numbers would mislead
On the By country view, show a plain warning when:
- a unit has fewer than 10 people (spans and layers are not meaningful at that size);
- more than a quarter of a unit's people have no Salary and no grade-table match (people cost is incomplete);
- a unit's managers mostly manage people in other units (spans are inflated or deflated for that unit).

These warnings also go, as one sentence, into that unit's `baseline.spans` `detail`.

## 5. Rules that must hold
- This app never changes a Compass ID, status or score.
- No person's name and no Employee ID ever appears in an exported file. The existing name check runs on it.
- Nothing is sent to an AI by this change.
- The app still works on its own, with no packet and no unit column.

## 6. Acceptance tests (use the attached samples)

With `meridian_org_by_country.csv` (84 fictional people) and `belmar_compass_handoff.json`:

1. Export Belmar's findings file. Its `baseline.layers` finding carries exactly:
   `{"headcount": 26, "managers": 9, "manager_ratio_pct": 34.6, "layers": 5, "median_span": 2, "spans_within": 1, "spans_below": 8, "spans_above": 0, "single_report_managers": 2, "total_cost": 2263000}`
   plus `health_score` from your own calculation. (The sample was built with the same rules as section 2; if your figures differ, tell me which rule differs rather than changing the rule.)
2. The same `metrics` object is on Belmar's `baseline.spans` and `baseline.health` findings.
3. Compare your file with the attached `belmar_return_org_modeling.json`: the same header and the same `metrics` keys (yours adds `health_score`). The sample shows two of the three refs (`baseline.layers`, `baseline.spans`); yours has all three, each with `metrics`.
4. Rename the `Country` header in a copy of the CSV to `Station`. Upload it: the By station view shows the same three units and the same figures; the exported file still says `"country": "Belmar"`.
5. A metrics value that cannot be worked out (for example `median_span` for a unit with no managers) is **left out**, not sent as 0.
6. The exported file contains no names and no Employee IDs.
7. All existing tests still pass. No real AI calls in tests.

## 7. How to build it
- Small increments: `metrics` on the per-country export; on the whole-organisation export; the base-salary note; the unit column; the warnings. Test and commit each, and update the project state after each.
- Extend this app's existing data contract and tests; do not add a second way of doing the same thing.
- Add the attached samples to the test fixtures so test 1 runs on every check.
- End with the full check suite green and a plain-language summary: what works, what you did not do, and why.

## 8. Out of scope
- Changing the shared format, the ID scheme or the existing finding wording.
- Estimating on-costs, non-manpower cost or revenue. Those are entered in the Compass, where Finance validates them.
- Comparing all job titles across units (role families). That is a separate, later change.
- Any change that makes Capability Compass a required dependency.

## 9. What to attach

All files are fictional. They are in the Capability Compass repository **`Kaizen74/Org_Capability_Diagnostic`**, branch **`claude/org-diagnostic-system-app-syt54v`**, folder **`docs/samples/countries/`**. If you can read that repository, copy them from there into this repository's test fixtures. If you cannot, ask me to attach them.

| File | Needed? | What it is for |
|---|---|---|
| `meridian_org_by_country.csv` | Yes | The org file for tests 1, 4 and 5 |
| `belmar_compass_handoff.json` | Yes | Links the Belmar unit for export |
| `belmar_return_org_modeling.json` | Yes | The expected shape, with `metrics` (test 3) |
| `docs/HANDOFF_FORMAT.md` | Helpful | The shared format, section 5 |
