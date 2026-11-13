# PRD: Process Map Studio, the same process in another country

*Paste this whole document into Claude Code inside the **Process Map Studio** repository. Section 10 lists the files to attach.*

## 1. Why this change

I run a six-stage workflow across four apps I own. Before any design work I now run a **current-state analysis by country**. It answers which roles exist, who really decides, how work really runs, and how all of that differs from one country to the next.

The first app, **Capability Compass**, keeps **one workspace per country**, copied from one frame, so an ID means the same thing everywhere. A value stream keeps its ID in every country: `VS-01` "Bid to contract renewal" is `VS-01` in Arden and in Belmar. The Compass prints a six-page readout for my executive committee (EXCO). This app is the source for two of its pages:

- page 3, **"Who really decides"**
- page 5, **"How work really runs"**

Today this app maps each country well, but the maps **cannot be compared**. PRD §1 (out of scope) and §10 (future upgrades) put cross-engagement work aside. **I am reversing that for one case** (owner decision, 2026-11-13): comparing two **published** maps of **the same process in two countries**. Cross-engagement *pattern suggestions* from the cause library stay out of scope.

I want this app to:

- (a) know which country an engagement covers;
- (b) start a country's engagement from the scope, roles and conventions of another country's engagement for the same process;
- (c) line up the steps of two published maps;
- (d) show, class and print the differences;
- (e) send them back to the Compass in the shared format, with a few new optional fields.

I am not a developer. Follow this repository's own working rules (PROJECT_STATE.md, DECISIONS.md, CLAUDE.md, `./run_checks.sh`, the gates). **Before writing code, read the existing code this touches and tell me in plain language what you found and your plan; wait for my go-ahead.** Where this document and the code disagree about what this app already does, the code is right: tell me. This change touches the PRD (§1, §10 and the new section), so record the decision in DECISIONS.md first.

## 2. What this app already has (read on 2026-11-13; check it)

- **Start from a Compass hand-off** (DECISIONS 95). `CompassLink` keeps `key`, `pilot_ref`, `cluster_ref`, `cell_refs`, `interview_prompts`, `ready` and `generated_at`.
- **Map another flow** (DECISIONS 81, 93). It starts a new engagement with the same documents, roles and conventions, and copies nothing of the map.
- **Steps** (`elements`) have:
  - a `stable_key` that survives refresh and republish, and a shared code `S-nn` (`shared_codes`)
  - a `kind` (activity, decision or approval) and a `lane_role_id`
  - `decider_role_id` and `decision_mechanism`
  - `work_type`, `work_min` and `wait_min`, and `provenance`
  - divergence types and a knowledge risk
- **Log-to-map alignment** (R5a, F1): deterministic proposals, an optional Claude suggestion job limited to existing keys, my confirmations stored and audited, and confirmations that follow a refreshed step.
- **Discrepancies** with persistent `Xn` codes and verdicts (D12 is "Different role"), intent statements `In`, the Reality views, and the Reality pack (16:9 pages, fixed templates, no AI narrative, at least 5 cases for any figure).
- **`compass-return` 1.0** (`services/compass_return.py`) with kinds `step`, `discrepancy`, `intent`, `knowledge_risk` and `hypothesis_verdict`, and the `leaks` check.

Keep all of that working. Everything below is additive.

## 3. The shared language (fixed; do not redesign)

Unchanged from the earlier PRD: IDs (this app mints `S-nn`, `Xn` and `In`), the three evidence grades (**Confirmed**, **Indicated**, **Hypothesis**; the assessor's judgement), `compass-handoff` 1.x in and `compass-return` 1.0 out.

**New since the earlier PRD** (all additive; the format stays 1.0):

| Where | Field | Meaning |
|---|---|---|
| Hand-off packet | `engagement.country` | The country the packet's workspace covers, e.g. `"Belmar"` (empty for a group-wide workspace) |
| Hand-off packet | `pilots[].ref` | **The same `VS-nn` in every country** for the same value stream. Two engagements with the same `pilot_ref` from the same frame map the same process. |
| Hand-off packet | `engagement.key` per country | Frame key plus a country code: `MERIDIAN` (Arden), `MERIDIANBE` (Belmar), `MERIDIANCA` (Caldera) |
| ID | **`Vn`** | **New prefix, minted by this app**: one difference between two countries' maps, e.g. `V1`. Never reused within an engagement; written outside it as `MERIDIANBE:V1`. |
| Return file header | `country` | The country the findings describe |
| Return finding | `topic` | `decision_right` (who decides), `role_presence` (which roles exist), `role_reason` (why a role is there), `way_of_working` (how work runs). It decides the Compass readout page. |
| Return finding | `reason_class` | Why a difference exists: `required` (regulation, a customer contract, the physical site), `chosen` (a deliberate local decision someone can state), `inherited` (history, an acquisition, habit; nobody decided it), or `unknown` |
| Return finding | `compared_with` | The other country, e.g. `"Arden"` |
| Return finding | kind **`variation`** | **New kind**: one difference between this country's map and the reference country's map of the same process |

The three reasons are the **same words the Compass uses** to class every difference between countries. Use exactly **Required**, **Chosen**, **Inherited** and **Not known yet** on screen. They are not your discrepancy verdicts. A verdict compares *documented with done* inside one country; a reason explains why *two countries* differ. Both can apply to one step.

## 4. What to build

### 4.1 The country on an engagement
- `CompassLink` gains **`country`**, read from `engagement.country` when an engagement starts from a packet.
- The scope card shows the country. For an engagement not started from a packet, the scope card has an optional, editable **Country** field.
- Engagement cards show the country next to the name.

### 4.2 Start a country from another country's engagement
When I start an engagement from a packet whose `pilot_ref` and frame match an existing engagement, the preview asks: *"Arden already maps VS-01 Bid to contract renewal. Start from its scope card, conventions and lanes?"* A matching frame means the key starts with the same frame key, or the cluster refs are the same.

If I say yes, the new engagement copies:
- the process name, trigger, end point, process KPI and in-scope roles
- the mapping conventions
- the lane names I choose (as in DECISIONS 93)

It copies **no documents, no transcripts, no map and no codes**: another country has its own sources. It records a **reference engagement** (the one it started from).

The same action is available as **"Map this process in another country"** on any engagement with a published version, for engagements that did not start from a packet. I type the country.

### 4.3 Line up the steps of two published maps
A **Compare countries** screen: choose the **reference** (e.g. Arden) and one **other** country (e.g. Belmar). Both must be **published** versions. Offer engagements in the same family first: the same reference engagement or the same `pilot_ref`.

1. **Proposals, deterministic first.** Match steps on shared words in the label, the same lane role name, the same step kind and the same phase name, then order. Each proposal says why it was proposed.
2. **Optional Claude suggestion as a job**, the same pattern as R5a. Claude may only pair existing step keys. Mock it in tests.
3. **I decide each pair**: Confirm, Choose another step, **Only in Arden**, or **Only in Belmar**. Store the decisions by `stable_key`, audit them, and carry them through a republish the way F1 does. If either side is republished, the screen says "a newer version exists" and offers to refresh, keeping my confirmations.

### 4.4 What counts as a difference
For each confirmed pair, compute differences **deterministically**:

| Difference | Rule | Topic |
|---|---|---|
| Who does it | lane role names differ | `way_of_working` |
| Who decides | `decider_role_id` names differ, or one side has a decider and the other has none | `decision_right` |
| How it is decided | `decision_mechanism` differs (rule-based or judgment) | `decision_right` |
| What kind of step | activity, decision or approval differs | `decision_right` if either side is a decision or approval, else `way_of_working` |
| Work type | confirmed work types differ | `way_of_working` |
| Time | both sides have figures and one is at least **1.5 times** the other. System figures follow your 5-case rule. | `way_of_working` |
| Documented vs done | a discrepancy (`Xn`) sits on this step in one country only | the discrepancy's own topic (see 4.7) |
| Present in one country only | a step marked "Only in …" | `way_of_working`, or `role_presence` when its lane role exists in that country only |

Each difference is a **separate line** with both values in words: "Approve the renewal price: decided by the country manager in Belmar, by the regional finance controller in Arden."

### 4.5 Class each difference, then print
- For each difference: **Required**, **Chosen**, **Inherited** or **Not known yet**; one line of reason; and a grade.
  - The grade is my choice. Suggest `indicated` when both steps are Observed with at least one source each, otherwise `hypothesis`, and say why.
- A difference gets its **`Vn` code the first time I class it or keep it**. The code belongs to the *other* engagement (Belmar), is never reused, and is stored like your other shared codes. I can **dismiss** a difference ("not a real difference") with a note. Dismissed differences get no code and are not exported.
- **Country comparison pages**, printable, in the Reality pack style:
  - a summary page (counts by reason and by topic)
  - "Who decides" (all `decision_right` differences)
  - "How the work differs" (the rest)
  - "Only in one country"

  Use fixed templates with no AI narrative, the same 5-case rule for any system figure, and no quotes, names or source text.

### 4.6 Findings back to the Compass
The **Belmar** engagement's return file (`<key>_compass_return.json`, plus the readable text) gains:
- the header field **`country`**
- one **`variation`** finding per coded, not-dismissed difference in comparisons **where Belmar is the "other" country**

The reference country's file does **not** repeat them; each difference is reported once, by the country being compared. A variation finding looks like this:

```json
{
  "ref": "V1",
  "kind": "variation",
  "title": "Renewal pricing: approved by the country manager in Belmar, by the regional finance controller in Arden",
  "detail": "Types: Different role. Step S-07 (Approve the renewal price). Reason: Belmar kept its pre-merger delegation of authority.",
  "grade": "indicated",
  "figure": "",
  "relates_to": ["VS-01", "CAP-04", "CAP-04.Process"],
  "source_note": "Compared between the two published maps of VS-01; each side rests on 3 interviews.",
  "topic": "decision_right",
  "reason_class": "inherited",
  "compared_with": "Arden"
}
```

- `relates_to`: the same list your other findings use (pilot ref, cluster ref, cell refs).
- `reason_class`: leave the field out when "Not known yet" was never chosen. Use `unknown` only when I chose "Not known yet".
- `figure`: for a time difference, both figures with their labels, e.g. "12 min vs 31 min (typical case, 5+ cases)".
- `detail`: name the step by **this country's** `S-nn` code. The reference country's code is not meaningful outside its engagement.

### 4.7 Topics on the findings you already send
Add `topic` to existing findings so the Compass places them on the right page without guessing from wording:

| Finding | Topic |
|---|---|
| discrepancy with type D12 "Different role" on a decision or approval step | `decision_right` |
| any other discrepancy | `way_of_working` |
| `step` with kind decision or approval | `decision_right` |
| any other `step` | `way_of_working` |
| `intent` and `hypothesis_verdict` | leave out |
| `knowledge_risk` | leave out (the Compass already files it under roles) |

## 5. Rules that must hold
- A comparison reads **only published versions** of engagements on this machine. Drafts are never compared.
- **Nothing moves between engagements** except the scope card fields, conventions and lane names in 4.2. No source, quote, name, transcript passage or claim crosses.
- No AI-written narrative. Matching suggestions only, as a job, limited to existing step keys, and never applied without my confirmation.
- A difference is never classed by the app. The reason is mine.
- The `leaks` check runs on every comparison export and every return file.
- The app still works on its own, with no packet and no comparison.

## 6. PRD and DECISIONS updates
- PRD §1 (out of scope): replace "cross-engagement pattern suggestions" with "cross-engagement pattern suggestions from the cause library (comparing two published maps of the same process in different countries is in scope, §3.x)".
- PRD §10: keep pattern suggestions as a future upgrade.
- Add a section §3.x "Comparing countries" with the rules above, and the B-list enums: reason classes, topics, difference kinds, the `variation` return kind and the `V` prefix.
- DECISIONS.md: record the reversal (owner decision, 2026-11-13) and each choice you make.

## 7. Acceptance tests
Build two small fictional published maps of the same process for Arden and Belmar as fixtures, the way your A.12 fixtures are built. Start them from the attached `arden_compass_handoff.json` and `belmar_compass_handoff.json` (pilot `VS-01`). Then:

1. Starting Belmar from its packet offers Arden's scope card, conventions and lanes. Accepting copies those and **nothing else** (prove that no source or element was copied).
2. Both engagements show their country, and `pilot_ref` is `VS-01` in both.
3. Proposals pair the obvious steps. Confirmed pairs survive a republish of either side.
4. A step decided by different roles yields a `decision_right` difference. A step only Arden has yields "Only in Arden". A time difference under 1.5 times yields nothing.
5. Classing a difference mints `V1`. Classing another mints `V2`. Dismissing one and classing a new one never reuses a code.
6. Belmar's return file has `country: "Belmar"` and its `variation` findings, in the shape of the attached `belmar_return_process_map_studio.json`. Arden's file has none of them. Existing finding kinds carry the topics in 4.7.
7. The printable comparison passes your screenshot and accessibility checks and contains no names, quotes or source text.
8. Comparing a draft is refused with a plain message, and so is comparing two maps of different processes. Different processes means a different `pilot_ref` and no reference link; ask before comparing those.
9. All existing tests and gates still pass. No real AI calls in tests.

## 8. How to build it
- Contract first, as this repository does: the endpoints, schemas and enums for country, reference engagement, matches, differences and `Vn` codes, then tests, then code.
- Small increments:
  1. country and reference engagement
  2. start-from-another-country
  3. step matching
  4. differences and classing
  5. printable pages
  6. return file and topics

  Run all checks, commit and update the project state after each.
- End with the full check suite green and a plain-language summary: what works, what you did not do, and why.

## 9. Out of scope
- Comparing three or more countries on one screen. Compare each country with the same reference instead.
- Pattern suggestions across engagements from the cause library (stays in §10).
- Drawing a future-state map.
- Changing the shared format or the ID scheme beyond the additions above (if something seems wrong, tell me; do not change it here).
- Any change that makes Capability Compass a required dependency.

## 10. What to attach

All files are fictional. They are in the Capability Compass repository **`Kaizen74/Org_Capability_Diagnostic`**, branch **`claude/org-diagnostic-system-app-syt54v`**, folder **`docs/samples/countries/`**. If you can read that repository, copy them from there into this repository's test fixtures. If you cannot, ask me to attach them.

| File | Needed? | What it is for |
|---|---|---|
| `arden_compass_handoff.json`, `belmar_compass_handoff.json` | **Required** | The same pilot `VS-01` in two countries, with their own keys and `engagement.country` |
| `belmar_return_process_map_studio.json` | **Required** | The shape the Compass expects back for Belmar, including a `variation` finding and topics (the Compass's own tests import this exact file) |
| `caldera_compass_handoff.json` | Optional | A third country with **no** pilot, to test the refusal in test 8 |
| `docs/HANDOFF_FORMAT.md` (repository root `docs/`) | Optional | The full shared format, if you need more than this document |

You do **not** need transcripts or documents from me: build the two fixture maps yourself, as you did for A.12.
