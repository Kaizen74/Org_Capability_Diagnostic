# PRD — Process Map Studio: shared language and hand-off with the other three apps

*Paste this whole document into Claude Code inside the Process Map Studio repository, and attach the sample file `meridian_compass_handoff.json`.*

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

## 3. What this means for Process Map Studio

The block for this app is `for_apps.process_map_studio.engagements[]`, one per pilot:
`name`, `process_name`, `process_kpi`, `industry`, `in_scope_roles[]`, `interview_prompts[]`. The matching pilot is in `pilots[]` (`ref` such as `VS-01`, `cluster_ref`).

**A. Import (highest value).** Add "Start from a Capability Compass hand-off" where a new engagement is created.
- I pick the file, then pick which pilot. Pre-fill the engagement's name, process name, process KPI and industry, and create the roles in scope. I review and edit before saving. All existing readiness rules still apply.
- Store on the engagement: the engagement `key`, the pilot `ref`, its `cluster_ref`, and the list of Compass cell IDs for that cluster (so findings can point back).
- `interview_prompts[]` → offered as suggested probes when a guide is built. They are prompts, not evidence: they must never become a claim, an element or a source, and must not bypass grounding.
- `charter.principles[]` and any `Hn` I add by hand → a short "What we are testing" list on the engagement, each with a verdict I set (supported / refuted / open) and the discrepancy or step IDs behind it.

**B. Shared IDs.** Discrepancies already have codes that are never reused (`X1`…). Confirm steps and intent statements have equally stable codes (`S-nn`, `In`); if steps only have an internal key, add a displayed step code that survives refresh and republish. Show the engagement key and pilot ref on the map header and in exports.

**C. Shared grade.** Keep provenance O / I / R and the existing discrepancy grading. Add the shared grade to every discrepancy and gap finding: suggest a default from what already exists (system record plus another source → Confirmed; a single source → Indicated; inferred or unverified → Hypothesis), and let me change it. Do not weaken any existing rule (the grounding gate, the quality card, "Reality views are computed, never generated").

**D. Return file.** `kind` values: `step` (S-nn with work type and rule-or-judgment), `discrepancy` (Xn with its figure), `intent` (In, met or not), `knowledge_risk`, `hypothesis_verdict`. `relates_to` defaults to the pilot ref and its cluster; let me add specific cell IDs (e.g. `CAP-04.Process`). Offer it from a published version only. No verbatim quotes, no names, no redaction terms — the same exclusions the existing export already applies.

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
