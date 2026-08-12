# Capability Compass — Plain-Language Guide

Everything here is written for using the app, not for changing its code.

## Opening it

Download the repository as a ZIP (green **Code** button → **Download ZIP**), unzip it, open the `app` folder, and double-click **`index.html`**. It opens in your browser. That's the whole install.

Your work saves automatically in that browser. Use **Export** in the top bar for a backup file you can keep or move to another computer.

## The eight views, and when to use each

**Diagnose** — reading the organisation:

| View | The question it answers |
|---|---|
| **Signal Matrix** | Where do we stand, across every cluster and lens? |
| **Priority Board** | What do we do first, and where is the money at risk? |
| **Trajectory** | Where is this heading, and what would prove me wrong? |
| **Delta** | What changed since the last time we looked? |

**Ground it** — the evidence the reads stand on:

| View | The question it answers |
|---|---|
| **Value Chain** | Where does our money actually come from and go to? |
| **Roles** | Who is accountable, and which knowledge walks out the door? |
| **Evidence** | What do our own documents say? |
| **Signals** | What is happening outside that should change our view? |

## The recommended order for a first real diagnostic

1. **Value Chain** — list the handful of P&L levers that genuinely move your business, give each a rough weight, and map it to the cluster that owns it. This makes the Priority Board rank by money at risk instead of weakness alone.
2. **Evidence** — download the *Evidence checklist* template, gather those documents, and upload them. Click **Analyze & synthesize evidence**.
3. **Roles** — download the *Role inventory* template, fill in your real job titles, and import it. Or let the evidence analysis extract roles from your org chart and add them with one click.
4. **Signal Matrix** — now score the cells. Every rating should cite evidence; uncited ones are flagged.
5. **Save version** — this becomes the baseline that makes trajectory and delta possible.
6. **Signals** — scan the outside world and apply what matters.

## Two ideas worth understanding

**Value exposure.** A weak capability that carries 30% of your cost base is more urgent than an equally weak one carrying 2%. The board ranks on economic weight × capability gap and always tells you which basis it used.

**The two role axes.** *Criticality* is how hard a role is to hire — the fix is a succession bench. *Tacit-knowledge intensity* is how hard it is to rebuild internally even if you can hire — the fix is knowledge capture, overlap and apprenticeship. Scoring both separately is what surfaces the quiet expert whose departure degrades safety or continuity before anyone notices. Roles route into four boxes: Critical, Dual-critical, Specialist/key-person, Standard.

## Using the AI features

Open **Settings → External intelligence** and paste an Anthropic API key ([console.anthropic.com](https://console.anthropic.com) → API Keys). Click **Test connection**, then **Save**.

No key yet? Type **`mock`** as the key. Every AI feature then runs on realistic simulated data — free, offline, and safe to explore.

Your key is stored separately from your diagnostic, so it can never end up in an Export file, and you can remove it anytime.

## If something goes wrong

- **A view looks empty** — check you unzipped the whole folder; `index.html` needs its `css` and `js` neighbours.
- **"Re-attach file to analyse"** — normal. PDF and image contents are never saved to disk for privacy, so after a restart you re-add the file.
- **Data disappeared** — data lives per browser. Restore from your last Export via the **Import** button.
- **Something looks broken after an update** — in a terminal, run `./run_checks.sh` in the project folder. It tells you plainly whether the app is healthy.
