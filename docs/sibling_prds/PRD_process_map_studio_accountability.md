# PRD: Process Map Studio, who decides, who is accountable, and who owns the SOPs, sent to the Compass

*Paste this whole document into Claude Code inside the **Process Map Studio** repository. Section 9 lists the files to attach.*

## 1. Why this change

I run a six-stage workflow across four apps I own. Before any design work I run a **current-state analysis across units** (countries, stations, assets or business units). The first app, **Capability Compass**, prints a six-page readout for my executive committee (EXCO). Two of EXCO's questions for every unit are this app's to answer:

> **Who decides, and who is really accountable?**
>
> **Who owns and updates the SOPs?** *(added 2026-11-25)*

This app already knows both halves of the answer for every decision and approval step on a published map:

- **who decides in practice**: the step's decider role (or its lane);
- **who is accountable**: the role holding **A** in the step's RACI, with **A?** when the sources disagree.

But the findings file it sends to the Compass carries only the lane, inside a sentence. So the Compass cannot show "decides" and "accountable" side by side. The Compass was changed on 2026-11-25: readout page 3 is now **"Who really decides, and who is accountable"** and shows, for each decision, three roles: **on paper**, **decides in practice**, and **accountable**. It flags a decision made by a different role from the one on paper, and a decision where the one who decides is not the one accountable. It reads these from four new optional fields on a finding. Until this app sends them, I type them in by hand in the Compass.

I want this app to:

- (a) send `decided_by`, `accountable` and `accountable_contested` on every decision-rights finding it already exports;
- (b) let me record, on a decision or approval step, **the role the documents name** (the decider "on paper"), with the passage it comes from, and send it as `on_paper`;
- (c) show on screen, on the RACI view, where the one who decides is not the one accountable;
- (d) record, for each SOP or manual in the sources, **its owner role, the role that updates it, its review dates and whether the copy in use is controlled**, and send one `sop` finding per SOP to the Compass, with how many steps it governs and how many of those are done differently.

For (d): the Compass now keeps an **SOP register per unit** (Current State → Findings → SOPs) and compares units on readout page 5 ("Who owns and updates the SOPs"), naming an SOP owned by different roles in different units. Today I type it there by hand. When this app sends `sop` findings, they appear in that register and I can correct them; the Compass keeps this app's value beside my correction.

I am not a developer. Follow this repository's own working rules (PROJECT_STATE.md, DECISIONS.md, CLAUDE.md, `./run_checks.sh`, the gates). **Before writing code, read the code this touches and tell me in plain language what you found and your plan; wait for my go-ahead.** Where this document and the code disagree about what this app already does, the code is right: tell me.

## 2. What this app already has (read on 2026-11-25; check it)

- Steps (`elements`) have a `kind` (activity, decision or approval), a `lane_role_id`, a `decider_role_id` and a `decision.mechanism`.
- Each step has a RACI (`RaciRecord`: `role_id`, `letter`, `contested`). The export shows a contested A as **"A?"** ("the sources disagree about who is accountable").
- Discrepancy type **D12** is "Different role". A D12 on a decision or approval gets `topic: "decision_right"` (`services/compass_return.py`, `discrepancy_topic`).
- `compass-return` 1.0 (`actions/compass_return.py`, `services/compass_return.py`): `step` findings carry `topic: "decision_right"` when the step is a decision or approval; `discrepancy` findings carry the D12 topic; `variation` findings from the country comparison carry `who_decides` differences with `topic: "decision_right"`.
- Names are hidden with `redaction.hide()`, and the `leaks` check refuses a file that would hold a hidden name.

- The **source register** (`SourceRegistry.tsx`, `SourceView`) records for each document: `kind` (including `sop` and `manual`), `version_date`, `owner` (free text) and `controlled_copy`. The HTML and Markdown exports list them. The Reality views compare practice with the SOP or manual (the Redline marks changes; `rv4`).
- Steps cite verified document passages (`exports.py`: "sop.docx §3.1").

There is **no field today for the role the documents name** as decider. A D12 discrepancy records that practice differs from the documents, but the documented role sits only in the evidence text. Section 4.2 adds it.

There is also **no record of who updates an SOP, when it was last reviewed or when its next review is due**, and the source `owner` is free text, so it can hold a person's name. Section 4.4 adds these.

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

**New kind `sop` and new ID prefix `SOP-nn`** (minted by this app, one per SOP or manual source in an engagement, never reused; written outside as `MERIDIANBE:SOP-01`). Fields on a `sop` finding, besides the usual `ref`, `kind`, `title`, `detail`, `grade`, `figure`, `relates_to` and `source_note`:

| Field | Type | Meaning |
|---|---|---|
| `title` | string | The SOP's own title (not the file name, if they differ) |
| `topic` | `"way_of_working"` | Puts it on readout page 5 |
| `owner_role` | string, ≤ 80 | The role accountable for the SOP's content. Leave out when not recorded. |
| `updated_by` | string, ≤ 80 | The role that keeps it current. Leave out when not recorded. |
| `version_date`, `last_reviewed`, `review_due` | string | `YYYY`, `YYYY-MM` or `YYYY-MM-DD`. Leave out when not known. |
| `controlled_copy` | `true` / `false` | Whether the copy in use is the controlled one. Leave out when not known. |
| `steps_governed` | number | Steps on the published map that cite this SOP in a verified passage |
| `steps_departing` | number | Of those, steps with a discrepancy (`Xn`) or a Redline change against this SOP |
| `figure` | string | e.g. "3 of 9 steps done differently" |
| `relates_to` | list | The hand-off's cluster and pilot refs for this engagement, plus the cluster's `.Process` cell |

The Compass flags an SOP with no owner, nobody named to update it, a review overdue (or, with no due date, no review or version in 24 months), an uncontrolled copy, or steps done differently. Send what you know; leave out what you do not. **Roles only: run every value through `hide()`.**

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

### 4.4 Who owns and updates each SOP
- In the source register, for documents of kind SOP or manual:
  - change **Owner** to a choice from the engagement's roles (with "other role…" as free text). A value that matches a name on the hidden-names list is refused with a plain message: "Name the role, not the person."
  - add **Updated by (role)**, the same kind of choice;
  - add **Last reviewed** and **Review due** beside the existing version date;
  - keep **Controlled copy** as it is.
- Existing free-text owners are kept and shown with a "check: is this a role?" marker until I confirm or change them. Do not convert them automatically.
- At the top of the Sources screen, one line: "n SOPs · n without an owner · n with nobody to update them · n review overdue · n uncontrolled".
- On export, one `sop` finding per SOP or manual source, as in section 3. Count `steps_governed` and `steps_departing` from the **published** version only.
- If the same SOP is uploaded twice (two versions), send only the newest by version date and say "Older version also in the sources" in `detail`.

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
6. Add three sources to the fixture: an SOP "Load planning and sign-off" (owner Station manager, updated by Shift supervisor, version 2019-04, last reviewed 2019-04, no review due, not controlled) cited by 9 steps, 3 of which carry a discrepancy; a manual "Overtime approval" with no owner; and an interview transcript. Export: two `sop` findings (`SOP-01`, `SOP-02`), none for the transcript. `SOP-01` matches the attached sample's `SOP-01` field for field (`steps_governed` 9, `steps_departing` 3, `controlled_copy` false). `SOP-02` has no `owner_role`.
7. Typing a person's name from the hidden-names list as an SOP owner is refused with "Name the role, not the person."; the `leaks` check still refuses a file that would hold it.
8. The Sources screen line reads "2 SOPs · 1 without an owner · 1 with nobody to update them · 0 review overdue · 1 uncontrolled" (the manual's other fields are empty, so it is not counted as uncontrolled).
9. All existing tests still pass. No real AI calls in tests.

## 7. How to build it
- Small increments: the three fields from the RACI on step findings; on discrepancy and variation findings; the on-paper field with its passage; the RACI view marks and count; the SOP fields in the source register; the `sop` findings on export. Test and commit each, and update the project state after each.
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
| `belmar_return_process_map_studio.json` | Yes | The expected shape: `X1` and `X3` carry the decision fields (test 2); `SOP-01` is a `sop` finding (test 6) |
| `docs/HANDOFF_FORMAT.md` | Helpful | The shared format, section 5 |
