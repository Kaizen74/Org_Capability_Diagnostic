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

- The Compass **writes** the packet and a copy-ready brief for each app. Built and tested.
- All three other apps **read the packet** and **write a return file** (`compass-return` v1.0). This was confirmed by reading their code on 2026-11-13.
- The Compass **imports the return file** under Current State → Findings. Importing never changes a score. Built and tested.
- Nothing compares two published process maps yet. Process Map Studio rules that out today; the owner has agreed to reverse that rule in a later change to that app.

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
| `V n` | Difference between two countries' published maps of the same process | Process Map Studio |
| `T-nnn` | Task | Workbench |

The last six are reserved so the Compass never mints a clashing prefix. Process Map Studio already gives discrepancies codes that are never reused (`X1`, `X2`…).

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

## 5. Coming back: the return file

Each of the other three apps exports what it found as one small file:

```json
{
  "format": "compass-return",
  "format_version": "1.0",
  "generated_at": "2026-07-02T09:00:00Z",
  "source_app": "process-map-studio",
  "engagement_key": "MERIDIANBE",
  "findings": [
    {
      "ref": "X1",
      "kind": "discrepancy",
      "title": "Load plans are signed off by the shift supervisor, not the certified load controller",
      "detail": "Types: Different role, Skipped check. Impact: safety exposure. Verdict: Risky drift.",
      "grade": "confirmed",
      "figure": "3 of 10 turns observed",
      "relates_to": ["CAP-01", "CAP-01.Process"],
      "source_note": "Rests on 1 document, 4 interviews."
    }
  ]
}
```

| Field | Rule |
|---|---|
| `source_app` | `process-map-studio`, `org-modeling` or `ai-org-advisory-workbench` |
| `engagement_key` | The key of the workspace the findings describe. The Compass flags a file whose key differs from the open workspace; it does not block it. |
| `ref` | The finding's own ID in the app that found it (`X1`, `S-03`, `I1`, `H2`, `DC-1`, `RL-011`, `T-014`) |
| `kind` | Process Map Studio: `step`, `discrepancy`, `intent`, `knowledge_risk`, `hypothesis_verdict`. Org Modeling: `work_activity`, `structural_baseline`, `hypothesis`, `option_score`. Workbench: `task_disposition`, `role_impact`, `capacity`. |
| `grade` | `confirmed`, `indicated`, `hypothesis`, or empty. Anything else is dropped on import, never trusted. |
| `relates_to` | Compass IDs. A cell ID such as `CAP-01.Process` lets the finding be cited on that cell in one click. |
| `country` *(optional, header)* | The country the findings describe, as the hand-off packet's `engagement.country` gave it. The Compass flags a file whose country differs from the open workspace. |
| `topic` *(optional)* | What the finding is about: `decision_right` (who really decides), `role_presence` (which roles exist), `role_reason` (why a role is there or missing), `way_of_working` (how work runs). It decides the readout page; without it, the kind decides. |
| `reason_class` *(optional)* | Why it is so: `required` (regulation, contract, site), `chosen` (a deliberate local decision), `inherited` (history, acquisition, habit), or `unknown`. The same words as the Compass's Compare tab. |
| `compared_with` *(optional)* | The other country a difference is measured against, e.g. `Arden`. |

New kinds (added 2026-11-13, still format 1.0 because they are additive): **`role_reason`** from Org Modeling (why an anchor role exists, is thin, or is missing in this country) and **`variation`** from Process Map Studio (a difference between two countries' published maps of the same process, ID `Vn`).

What the Compass does with it:

1. Keeps **only** the fields above. Anything else in the file is discarded.
2. Lists the findings under Current State → Findings, strongest grade first.
3. **Never changes a level or a grade.** "Cite on CAP-01.Process" adds the finding to that cell as evidence, with its ID and its grade at source in the note. The assessor then decides.
4. Uses the findings on pages 3 to 5 of the EXCO readout. A finding whose words concern who decides, approves or holds authority goes to "Who really decides"; structure, role and knowledge-risk findings go to "Which roles exist where"; the rest go to "How work really runs".

Samples, all fictional: `docs/samples/countries/belmar_return_org_modeling.json` and `docs/samples/countries/belmar_return_process_map_studio.json`. They are checked by the Compass's contract test, so they always import.

## 5a. Countries

One workspace per country, all copied from one frame, so that every ID means the same thing in each. A value stream keeps its `VS-nn` in every country: once `VS-01` names "Bid to contract renewal", piloting it in another country's workspace (or dropping it and choosing it again) gives `VS-01` again, never a new number. That is what lets Process Map Studio match two countries' maps of the same process. The country's engagement key is the frame's key plus a two- or three-letter code (`MERIDIAN` → `MERIDIANBE`), at most ten characters. The packet's `engagement.country` carries the country name, and each role carries `status_confirmed` (false while a role copied from another country is still "to confirm").

## 6. Changing this format

Add fields freely; existing readers ignore what they do not know. Renaming or removing a field, or changing what a grade or prefix means, needs a new `format_version` and an entry in `DECISIONS.md`.

## 7. Country samples

`docs/samples/countries/` holds a fictional three-country set (Arden, Belmar, Caldera) for building and testing the other apps: one hand-off packet per country, an org file with a `Country` column, and the findings file each app should send back for Belmar. `node scripts/make_country_samples.js` rebuilds them from the Compass demo.
