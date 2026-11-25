# PRD: Process Map Studio, who decides and who is accountable, sent to the Compass

*Paste this whole document into Claude Code inside the **Process Map Studio** repository. Section 9 lists the files to attach.*

## 1. Why this change

I run a six-stage workflow across four apps I own. Before any design work I run a **current-state analysis across units** (countries, stations, assets or business units). The first app, **Capability Compass**, prints a six-page readout for my executive committee (EXCO). EXCO's first question for every unit is:

> **Who decides, and who is really accountable?**

This app already knows both halves of the answer for every decision and approval step on a published map:

- **who decides in practice**: the step's decider role (or its lane);
- **who is accountable**: the role holding **A** in the step's RACI, with **A?** when the sources disagree.

But the findings file it sends to the Compass carries only the lane, inside a sentence. So the Compass cannot show "decides" and "accountable" side by side. The Compass was changed on 2026-11-25: readout page 3 is now **"Who really decides, and who is accountable"** and shows, for each decision, three roles: **on paper**, **decides in practice**, and **accountable**. It flags a decision made by a different role from the one on paper, and a decision where the one who decides is not the one accountable. It reads these from four new optional fields on a finding. Until this app sends them, I type them in by hand in the Compass.

I want this app to:

- (a) send `decided_by`, `accountable` and `accountable_contested` on every decision-rights finding it already exports;
- (b) let me record, on a decision or approval step, **the role the documents name** (the decider "on paper"), with the passage it comes from, and send it as `on_paper`;
- (c) show on screen, on the RACI view, where the one who decides is not the one accountable.

I am not a developer. Follow this repository's own working rules (PROJECT_STATE.md, DECISIONS.md, CLAUDE.md, `./run_checks.sh`, the gates). **Before writing code, read the code this touches and tell me in plain language what you found and your plan; wait for my go-ahead.** Where this document and the code disagree about what this app already does, the code is right: tell me.

## 2. What this app already has (read on 2026-11-25; check it)

- Steps (`elements`) have a `kind` (activity, decision or approval), a `lane_role_id`, a `decider_role_id` and a `decision.mechanism`.
- Each step has a RACI (`RaciRecord`: `role_id`, `letter`, `contested`). The export shows a contested A as **"A?"** ("the sources disagree about who is accountable").
- Discrepancy type **D12** is "Different role". A D12 on a decision or approval gets `topic: "decision_right"` (`services/compass_return.py`, `discrepancy_topic`).
- `compass-return` 1.0 (`actions/compass_return.py`, `services/compass_return.py`): `step` findings carry `topic: "decision_right"` when the step is a decision or approval; `discrepancy` findings carry the D12 topic; `variation` findings from the country comparison carry `who_decides` differences with `topic: "decision_right"`.
- Names are hidden with `redaction.hide()`, and the `leaks` check refuses a file that would hold a hidden name.

There is **no field today for the role the documents name** as decider. A D12 discrepancy records that practice differs from the documents, but the documented role sits only in the evidence text. Section 4.2 adds it.

Keep all of that working. Everything below is **additive**: the format stays `compass-return` 1.0.

## 3. The shared language (fixed; do not redesign)

Unchanged: the IDs this app mints (`S-nn`, `Xn`, `In`, `Vn`), the three evidence grades (**Confirmed**, **Indicated**, **Hypothesis**), `compass-handoff` 1.x in and `compass-return` 1.0 out, and the existing kinds, topics and reason classes.

**New optional fields on a finding** (send them only on findings whose `topic` is `decision_right`):

| Field | Type | Meaning |
|---|---|---|
| `on_paper` | string, ≤ 80 characters | The role the documents name as the decider. Leave it out when not recorded. |
| `decided_by` | string, ≤ 80 characters | The role that decides in practice, on the published map |
| `accountable` | string, ≤ 80 characters | The role holding **A** on that step. If more than one role holds A, join them with " / ". Leave it out when no role holds A. |
| `accountable_contested` | `true` only | Send `true` when the A is contested ("A?") **or** more than one role holds A. Otherwise leave the field out. |

Rules the Compass applies, so this app must respect them:

- Role names only, never a person's name. Run every value through `hide()`, and keep the `leaks` check over the whole file.
- An empty value is dropped; `accountable_contested` counts only when it is exactly `true`.
- The Compass compares the role names as text, ignoring case and punctuation. **Use exactly the same role name** for the same role in all three fields, so "Shift supervisor" decides and "Certified load controller" is accountable is read as a split, and "Shift supervisor" in both is not.
- The owner can overwrite any of the three in the Compass. The Compass keeps both values and marks the overwrite.

## 4. What to build

### 4.1 Send the fields on every decision-rights finding
- **`step` findings** with `topic: "decision_right"`: `decided_by` = the name of the step's `decider_role_id`, or of its lane role when there is no decider; `accountable` and `accountable_contested` from the step's RACI; `on_paper` from 4.2 when recorded.
- **`discrepancy` findings** with `topic: "decision_right"` (D12 on a decision or approval): the same three fields, taken from the **first decision or approval step** the discrepancy is attached to. If it is attached to more than one such step and their values differ, send the first and add to `detail`: "Also at S-nn, S-nn."
- **`variation` findings** with `topic: "decision_right"`: the fields for **this** unit's step. The other unit's roles stay in the `detail` text, as today.

### 4.2 The decider "on paper"
- On a decision or approval step, add an optional field **"Decider named in the documents"**: a choice from the engagement's roles, plus "not named in any document".
- Next to it, the passage that names it: pick from the step's existing cited document passages. A value with no passage is allowed but marked "not cited".
- When I record a decider on paper that differs from the decider in practice, and there is no D12 discrepancy on the step, show a hint: "The documents name a different decider. Record a Different role discrepancy?" Do not create it for me.
- This is my judgement. AI may *suggest* the documented decider from cited passages only if that fits this app's existing AI rules (optional, behind the existing AI setting, limited to existing role IDs, never applied without my confirmation). If that is not a small change, leave AI out.

### 4.3 Show it on the RACI view
- On the RACI matrix, mark each decision or approval step where the decider in practice is not the A with a symbol (not colour alone) and the words "decides ≠ accountable".
- Add a one-line count above the matrix: "n decisions · n decided by a different role from the documents · n where the one who decides is not accountable · n with a contested A".

## 5. Rules that must hold
- This app never changes a Compass ID, status or score.
- No person's name ever appears in an exported file.
- Nothing new is sent to an AI unless 4.2's optional suggestion is built, and then only under the existing AI rules.
- A published version's export is reproducible: the same version gives the same fields.
- The app still works on its own, with no Compass hand-off.

## 6. Acceptance tests

Build a small fictional fixture engagement (or extend an existing fixture) started from the attached `belmar_compass_handoff.json`, with these steps on a published version:

| Step | Kind | Decider in practice | RACI A | On paper | Expected in the return file |
|---|---|---|---|---|---|
| S-03 Sign off the load plan | approval | Shift supervisor | Certified load controller | Certified load controller | `on_paper` "Certified load controller", `decided_by` "Shift supervisor", `accountable` "Certified load controller"; no `accountable_contested` |
| S-05 Approve overtime | approval | Station manager | Regional roster owner, **contested** | Regional roster owner | `accountable_contested: true` |
| S-07 Approve the renewal price | decision | Country manager | Country manager **and** Regional finance controller | (not recorded) | `accountable` "Country manager / Regional finance controller", `accountable_contested: true`, no `on_paper` |
| S-08 Release the bid | decision | (none; lane is Commercial lead) | (none) | (not recorded) | `decided_by` "Commercial lead"; no `accountable`, no `on_paper` |
| S-02 Weigh the cargo | activity | | | | none of the four fields |

1. Export the findings file. The four fields appear on the `step` findings exactly as in the table, and on a D12 discrepancy attached to S-03.
2. Compare the S-03 values with finding `X1` in the attached `belmar_return_process_map_studio.json`, and the S-05 values with `X3`: same field names, same shape.
3. A role name on the hidden-names list is hidden in all three fields, and the `leaks` check still refuses a file that would hold it.
4. The RACI view marks S-03, S-05 and S-07 "decides ≠ accountable" and shows the count line.
5. Recording an on-paper decider that differs from the decider in practice, with no D12, shows the hint and creates nothing.
6. All existing tests still pass. No real AI calls in tests.

## 7. How to build it
- Small increments: the three fields from the RACI on step findings; on discrepancy and variation findings; the on-paper field with its passage; the RACI view marks and count. Test and commit each, and update the project state after each.
- Record the new step field in DECISIONS.md before building it.
- Extend this app's existing data contract and tests; do not add a second way of doing the same thing.
- End with the full check suite green and a plain-language summary: what works, what you did not do, and why.

## 8. Out of scope
- Changing the shared format, the ID scheme or the discrepancy types.
- Counting steps and handoffs per unit for the Compass (a separate, later change).
- Decision rights outside the mapped value stream.
- Any change that makes Capability Compass a required dependency.

## 9. What to attach

All files are fictional. They are in the Capability Compass repository **`Kaizen74/Org_Capability_Diagnostic`**, branch **`claude/org-diagnostic-system-app-syt54v`**, folder **`docs/samples/countries/`**. If you can read that repository, copy them from there into this repository's test fixtures. If you cannot, ask me to attach them.

| File | Needed? | What it is for |
|---|---|---|
| `belmar_compass_handoff.json` | Yes | Starts the fixture engagement |
| `belmar_return_process_map_studio.json` | Yes | The expected shape: `X1` and `X3` carry the new fields (test 2) |
| `docs/HANDOFF_FORMAT.md` | Helpful | The shared format, section 5 |
