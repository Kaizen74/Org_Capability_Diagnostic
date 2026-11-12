# PRD — Org Modeling: shared language and hand-off with the other three apps

*Paste this whole document into Claude Code inside the Org Modeling repository, and attach the sample file `meridian_compass_handoff.json`.*

## 1. Why this change

I run a six-stage workflow across four apps I own. The first app, **Capability Compass**, now writes a hand-off file at the end of Stage 1. This app does not read it yet, so I retype things by hand. I want this app to (a) read that file, (b) use the same IDs and evidence grades as the other apps, and (c) write its findings back out in one agreed shape.

| Stage | Name | App |
|---|---|---|
| 0 Frame, 1 Focus, 5 Deliver | charter, diagnostic, scoreboard | Capability Compass |
| 1 Focus, 4 Design | structure | Org Modeling |
| 2 Find, 3 Dial | how work really runs | Process Map Studio |
| 3 Dial, 4 Design | how much AI should do | AI Org Advisory Workbench |

I am not a developer. Follow this repository's own working rules (PROJECT_STATE.md, DECISIONS.md, CLAUDE.md, run_checks or the gate script if present). **Before writing code, read the existing code this touches and tell me in plain language what you found and your plan; wait for my go-ahead.** Where this document and the code disagree about what this app already does, the code is right: tell me.

## 2. The shared language (fixed; do not redesign)

### 2.1 IDs
An ID is a prefix and a number, never reused. Outside its home it is written with the engagement key in front: `MERIDIAN:CAP-03`.

| Prefix | Names | Minted by |
|---|---|---|
| `CAP-nn` | Capability cluster | Compass |
| `VS-nn` | Value stream / pilot | Compass |
| `CAP-nn.Lens` | One Compass cell, e.g. `CAP-03.People` | Compass |
| `LV-nn` | P&L lever | Compass |
| `RL-nnn` | Anchor role | Compass |
| `SG-nnn` | External signal | Compass |
| `P1…`, `C1…C8`, `DC-n`, `LG-n`, `DEC-nn` | Design principle, reference component, design criterion, leapfrog gate test, decision | Compass (Stage 0) |
| `S-nn`, `Xn`, `In` | Process step, discrepancy, intent statement | Process Map Studio |
| `Hn` | Operating-model hypothesis | Org Modeling |
| `T-nnn` | Task | Workbench |

This app must **store and display Compass IDs exactly as received**, never renumber them, and never mint an ID with a prefix it does not own.

### 2.2 Evidence grades
Three grades, same words everywhere: **Confirmed**, **Indicated**, **Hypothesis** (keys `confirmed`, `indicated`, `hypothesis`). The grade is the assessor's judgement; never compute it from a count of sources. A Hypothesis never drives a decision on its own. Keep this app's own evidence vocabulary internally if it has one, and add the shared grade alongside it wherever a finding is shown or exported.

### 2.3 The file this app reads: `compass-handoff` v1.0
One JSON file named `<key>_compass_handoff.json`. I will give you a sample: `meridian_compass_handoff.json` (fictional data). Top-level fields:

```
format "compass-handoff", format_version "1.0", generated_at, source_app
engagement   key, name, organisation, industry, unit, scope, currency, value_unit, baseline_version
vocabulary   maturity_levels, evidence_grades, id_prefixes
charter      sponsor, locked_at, thesis, principles[], reference_model[], design_criteria[],
             leapfrog_gate[], evidence_rules[], decision_log[]
clusters[]   ref, name, priority_move, avg_level, trajectory, economic_weight_pct, money_at_risk,
             cells[]: ref, lens, level, level_label, status, rationale, grade, trajectory, evidence[], watch[]
levers[]  roles[]  signals[]  pilots[]  exclusions[]  readiness
for_apps     org_modeling, process_map_studio, workbench     <- the block written for each app
```

Import rules, the same in every app:
1. Reject a file whose `format` is not `compass-handoff`, with a plain-language message. Accept any `1.x`; ignore fields you do not know.
2. Show me a preview of what will be created or changed, and apply nothing until I confirm.
3. Never overwrite something I typed without asking.
4. Keep the engagement `key` and every Compass `ref` on the records created from it.
5. If `readiness.ready` is false, show that as a warning; do not block.
6. The file contains no API key and no document text. Do not add either to anything this app exports.

### 2.4 The file this app writes: `compass-return` v1.0
So findings can travel back and onward in one shape:

```
{ "format": "compass-return", "format_version": "1.0", "generated_at": "...",
  "source_app": "<this app>", "engagement_key": "MERIDIAN",
  "findings": [ { "ref": "<this app's own ID>", "kind": "<see section 3>", "title": "...",
                  "detail": "...", "grade": "confirmed|indicated|hypothesis",
                  "figure": "exact number with unit, or empty",
                  "relates_to": ["CAP-04.People", "VS-01", "RL-014"],
                  "source_note": "what the grade rests on" } ] }
```
`relates_to` holds the Compass IDs the finding bears on (may be empty). No names of individual people, no API key, no raw document or transcript text. Capability Compass does not import this file yet; today I will upload it there as a document, so also offer the same content as readable text.

## 3. What this means for Org Modeling

The block for this app is `for_apps.org_modeling`:
`strategy_text` (string), `design_criteria[]` (`id`, `ref`, `name`, `kind` measured|judged, `weight`, and for measured `metric` + `better`, optional `description`), `structure_lens[]` (`ref`, `cluster`, `level`, `status`, `grade`).

**A. Import (highest value).** Add "Import from Capability Compass" (a file picker, near where the org file is uploaded or in Compare options; propose the best place).
- `design_criteria[]` → the comparison criteria (I believe this is `PUT /comparison/criteria` and `comparison_service`; verify). The packet was shaped to this app's existing criteria object and metric names (`layers`, `total_cost`, `spans_within_benchmark`, `people_affected_pct`). Keep each criterion's `ref` (`DC-n`) and show it. Run the existing criteria validation; show its reasons if it fails.
- `strategy_text` → pre-fill the strategy text used by the archetype analysis; editable before running.
- `structure_lens[]` and `clusters[].priority_move` → shown as read-only context ("What the Compass found") on the screens where I judge options. It is evidence to test; it must never set or change a score here.
- Store `engagement.key` and show it in the header and in every export.

**B. Shared grade.** This app classes evidence as OBSERVABLE / PERCEPTUAL / MODEL-INFERRED. Keep that. Add the shared grade next to it: a suggested default (OBSERVABLE→Confirmed, PERCEPTUAL→Indicated, MODEL-INFERRED→Hypothesis) that I can change per finding. Archetype fit stays Hypothesis until I say otherwise.

**C. Hypotheses H1…** The workflow has me write operating-model hypotheses in this app after the archetype analysis, each with the evidence that would refute it. If there is no place for them, add a small register: `Hn`, statement, refuting evidence, status (open / supported / refuted), note. Numbers never reused.

**D. Return file.** `kind` values: `structural_baseline` (layers, spans, health score), `work_activity` (duplication, missing activity, hand-off gap), `hypothesis` (Hn), `option_score` (each compared option with its weighted total per `DC-n`). Let me attach Compass IDs to a finding (`relates_to`) from the list in the imported packet. Add it to the existing export pack. People stay as Employee IDs or counts, never names.

## 4. How to build it

- Small increments, each tested and committed, project state updated after each.
- Extend this app's existing data contract and tests; do not add a second way of doing the same thing.
- Automated tests must use the sample file and a deliberately broken copy (wrong `format`, missing `engagement.key`, a `cluster_ref` that points nowhere).
- No real AI calls in tests.
- End with the full check suite green and a plain-language summary: what works, what you did not do and why.

## 5. Out of scope

- Changing the format or the ID scheme (if something seems wrong, tell me; do not change it here).
- Features unrelated to import, shared IDs, shared grades and the return file.
- Anything that makes Capability Compass a required dependency: this app must still work on its own with no packet.
