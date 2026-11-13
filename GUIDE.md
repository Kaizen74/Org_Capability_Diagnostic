# Capability Compass — Plain-Language Guide

Everything here is written for using the app, not for changing its code.

## Opening it

Download the repository as a ZIP (green **Code** button → **Download ZIP**), unzip it, open the `app` folder, and double-click **`index.html`**. It opens in your browser. That's the whole install.

Your work saves automatically in that browser. Use **Export** in the top bar for a backup file you can keep or move to another computer.

## Where this app sits

The Compass is the first of four apps used to design an operating model and operating system. The work runs in six stages:

| Stage | What is decided | Where |
|---|---|---|
| **0 Frame** | What business are we building, and how will we judge the design? | **This app** — Charter |
| **1 Focus** | Where must the model change, and where to pilot? | **This app**, with Org Modeling |
| **2 Find** | How does work really run? | Process Map Studio |
| **3 Dial** | What to standardise, how much should AI do? | Process Map Studio and the Workbench — then findings come back here, under **Current State** |
| **4 Design** | Which model and system do we install? | Org Modeling and the Workbench |
| **5 Deliver** | Is it lifting capability, cycle by cycle? | **This app** — Scoreboard |

Every workspace opens on the **Journey**, which shows these six stages, what is done, and one **Next step** button. If you are ever unsure what to do, go there.

## The screens, in the order you use them

| Screen | The question it answers |
|---|---|
| **Journey** | Where am I, and what is next? |
| **Charter** (Stage 0) | What are we designing, by what rules, and who decides? |
| **Value Chain** | Where is the money — and are these the right clusters for it? |
| **Roles** | Who is accountable, and which knowledge walks out the door? |
| **Evidence** | What do our own documents say? |
| **Signals** | What is happening outside that should change our view? |
| **Signal Matrix** | Where do we stand, across every cluster and lens? |
| **Priority Board** | What do we do first, and where is the money at risk? |
| **Trajectory** | Where is this heading, and what would prove me wrong? |
| **Hand-off** | Is Stage 1 complete, where do we pilot, and what does the next app need? |
| **Current State** | How do the countries differ, what did the other apps find, and what do we tell EXCO? |
| **Scoreboard** (Stage 5) | What moved since last cycle, and were our calls right? |
| **Method** | How does this fit together, and where should I not over-claim? |

## Workspaces

A workspace is one complete diagnostic. Use the **Workspace** box at the top to switch, to start a new one, or to rename or delete the current one. Keep one for the whole group and one per segment or client: they never mix. Starting a new diagnostic, loading the demo, or importing a backup always makes a **new** workspace, so nothing you start can overwrite what is on screen.

When you create one you choose what its rows are: **capability clusters** (the industry preset's list, for an enterprise view) or **value streams** (you type the names, for one business segment end to end).

## Current state across countries

Use this before any design work, to answer four questions: which roles exist, who really decides, how work really runs, and how all of that differs from one country to the next.

**1. One workspace per country, built from one frame.**
Finish the frame in one country first: the clusters, the money levers and the anchor roles. Then open the **Workspace** box, choose *Rename or delete this one…*, say which country this workspace covers, and use **Add another country**. The new workspace has the same clusters, levers, roles, charter and IDs, with every score, piece of evidence, weight and amount blank. Roles carried over show as **To confirm** until someone in that country says whether the role exists, is thin, or is absent.

Someone in the country can do the scoring: open that country, press **Export**, send them the file, and **Import** what they send back.

**2. Compare (Current State, part 1).**
- The **map** shows every capability in every country on the same scale. "Not scored" means nobody has assessed it yet; it is never counted as weak, and it is left out of every gap.
- **Why each difference exists.** For each cell scored differently, choose one of three reasons and write the reason in a line:
  - **Required** (regulation, a customer contract, the physical site) → leave local.
  - **Chosen** (a deliberate local decision someone can explain) → decide whether to keep or align.
  - **Inherited** (history, an acquisition, habit; nobody decided it) → harmonise.
- **Which roles exist where** lines the roles up by ID.

Different people score different countries, and one may be stricter than another. Before treating a gap as real, have the country leads look at each other's evidence for the widest ones.

**3. Findings from the other apps (part 2).**
Process Map Studio, Org Modeling and the Workbench can each export a small file called *Findings for the Compass*. Open the country the file describes, then **Import a findings file**. Importing never changes a score. Each finding keeps the ID and grade it was given in the app that found it, and **Cite on …** adds it as evidence to the cell it relates to. You then open the cell and decide whether the score should move.

If a file belongs to a different country, the app flags it rather than mixing it in. Where the other app says **why** something is so (Required, Chosen, Inherited) and **against which country**, the finding shows it in the same words as the Compare tab.

The changes these two apps need are written as PRDs to paste into them: `docs/sibling_prds/PRD_org_modeling_countries.md` and `docs/sibling_prds/PRD_process_map_studio_countries.md`. Each lists the sample files to attach, all in `docs/samples/countries/`.

**4. The EXCO readout (part 3).**
Six pages, in the order an executive asks the questions:

| Page | What it shows | Where it comes from |
|---|---|---|
| 1 Where we stand | Your one-line verdict, then each country on one scale | Scores, and money at risk where estimated |
| 2 Where the countries differ | The map, and how many differences are required, chosen or inherited | Compare |
| 3 Who really decides | Decisions made by a different role from the one on paper | Process Map Studio findings |
| 4 Which roles exist where, and why | Anchor roles by country, and the reasons | Roles, plus Org Modeling and Workbench findings |
| 5 How work really runs | Where practice departs from the documents, and the cost | Process Map Studio findings |
| 6 What we ask you to decide | Harmonise, decide, or leave local; where to pilot; your ask | Your classifications |

The only words you write are the **verdict** and the **ask**. Everything else is counted or quoted. Above the pages the app lists what would weaken the paper (a country not fully scored, a material difference not yet classed, no findings for a country). **Print or save as PDF** gives six pages.

Money at risk is shown per country and is added up only when every country uses the same currency and unit.

To see all of this filled in, open the demo, go to **Current State**, and press **Show me with the demo's three countries**. The countries (Arden, Belmar, Caldera) and everything in them are fictional.

## A first real diagnostic, step by step

1. **Charter.** Write the five-sentence thesis, three to six design principles (each with what would prove it wrong), and name the sponsor and an owner for each stage decision. The reference model, design criteria, leapfrog gate and evidence rules come pre-filled: open each, adjust, and check the criteria weights still total 100. Then **Lock the charter**. If something has to change later, **Amend** asks for a reason and logs it.
2. **Value Chain.** Correct the lever list, give each a rough weight, and act on the **Cluster calibration** panel. If you have figures, put an estimated amount at stake on each lever: the app then shows money at risk in currency, marked as an estimate until you tick **validated**.
3. **Evidence.** Upload your documents and click **Analyze & synthesize evidence**.
4. **Roles.** Import the role inventory, or accept the roles the evidence analysis proposes.
5. **Signal Matrix.** Score every cell. For each one cite at least one source and choose an **evidence grade** (see below).
6. **Save version.** This freezes the baseline.
7. **Hand-off.** Work down the Stage 1 checklist. In the pilot shortlist give every row a decision: *Pilot now* (name the value stream and its KPI), *Later* or *Not this cycle* (say why). Then copy the brief for the next app.

## Handing off to the other three apps

On the **Hand-off** screen each of the other apps has a card with **Copy the brief**. The brief is plain text written to be pasted into that app:

- **Org Modeling** gets your strategy text and the design criteria, with weights.
- **Process Map Studio** gets one engagement per pilot: its name, process KPI, roles in scope and interview prompts.
- **The Workbench** gets the roles to analyse first.

**Download the full packet** saves everything as one file. Each of the other three apps can import that file directly; the briefs say the same thing in words. The packet never contains your API key or the text of your uploaded documents.

Everything carries an ID that stays the same in every app: `CAP-03` is a cluster, `VS-01` a value stream, `LV-02` a lever, `RL-014` a role. Outside the workspace, put the engagement key in front: `MERIDIAN:CAP-03`.

## When findings come back (after Stage 3)

Open **Current State → Findings from the other apps** and import the file the other app exported. Use **Cite on …** to attach a finding to the cell it relates to, then open the cell, re-score if the evidence warrants, set the grade, and **Save version**. The **Scoreboard** then shows the trend across every saved version, and checks each of last cycle's direction calls: *Right*, *Wrong*, *Not yet* or *No call made*.

(If an app has given you a document rather than a findings file, upload it in **Evidence** as before and type the finding's ID in the small **ID** box on the cell.)

## Ideas worth understanding

**Evidence grade.** Each score and each signal can be marked *Confirmed* (you would defend it to a sceptic), *Indicated* (a reasonable reading of limited evidence) or *Hypothesis* (not yet tested; never drives a decision alone). It is your judgement. The app shows how many sources and indicators the score rests on, but it does not work the grade out for you.

**Value exposure.** A weak capability that carries 30% of your cost base is more urgent than an equally weak one carrying 2%. The board ranks on economic weight × capability gap and always tells you which basis it used. The Signal Matrix and Trajectory views follow the same order, so all three tell one story.

**Calibration before scoring.** The money map's first job is not ranking — it is checking that the *rows themselves* are right. A lever with no cluster is money nobody owns; a cluster with no lever is usually a preset default that doesn't fit you; one cluster carrying two big levers is usually two capabilities sharing a score. The app checks all three automatically and never changes your cluster set without a click.

**The two role axes.** *Criticality* is how much rides on the seat and how hard it is to fill — the fix is a succession bench. *Tacit-knowledge intensity* is how hard it is to rebuild internally even if you can hire — the fix is knowledge capture, overlap and apprenticeship. Scoring both separately is what surfaces the quiet expert whose departure degrades safety or continuity before anyone notices. Roles route into four boxes: Critical, Dual-critical, Specialist/key-person, Standard.

Three criteria on each axis, and each one explains itself: click a column heading in the role register, or the **ⓘ Scoring guide** button, for the question it asks, what it does *not* cover, and written 1 / 3 / 5 anchors. Read the routing, not the decimals — only which side of 3.5 a score lands on changes what you do.

## Before you present it

Open **Method** and read the right-hand column. It lists what this method does *not* do — single-rater scoring, one-snapshot momentum, estimated weights shown precisely — each with a one-line mitigation. Saying those out loud in the first two minutes of a board conversation is what stops someone else saying them in the last two.

Each of the two judgement-heavy sections also carries a **“How to fill this in”** panel at the top — click it open the first time. Value Chain tells you how many levers is right and how rough the weights should be; Roles gives you 1–5 anchors so two people would score alike.

## Using the AI features

Open **Settings → External intelligence** and paste an Anthropic API key ([console.anthropic.com](https://console.anthropic.com) → API Keys). Click **Test connection**, then **Save**.

No key yet? Type **`mock`** as the key. Every AI feature then runs on realistic simulated data — free, offline, and safe to explore.

Your key is stored separately from your diagnostic, so it can never end up in an Export file, and you can remove it anytime.

## If something goes wrong

- **A view looks empty** — check you unzipped the whole folder; `index.html` needs its `css` and `js` neighbours.
- **"Re-attach file to analyse"** — normal. PDF and image contents are never saved to disk for privacy, so after a restart you re-add the file.
- **Data disappeared** — data lives per browser. Restore from your last Export via the **Import** button.
- **Something looks broken after an update** — in a terminal, run `./run_checks.sh` in the project folder. It tells you plainly whether the app is healthy.
