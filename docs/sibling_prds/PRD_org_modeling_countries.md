# PRD: Org Modeling, roles and structure by country

*Paste this whole document into Claude Code inside the **Org Modeling** repository. Section 9 lists the files to attach.*

## 1. Why this change

I run a six-stage workflow across four apps I own. Before any design work I now run a **current-state analysis by country**. It answers four questions: which roles exist, why they exist, who really decides, and how work really runs, plus how all of that differs from one country to the next.

The first app, **Capability Compass**, now keeps **one workspace per country**. Every country's workspace is copied from one frame, so an ID means the same thing everywhere (`RL-011` is "Head of Pricing / Revenue Management" in every country). It compares the countries and prints a six-page readout for my executive committee (EXCO). Page 4 of that readout is **"Which roles exist where, and why"**, and this app is its source. Today this app cannot supply it, for two reasons:

1. It has **no country**. It groups people by Department only.
2. It has **nowhere to record why a role exists**, or why it is missing, in a given country.

I want this app to (a) read a **Country** column from the org file and show structure by country, (b) link **one Compass hand-off packet per country** to the same uploaded org file, (c) give each Compass anchor role a **head-count and a reason per country**, and (d) export **one findings file per country** in the shared format, with two new optional fields.

I am not a developer. Follow this repository's own working rules (PROJECT_STATE.md, DECISIONS.md, CLAUDE.md, `./run_checks.sh`). **Before writing code, read the existing code this touches and tell me in plain language what you found and your plan; wait for my go-ahead.** Where this document and the code disagree about what this app already does, the code is right: tell me.

## 2. What this app already has (read on 2026-11-13; check it)

- `backend/app/parsers/csv_parser.py`: required columns `Name, Job Title, Grade, Level, Line Manager`; optional columns `Department, Employee ID, Line Manager ID, Salary, Work Activities, Job Description, Work Type`. People are keyed by Employee ID, and layers are computed from the reporting chain.
- Department-level metrics (P2.1), the org chart with overlays, and Work Activities.
- `Engagement` (in `models.py`) is **one per analysis** (`analysis_id` is unique), holding one Compass `key` and one `packet`.
- `compass_service.py`: imports `compass-handoff` 1.x (preview, then confirm), and builds `compass-return` 1.0 with kinds `structural_baseline`, `work_activity`, `hypothesis` and `option_score`. Its refs are `baseline.layers`, `baseline.spans`, `baseline.health`, `work.*`, `Hn` and `option.*`.

Keep all of that working. Everything below is additive.

## 3. The shared language (fixed; do not redesign)

Unchanged from the earlier PRD: IDs (`CAP-nn`, `VS-nn`, `RL-nnn` and the others; this app mints only `Hn`), the three evidence grades (**Confirmed**, **Indicated**, **Hypothesis**; the assessor's judgement, never computed), `compass-handoff` 1.x in and `compass-return` 1.0 out.

**New since the earlier PRD** (all additive; the format stays 1.0):

| Where | Field | Meaning |
|---|---|---|
| Hand-off packet | `engagement.country` | The country this packet's workspace covers, e.g. `"Belmar"`. Empty for a group-wide workspace. |
| Hand-off packet | `roles[].status_confirmed` | `false` while a role copied from another country is still "to confirm" there. Its `status` is then a placeholder, not a judgement. |
| Hand-off packet | `engagement.key` per country | The frame's key plus a 2–3 letter code: `MERIDIAN` (Arden), `MERIDIANBE` (Belmar), `MERIDIANCA` (Caldera). |
| Return file header | `country` | The country the findings describe. |
| Return finding | `topic` | What the finding is about: `decision_right`, `role_presence`, `role_reason` or `way_of_working`. It decides the readout page in the Compass. |
| Return finding | `reason_class` | Why it is so: `required` (regulation, a customer contract, the physical site), `chosen` (a deliberate local decision someone can state), `inherited` (history, an acquisition, habit; nobody decided it), or `unknown`. |
| Return finding | `compared_with` | The other country a difference is measured against, e.g. `"Arden"`. |
| Return finding | kind `role_reason` | **New kind, minted by this app**: why an anchor role exists, is thin, or is missing in this country. |

The three reasons are the **same words the Compass uses** to class every difference between countries. Use exactly these words on screen: **Required**, **Chosen**, **Inherited**, **Not known yet**.

## 4. What to build

### 4.1 Country column
- Accept an optional column **`Country`** (also accept the header `Country/Region`). Trim values; a blank value reads "Not stated" and is shown as its own group, never dropped.
- A person's country is **where they work**. A reporting chain may cross countries: in the sample, Belmar's managing director reports to the group chief executive in Arden.
- **Layers** for a country are counted from the top of the whole organisation down to the deepest person in that country. Decision distance starts at the top. Say so on screen in one line.
- **Spans**: a manager's span counts all their direct reports, wherever those people work. The manager is listed under their own country.
- **Cost**: summed by each person's country, in the currency the app is set to. If an org file mixes currencies, the app cannot know. Add one line on screen: "Salaries are read as one currency; convert before uploading if countries are paid in different currencies."
- Files without a Country column behave exactly as today.

### 4.2 By-country view
A **By country** view, built the way the department view is, with countries side by side. For each country show:
- head-count
- managers
- layers
- median span
- managers within their span benchmark
- single-report managers
- cost
- the structural health score

A difference between countries is stated in **words and a symbol**, never by colour alone (for example "⚑ one layer more than Arden"). Add a **Country filter** to the org chart and the department view.

### 4.3 One hand-off packet per country
- Change the link from one engagement per analysis to **one engagement per (analysis, country)**. Migrate the existing row to the "whole organisation" link (country empty). Nothing already imported may be lost.
- Importing a packet uses the existing preview and confirm flow, plus these rules:
  - Show the packet's `engagement.country`. Match it to a value in the Country column (case-insensitive). If there is no match, ask me to pick one of the countries in the file, or "whole organisation".
  - If a packet for that country is already linked, the preview says it will be **replaced**, and nothing changes until I confirm.
  - If the new packet comes from a **different frame**, warn me in plain words ("these IDs may not mean the same thing"). A different frame means its cluster refs or role refs differ from a packet already linked.
  - **Design criteria and strategy text** come from the first packet linked, as today. A later packet never overwrites them; the preview says "same" or "different".
- The read-only "What the Compass found" panel gets a country picker.

### 4.4 Compass roles, by country (the new screen)
One row per Compass anchor role (`RL-nnn`, title, cluster, route), taken from the linked packets. Roles are matched by `ref` across countries.

1. **Match each role to job titles in the org file.** Suggest exact and close title matches; I confirm or change them. Store the match per analysis (role ref → list of job titles) and audit it.
2. **One column per linked country**, showing:
   - **Holders**: how many people hold a matched job title in that country.
   - **Compass status**: from that country's packet. Show **"To confirm"** when `status_confirmed` is false.
   - **Reason**: Required, Chosen, Inherited or Not known yet, plus one line of text, an optional "compared with" country, and a grade (the assessor's choice).
3. **Flags, in words.** This app never changes a Compass status; the status is the Compass assessor's judgement. Raise these flags instead:
   - "The Compass says this role exists; the org file shows nobody in it."
   - "The Compass says absent; the org file shows *n* people."
   - "Still to confirm in the Compass; the org file shows *n* people." This is evidence for the person confirming.
4. **A role with nobody in it must never be silent.** If it has no reason yet, the cell reads "Why is it missing? Not recorded."
5. Job titles in the file that match no Compass role are counted in one line, not listed.

### 4.5 One findings file per country
On Export, **"Findings for the Compass"** asks which link to export: each linked country, or the whole organisation.

**A country file** (`<key>_compass_return.json`, plus the readable text version as today) contains:
- Header: `format`, `format_version "1.0"`, `generated_at`, `source_app "org-modeling"`, `engagement_key` (that country's key) and **`country`**.
- `structural_baseline` findings computed **on that country's people only**, with the existing refs (`baseline.layers`, `baseline.spans`, `baseline.health`). Give each one `topic: "role_presence"`. The title names the country, e.g. "Layers in the reporting chain (Belmar)".
- One **`role_reason`** finding per Compass role that **has a reason recorded for this country, or has nobody in it in this country**:

| Field | Value |
|---|---|
| `ref` | the Compass role ref, as received (`RL-011`) |
| `kind` | `role_reason` |
| `topic` | `role_reason` |
| `title` | "Why {title} {exists \| is thin \| is absent} in {Country}". The verb comes from the Compass status when confirmed; otherwise from holders (0 → is absent, otherwise exists). |
| `detail` | the reason text; "Not recorded yet." if none |
| `reason_class` | `required`, `chosen`, `inherited` or `unknown`. A missing role with no reason is exported as `unknown`. |
| `compared_with` | the "compared with" country, if I gave one; otherwise leave the field out |
| `figure` | "0 people", "1 person", "3 people" |
| `grade` | my grade. If I have not set one: `indicated` when a reason is recorded, `hypothesis` when not. |
| `relates_to` | `[role ref, its cluster ref, cluster ref + ".People"]`, e.g. `["RL-011", "CAP-04", "CAP-04.People"]` |
| `source_note` | "Reason recorded by the designer; head-count from the uploaded org file." |

- No person's name, and no Employee ID, ever appears in the file. The existing name check runs on it.

**The whole-organisation file** is what exists today: work activities, hypotheses and option scores, unchanged. Its header `country` is `""`. Those findings are about the organisation, not one country, so they are **not** repeated in country files.

## 5. Rules that must hold
- This app never changes a Compass ID, status or score. It reads them, shows them and flags mismatches.
- A role "to confirm" is never counted as existing or as absent in this app's own summaries. It is "to confirm".
- Reasons, matches and grades are mine. AI may *suggest* a job-title match (optional, behind the existing AI setting, never sending names), but it never sets a reason.
- The app still works on its own, with no packet and no Country column.

## 6. Acceptance tests (use the attached samples)
With `meridian_org_by_country.csv` (84 fictional people) and the three packets:

1. Upload: three countries are found (Arden 30, Belmar 26, Caldera 28 people) with no level-mismatch warnings. Layers by country: **Arden 5, Belmar 5, Caldera 6**. Caldera's extra layer is its operations director.
2. Import `arden_compass_handoff.json`, `belmar_compass_handoff.json` and `caldera_compass_handoff.json`: each links to its country by name, and criteria and strategy come from the first. Importing Belmar's packet a second time shows "will be replaced".
3. Compass roles screen, after confirming title matches:

   | Role | Arden | Belmar | Caldera |
   |---|---|---|---|
   | `RL-011` Head of Pricing | 0 holders, absent | 1, exists | 0, absent |
   | `RL-004` Hub Duty Controller | 1, thin | 0, absent | 2, exists |
   | `RL-018` Organisation Design & Change Lead | 0, absent | 0, absent | 1, **To confirm**, flagged "Still to confirm in the Compass; the org file shows 1 person" |

4. Record for Belmar `RL-011`: Chosen, compared with Arden, "Created in 2023 when Belmar won its two largest renewal contracts; Arden leaves pricing to finance." Export Belmar's file. It must have **the same shape** as `belmar_return_org_modeling.json`: same header fields, `country "Belmar"`, `engagement_key "MERIDIANBE"`, a `baseline.layers` finding with figure "5 layers", and `role_reason` findings for `RL-011` (with your reason) and for every role nobody holds in Belmar. Seven roles have nobody in Belmar: `RL-004`, `RL-007`, `RL-008`, `RL-010`, `RL-012`, `RL-017` and `RL-018`. The sample shows only three role findings; yours has all of them, with `unknown` where no reason is recorded. Figures come from your own calculation; check them against the table above.
5. A broken packet (wrong `format`), a packet whose country is not in the file, and an org file without a Country column each behave as stated above, with plain messages.
6. The exported file contains no names and no Employee IDs.
7. All existing tests still pass. No real AI calls in tests.

## 7. How to build it
- Small increments: Country column and metrics; By-country view; the engagement link per country (with migration); Compass roles screen; per-country export. Test and commit each one, and update the project state after each.
- Extend this app's existing data contract and tests; do not add a second way of doing the same thing.
- Add the attached samples to the test fixtures, so the acceptance tests run on every check.
- End with the full check suite green and a plain-language summary: what works, what you did not do, and why.

## 8. Out of scope
- Changing the shared format or the ID scheme (if something seems wrong, tell me; do not change it here).
- Per-country AI analysis of work activities.
- Comparing processes between countries (that is Process Map Studio).
- Any change that makes Capability Compass a required dependency.

## 9. What to attach

All files are fictional. They are in the Capability Compass repository **`Kaizen74/Org_Capability_Diagnostic`**, branch **`claude/org-diagnostic-system-app-syt54v`**, folder **`docs/samples/countries/`**. If you can read that repository, copy them from there into this repository's test fixtures. If you cannot, ask me to attach them.

| File | Needed? | What it is for |
|---|---|---|
| `meridian_org_by_country.csv` | **Required** | An org file with a Country column: three countries, 84 people, chains that cross countries |
| `arden_compass_handoff.json`, `belmar_compass_handoff.json`, `caldera_compass_handoff.json` | **Required** | One hand-off packet per country, same frame, own keys; Caldera has two roles "to confirm" |
| `belmar_return_org_modeling.json` | **Required** | The shape the Compass expects back for Belmar (the Compass's own tests import this exact file) |
| `docs/HANDOFF_FORMAT.md` (repository root `docs/`) | Optional | The full shared format, if you need more than this document |
