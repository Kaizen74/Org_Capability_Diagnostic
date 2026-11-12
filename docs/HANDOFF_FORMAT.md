# Hand-off language and format — v1.0

The Capability Compass is the first of four apps in the leapfrog workflow. This document defines the language the four apps share and the file the Compass hands on. It is defined here because, when it was written (2026-11-11), none of the other three apps referred to the Compass at all — there was no existing format to match.

| Stage | Name | App |
|---|---|---|
| 0 | Frame | **Capability Compass** (Charter) |
| 1 | Focus | **Capability Compass**, with Org Modeling |
| 2 | Find | Process Map Studio |
| 3 | Dial | Process Map Studio and the AI Org Advisory Workbench, then back to the Compass to re-score |
| 4 | Design | Org Modeling and the Workbench |
| 5 | Deliver | **Capability Compass** (Scoreboard) |

## What is true today, and what is not

- The Compass **writes** the packet and a copy-ready brief for each app. This is built and tested.
- The other three apps **do not read the packet yet**. Until they do, the brief is pasted into the fields named below. Making them import it is a change in those three repositories.
- The Compass **does not import** a file from the other apps. Findings come back as documents uploaded in Evidence, and an evidence item can cite the other app's ID (for example `X5`).

## 1. One ID scheme

An ID is a prefix and a number. The number is never reused inside a workspace, so an ID quoted in a board paper means the same thing a year later. Outside its workspace an ID is written with the engagement key in front: `MERIDIAN:CAP-03`.

| Prefix | Names | Minted by |
|---|---|---|
| `CAP-nn` | Capability cluster | Compass |
| `VS-nn` | Value stream — a row in a value-stream workspace, or a pilot | Compass |
| `CAP-nn.Lens` | One cell, for example `CAP-03.People` (derived, not stored) | Compass |
| `LV-nn` | P&L lever | Compass |
| `RL-nnn` | Anchor role | Compass |
| `SG-nnn` | External signal | Compass |
| `P1…` | Operating-model design principle | Compass, Stage 0 |
| `C1…C8` | Operating-system reference component | Compass, Stage 0 |
| `DC-n` | Design criterion | Compass, Stage 0 |
| `LG-n` | Leapfrog gate test | Compass, Stage 0 |
| `DEC-nn` | Decision-log entry | Compass, Stage 0 |
| `S-nn` | Process step | Process Map Studio |
| `X n` | Discrepancy between documented and done | Process Map Studio |
| `I n` | Intent statement | Process Map Studio |
| `H n` | Operating-model hypothesis | Org Modeling |

The last four are reserved so the Compass never mints a clashing prefix. Process Map Studio already gives discrepancies codes that are never reused (`X1`, `X2`…).

## 2. One evidence grammar

Every finding carries one of three grades. **The grade is the assessor's judgement, made with the evidence in view.** The Compass shows what a grade rests on (sources, leading indicators, cross-app findings) and never calculates it.

| Grade | On a signal | Meaning | Nearest term in Org Modeling | Nearest term in Process Map Studio |
|---|---|---|---|---|
| Confirmed | Metric | You would defend it to a sceptic: independent sources agree, or a system record backs it | OBSERVABLE | Observed (O) |
| Indicated | Trace | A reasonable reading of limited evidence | PERCEPTUAL | Inferred (I) |
| Hypothesis | Claim | Not yet tested: AI output, self-report or marketing. Never drives a decision alone | MODEL-INFERRED | Inferred (I), unverified |

The last two columns are a translation aid, not an equivalence: each app defines its own terms for its own purpose.

Maturity levels are 1 Absent, 2 Early, 3 Emerging, 4 Established. Trajectory is Improving, Stable, At risk or Unknown.

## 3. The packet

One JSON file, `<engagement key>_compass_handoff.json`, written from the Hand-off view.

```
format            "compass-handoff"
format_version    "1.0"
generated_at      ISO date
source_app        "capability-compass"
engagement        key, name, organisation, industry, unit, scope, currency, value_unit,
                  baseline_version, working_version
vocabulary        maturity_levels, evidence_grades, id_prefixes
charter           sponsor, locked_at, thesis, principles, reference_model, design_criteria,
                  leapfrog_gate, evidence_rules, decision_log
clusters[]        ref, name, priority_move, avg_level, trajectory, economic_weight_pct,
                  exposure_index, value_at_stake, money_at_risk, value_validated,
                  cells[]: ref, lens, level, level_label, status, rationale, intervention,
                           grade, trajectory, confidence, evidence[], watch[]
levers[]          ref, name, figure, economic_weight_pct, value_at_stake, validated,
                  capability, cluster_ref
roles[]           ref, title, status, cluster_ref, criticality_index, tacit_intensity, route, note
signals[]         ref, headline, direction, grade, source, lens, cluster_refs
pilots[]          ref, cluster_ref, name, process_kpi, reason
exclusions[]      cluster_ref, name, decision (later | out), reason
readiness         ready, verdict, open[]
for_apps          org_modeling, process_map_studio, workbench
```

Rules the Compass enforces before writing the file (`validateHandoffPacket` in `app/js/schema.js`):

- it never contains an API key;
- it never contains the text of an uploaded document — only the source labels and notes the assessor chose to cite;
- every `cluster_ref` points at a cluster in the same file;
- an incomplete Stage 1 is stated in `readiness`, never hidden.

`money_at_risk` is `value_at_stake × capability gap`. It is an estimate until `value_validated` is true.

## 4. What each app takes, and where it goes

**Org Modeling** — `for_apps.org_modeling`

| Field | Goes into |
|---|---|
| `strategy_text` (thesis, principles, ranked capability priorities) | The strategy box used by the archetype analysis |
| `design_criteria[]` — `id`, `name`, `kind` (`measured` or `judged`), `weight`, and for measured ones `metric` and `better` | Compare options → criteria. The shape and the metric names (`layers`, `total_cost`, `spans_within_benchmark`, `people_affected_pct`) are the ones that app already uses |
| `structure_lens[]` | Evidence to test. A Compass score is never copied into a structural finding |

Not in the packet: the org file. Upload it in Org Modeling.

**Process Map Studio** — `for_apps.process_map_studio.engagements[]`, one per pilot

| Field | Goes into |
|---|---|
| `name` (`<key> <VS id> <pilot name>`) | Engagement name |
| `process_name`, `process_kpi`, `industry` | The engagement's scope card |
| `in_scope_roles[]` | Roles in scope |
| `interview_prompts[]` (weak cells and watch signals, each quoting its cell ID) | Interview guide |

**AI Org Advisory Workbench** — `for_apps.workbench`

| Field | Goes into |
|---|---|
| `engagement_name` | Engagement Hub |
| `roles[]` (the pilots' roles and every critical or dual-critical seat) | The roles to run Task Intelligence on first |

## 5. Coming back

After Stage 3, findings return to the Compass:

1. Upload the discrepancy register, disposition cards or gap assessment in **Evidence**.
2. On the cells they bear on, add an evidence source and put the finding's ID in the **ID** box (`X5`, `S-03`, `H2`).
3. Re-score, set the grade, and **Save version**. The Scoreboard then shows what moved and whether last cycle's directional calls were right.

## 6. Changing this format

Add fields freely; existing readers ignore what they do not know. Renaming or removing a field, or changing what a grade or prefix means, needs a new `format_version` and an entry in `DECISIONS.md`.
