/* ============================================================
   Capability Compass — Method Blueprint

   One picture of how data becomes a decision in this app, plus an
   honest self-assessment against current practice.

   Two rules govern this file:
   1. It is DESCRIPTIVE, not decorative. Every box corresponds to real
      code, and the live counters read the actual state — so a reader
      can check the claim against their own diagnostic.
   2. The watch-outs are shipped in the product, not buried in a doc.
      A methodology that only advertises its strengths is marketing.
   ============================================================ */

/* The stages a numbered assessment point may be anchored to. Every one
   of these is a box (or a band) that actually appears on the diagram —
   the contract test enforces both directions. */
const BP_STAGES = ["Value Chain", "Roles", "Evidence", "Ground", "Cell", "Trajectory", "Engine", "Reads", "AI"];

/* ---- Assessment: what holds up, and what to be careful about ----
   Each entry gets a numbered badge on the diagram so the claim is
   anchored to the exact stage it applies to. */
const BP_STRENGTHS = [
  {
    n: 1, at: "Value Chain",
    title: "Economics precede the scoring",
    body: "Most capability models score a framework's categories and then argue about priorities. Here the money map is built first and then <em>tests the categories themselves</em> — ownership, materiality, separability, diagnosability. Prioritisation is value exposure (weight × gap), not weakness alone."
  },
  {
    n: 2, at: "Roles",
    title: "Two independent risks, two registers",
    body: "Scarcity (hard to hire → succession bench) and tacit-knowledge intensity (hard to rebuild internally → capture, overlap, apprenticeship) are scored on separate axes. A single seniority list hides the quiet expert whose exit degrades safety or continuity."
  },
  {
    n: 3, at: "Evidence",
    title: "Extraction discipline, not summarisation",
    body: "Figures verbatim, <em>stated ≠ demonstrated</em> (announcements are leading evidence only), between two levels take the lower, and every finding names a source. Documents are parsed on this machine; nothing is uploaded to analyse it."
  },
  {
    n: 4, at: "Cell",
    title: "Grounding guardrail is enforced, not advisory",
    body: "A rating with no named source is badged <strong>Unsupported</strong> in every view and drags the Evidence Coverage KPI down. You cannot quietly ship an ungrounded score."
  },
  {
    n: 5, at: "Trajectory",
    title: "Unknown is a permitted answer",
    body: "A cell with no history and no leading indicator renders <strong>? Unknown</strong> — no arrow, no projection. When more than a quarter of cells are unknown, the app names that as the finding. Fabricated direction is the standard failure mode of predictive dashboards and this one refuses it."
  },
  {
    n: 6, at: "Trajectory",
    title: "Every call carries a falsifier",
    body: "Watch signals are thresholds with re-score triggers (“adoption &lt;60% at 90 days → flip direction down”). A forecast that cannot be proved wrong is a hope, and the rubric treats it as one."
  },
  {
    n: 7, at: "Engine",
    title: "Transparent arithmetic, no black box",
    body: "Momentum is 50% version-over-version movement + 50% mean leading signal, thresholds ±0.25, confidence assigned mechanically from evidence present. Every number on screen can be explained to a board in one sentence."
  },
  {
    n: 8, at: "Reads",
    title: "One ordering, three reads",
    body: "Signal Matrix, Priority Board and Trajectory rank on the same basis and each states which basis it used. Three views sorting three ways is three competing priority stories."
  },
  {
    n: 9, at: "AI",
    title: "The model proposes; the human decides",
    body: "No AI output ever changes a maturity level, and no calibration proposal changes the cluster set, without an explicit click. Advisory-only by design — which is also what keeps it outside automated-decision territory under emerging AI-governance rules."
  }
];

const BP_WATCHOUTS = [
  {
    n: "A", at: "Cell",
    title: "Single-rater scoring — the largest methodological limit",
    body: "Every level is one person's judgement. There is no second rater, no inter-rater agreement statistic, and no confidence interval on the level itself. <strong>Mitigation:</strong> have a second assessor independently score the 5–6 cells that carry the most economic weight, and treat any two-level disagreement as an evidence gap rather than averaging it."
  },
  {
    n: "B", at: "Trajectory",
    title: "Momentum rests on a single prior snapshot",
    body: "History is the latest saved version only, so there is no trend line and no way to separate movement from noise. A level you revised for a scoring reason also reads as movement. <strong>Mitigation:</strong> save a version at every recalibration and treat the first two cycles' momentum as directional only."
  },
  {
    n: "C", at: "Trajectory",
    title: "Leading indicators are self-reported categories",
    body: "Improving / stable / declining is coarse, and two indicators disagreeing averages to zero — indistinguishable from genuinely flat. <strong>Mitigation:</strong> name indicators that already have a number behind them (funnel count, adoption %, reporting rate) and put the number in the watch signal."
  },
  {
    n: "D", at: "Engine",
    title: "No forecast-accuracy scoring yet",
    body: "The rubric asks you to compare last cycle's directional calls against what actually happened; the Delta view compares <em>levels</em>, not calls. <strong>Mitigation:</strong> at each recalibration, read the previous version's arrows before you re-score, and replace indicators that were wrong twice."
  },
  {
    n: "E", at: "Value Chain",
    title: "Economic weights are estimates displayed precisely",
    body: "Exposure renders as a clean number from a rough input, and weights need not sum to 100. <strong>Mitigation:</strong> use weights to separate 30% from 5%, never 12% from 14%, and re-check the top three against the actual P&L once a year."
  },
  {
    n: "F", at: "Roles",
    title: "Ten subjective 1–5 ratings become one decimal",
    body: "A Criticality Index of 4.6 looks more precise than its inputs are. <strong>Mitigation:</strong> score anchors, not feelings — 5 = “we have lost a deal or an approval over this”, 1 = “replaceable within a month”. Only the side of the 3.5 threshold matters."
  },
  {
    n: "G", at: "Cell",
    title: "Culture is one number per cluster",
    body: "Engagement is carried as a single score, so hotspots by region, level or tenure are invisible here. <strong>Mitigation:</strong> score Culture at the weakest segment you can evidence, and say which segment in the rationale."
  },
  {
    n: "H", at: "AI",
    title: "Source quality is the model's own claim",
    body: "The harvest prompt demands primary sources and a 1–5 quality rating, but the app cannot independently verify either. <strong>Mitigation:</strong> open the cited source before a signal changes anything that matters, and treat unsourced calibration proposals as prompts to think, not conclusions."
  },
  {
    n: "I", at: "Ground",
    title: "Roles, not skills",
    body: "The unit of analysis stops at the job title. Skills-based workforce planning — the direction of travel in workforce analytics — needs the layer beneath. <strong>Mitigation:</strong> for the dual-critical roles only, list the three skills that actually make the seat hard to fill in the role note."
  }
];

/* ---- SVG geometry ------------------------------------------------ */
const BP_W = 1280;
const BP_L = 152;            // content left edge
const BP_R = 1152;           // content right edge
const BP_CW = BP_R - BP_L;   // 1000

function bpBoxes(n, gap) {
  const w = (BP_CW - gap * (n - 1)) / n;
  return Array.from({ length: n }, (_, i) => ({ x: BP_L + i * (w + gap), w }));
}

function bpEsc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* Wrap a line of text into tspans — SVG has no text flow. */
function bpLines(text, x, y, lh, cls) {
  return text.map((t, i) =>
    `<text x="${x}" y="${y + i * lh}" class="${cls}">${bpEsc(t)}</text>`).join("");
}

function bpBadge(x, y, label, kind) {
  return `<g class="bp-badge bp-badge-${kind}">
    <circle cx="${x}" cy="${y}" r="9"></circle>
    <text x="${x}" y="${y + 3.4}" text-anchor="middle">${bpEsc(label)}</text>
  </g>`;
}

function bpBox(o) {
  const { x, y, w, h, title, lines, kind, badges, col2, lh } = o;
  // Badges read left-to-right in array order, so a strength listed first
  // appears first rather than being flipped by right-edge stacking.
  const bx = (badges || []).slice().reverse();
  const step = lh || 15;
  return `<g class="bp-box bp-${kind || "plain"}">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10"></rect>
    <text x="${x + 14}" y="${y + 24}" class="bp-t">${bpEsc(title)}</text>
    ${bpLines(lines, x + 14, y + 43, step, "bp-s")}
    ${col2 ? bpLines(col2.lines, col2.x, y + 43, step, "bp-s") : ""}
    ${bx.map((b, i) => bpBadge(x + w - 16 - i * 22, y + 17, b.n, b.kind)).join("")}
  </g>`;
}

function bpBandLabel(y, n, text) {
  return `<g class="bp-band">
    <text x="20" y="${y + 18}" class="bp-band-n">${bpEsc(n)}</text>
    <text x="20" y="${y + 38}" class="bp-band-t">${bpEsc(text)}</text>
  </g>`;
}

function bpArrowDown(x, y1, y2, label) {
  return `<g class="bp-flow">
    <line x1="${x}" y1="${y1}" x2="${x}" y2="${y2 - 8}" marker-end="url(#bp-arrow)"></line>
    ${label ? `<text x="${x + 9}" y="${(y1 + y2) / 2 + 4}" class="bp-flow-lbl">${bpEsc(label)}</text>` : ""}
  </g>`;
}

/* A return path down the right-hand lane and back into an earlier band. */
function bpLoop(fromY, toY, label, lane) {
  const x = lane;
  return `<g class="bp-loop">
    <path d="M ${BP_R} ${fromY} H ${x} V ${toY} H ${BP_R + 8}" marker-end="url(#bp-arrow-amber)"></path>
    <text x="${x + 8}" y="${(fromY + toY) / 2}" class="bp-loop-lbl" transform="rotate(90 ${x + 8} ${(fromY + toY) / 2})" text-anchor="middle">${bpEsc(label)}</text>
  </g>`;
}

/* ---- Live counters so the diagram describes THIS diagnostic ------- */
function bpStats(s) {
  const k = enterpriseKpis(s);
  const cov = valueChainCoverage(s);
  const roles = s.clusters.reduce((a, c) => a + (c.roles || []).length, 0);
  const docs = (s.documents || []).length;
  const cal = calibrationSummary(s);
  return {
    clusters: s.clusters.length, lenses: s.lenses.length, cells: k.cells,
    grounded: k.groundedPct, unknownPct: k.unknownPct, weak: k.weak,
    levers: cov.levers, weighted: cov.weighted, mapped: cov.pct,
    roles, docs, versions: (s.versions || []).length,
    briefings: (s.briefings || []).length,
    calFindings: cal.findings.length, calFit: cal.fit
  };
}

function bpDiagram(st) {
  const b1 = bpBoxes(4, 16), b2 = bpBoxes(3, 16), b4 = bpBoxes(5, 14), b5 = bpBoxes(4, 16);
  const Y1 = 46, H1 = 88;
  const Y2 = 190, H2 = 138;
  const Y3 = 380, H3 = 104;
  const Y4 = 536, H4 = 126;
  const Y5 = 714, H5 = 96;
  const mid = (BP_L + BP_R) / 2;

  return `<svg viewBox="0 0 ${BP_W} 872" class="bp-svg" role="img"
      aria-label="Data and analysis workflow: inputs feed the grounding layer, which sets the cluster set and the evidence behind every cell; cells feed a deterministic engine; the engine feeds four reads; saved versions loop back as the momentum baseline.">
    <defs>
      <marker id="bp-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" class="bp-arrowhead"></path>
      </marker>
      <marker id="bp-arrow-amber" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" class="bp-arrowhead-amber"></path>
      </marker>
    </defs>

    ${bpBandLabel(Y1, "01", "INPUTS")}
    ${bpBox({ x: b1[0].x, y: Y1, w: b1[0].w, h: H1, kind: "in", title: "Industry preset", lines: ["Clusters · 4 lenses · rubric text", "Starter P&L levers at 0% weight", "Watch keywords"] })}
    ${bpBox({ x: b1[1].x, y: Y1, w: b1[1].w, h: H1, kind: "in", title: "Your documents", lines: ["PDF · Word · PowerPoint · Excel", "text · images · pasted extracts", st.docs + " uploaded"] })}
    ${bpBox({ x: b1[2].x, y: Y1, w: b1[2].w, h: H1, kind: "in", title: "Your judgement", lines: ["Levels · rationale · interventions", "Role scores · economic weights", "The accountable input"] })}
    ${bpBox({ x: b1[3].x, y: Y1, w: b1[3].w, h: H1, kind: "in", title: "Outside world", lines: ["Claude + web search", "Harvest discipline enforced", st.briefings + " briefing" + (st.briefings === 1 ? "" : "s") + " so far"], badges: [{ n: 9, kind: "good" }, { n: "H", kind: "warn" }] })}

    ${bpArrowDown(mid, Y1 + H1, Y2)}

    ${bpBandLabel(Y2, "02", "GROUND IT")}
    ${bpBox({
      x: b2[0].x, y: Y2, w: b2[0].w, h: H2, kind: "ground", title: "Value Chain — follow the money",
      lines: ["Demand → platform → billing →", "cost → value created",
        "Each P&L lever: weight, capability,", "owning cluster",
        st.levers + " levers · " + st.weighted + " weighted · " + st.mapped + "% owned",
        "▼ 4 calibration tests → tunes the rows"],
      badges: [{ n: 1, kind: "good" }, { n: "E", kind: "warn" }]
    })}
    ${bpBox({
      x: b2[1].x, y: Y2, w: b2[1].w, h: H2, kind: "ground", title: "Roles — who is accountable",
      lines: ["Axis A Criticality (weighted 1–5)", "Axis B Tacit-knowledge (mean 1–5)",
        "→ Critical · Dual · Specialist · Standard", "→ two registers, not one",
        st.roles + " roles scored"],
      badges: [{ n: 2, kind: "good" }, { n: "F", kind: "warn" }, { n: "I", kind: "warn" }]
    })}
    ${bpBox({
      x: b2[2].x, y: Y2, w: b2[2].w, h: H2, kind: "ground", title: "Evidence — your own documents",
      lines: ["Parsed on this machine (offline)", "Claude extraction protocol:",
        "verbatim · stated ≠ demonstrated ·", "take the lower level · falsifier",
        "→ findings + roles, applied by you"],
      badges: [{ n: 3, kind: "good" }]
    })}

    ${bpArrowDown(mid, Y2 + H2, Y3, "sets the rows, the owners and the evidence")}

    ${bpBandLabel(Y3, "03", "SCORE")}
    ${bpBox({
      x: BP_L, y: Y3, w: BP_CW, h: H3, kind: "score", lh: 17,
      title: "The cell — one cluster × one lens (" + st.clusters + " × " + st.lenses + " = " + st.cells + " cells)",
      lines: [
        "level 1–4 · status · rationale with real numbers · intervention · items",
        "evidence[] — named sources; none ⇒ Unsupported badge",
        "watch[] — falsifiable thresholds with re-score triggers"
      ],
      col2: {
        x: BP_L + 540,
        lines: [
          st.grounded + "% of ratings grounded · " + st.weak + " cells flagged for action",
          "leading[] — forward signals: improving / stable / declining",
          "history[] — every level change with a mandatory rationale"
        ]
      },
      badges: [{ n: 4, kind: "good" }, { n: "A", kind: "warn" }, { n: "G", kind: "warn" }]
    })}

    ${bpArrowDown(mid, Y3 + H3, Y4)}

    ${bpBandLabel(Y4, "04", "ENGINE")}
    ${bpBox({ x: b4[0].x, y: Y4, w: b4[0].w, h: H4, kind: "engine", title: "Trajectory", lines: ["m = 50% Δlevel", "+ 50% mean signal", "±0.25 thresholds", "no evidence ⇒", "? Unknown", st.unknownPct + "% unknown"], badges: [{ n: 5, kind: "good" }, { n: "B", kind: "warn" }, { n: "C", kind: "warn" }] })}
    ${bpBox({ x: b4[1].x, y: Y4, w: b4[1].w, h: H4, kind: "engine", title: "Classification", lines: ["weak & declining", "erosion risk", "stalled · breakout", "steady", "compounding", "unassessed"], badges: [{ n: 6, kind: "good" }] })}
    ${bpBox({ x: b4[2].x, y: Y4, w: b4[2].w, h: H4, kind: "engine", title: "Constraint & patterns", lines: ["binding constraint =", "lowest cell NOT", "already improving", "cross-lens patterns:", "bench-starves-rollout,", "adoption red flag…"] })}
    ${bpBox({ x: b4[3].x, y: Y4, w: b4[3].w, h: H4, kind: "engine", title: "Value exposure", lines: ["economic weight", "× capability gap", "= money at risk", "orders all three", "reads"], badges: [{ n: 8, kind: "good" }] })}
    ${bpBox({ x: b4[4].x, y: Y4, w: b4[4].w, h: H4, kind: "engine", title: "Enterprise KPIs", lines: ["avg maturity", "cells needing action", "capability velocity", "trajectory alerts", "evidence coverage"], badges: [{ n: 7, kind: "good" }, { n: "D", kind: "warn" }] })}

    ${bpArrowDown(mid, Y4 + H4, Y5)}

    ${bpBandLabel(Y5, "05", "READS")}
    ${bpBox({ x: b5[0].x, y: Y5, w: b5[0].w, h: H5, kind: "read", title: "Signal Matrix", lines: ["Analytical read — level,", "direction, materiality", "and source per cell"] })}
    ${bpBox({ x: b5[1].x, y: Y5, w: b5[1].w, h: H5, kind: "read", title: "Priority Board", lines: ["Action read — ranked by", "money at risk, binding", "constraint named"] })}
    ${bpBox({ x: b5[2].x, y: Y5, w: b5[2].w, h: H5, kind: "read", title: "Trajectory", lines: ["Predictive read — alerts", "ordered by money,", "conditional outlooks"] })}
    ${bpBox({ x: b5[3].x, y: Y5, w: b5[3].w, h: H5, kind: "read", title: "Delta + export", lines: ["Change read vs a saved", "version · print briefing", st.versions + " snapshot" + (st.versions === 1 ? "" : "s") + " saved"] })}

    ${bpLoop(Y5 + H5 / 2, Y4 + 26, "saved version becomes the momentum baseline", 1216)}
    ${bpLoop(Y2 + H2 - 18, Y3 + 20, "calibration re-shapes the cluster rows", 1180)}
  </svg>`;
}

function viewBlueprint() {
  const st = bpStats(state);
  const list = (items, kind) => items.map(i => `
    <li class="bp-item">
      <span class="bp-chip bp-chip-${kind}">${bpEsc(i.n)}</span>
      <div><strong>${bpEsc(i.title)}</strong> <span class="bp-at">${bpEsc(i.at)}</span>
        <p>${i.body}</p></div>
    </li>`).join("");

  return `<div class="view-note"><strong>How data becomes a decision here — and where to be careful.</strong>
      Every box is real code, and the counters read your current diagnostic, so you can check any claim against your own data.
      Numbered badges mark <span class="bp-chip bp-chip-good">1</span> what holds up against current practice and
      <span class="bp-chip bp-chip-warn">A</span> the limits worth stating out loud before this reaches a board.</div>
    <section class="print-section">
      <div class="bp-wrap">${bpDiagram(st)}</div>
      <div class="bp-assess">
        <div class="bp-col">
          <h3 class="bp-col-h good">What holds up</h3>
          <ol class="bp-list">${list(BP_STRENGTHS, "good")}</ol>
        </div>
        <div class="bp-col">
          <h3 class="bp-col-h warn">Watch-outs — state these before the board does</h3>
          <ol class="bp-list">${list(BP_WATCHOUTS, "warn")}</ol>
        </div>
      </div>
      <div class="bp-verdict">
        <strong>Overall.</strong> The method is rigorous where rigour is cheap and honest where it is not: provenance,
        falsifiability, transparent arithmetic, economics before categories, and a hard rule that the model never scores
        anything. Its real limit is that it is a <em>single expert's structured judgement</em>, well-evidenced and well-governed —
        not a measurement instrument. Used that way it is defensible in a board room. Presented as measurement, the
        single-rater and single-baseline limits (<span class="bp-chip bp-chip-warn">A</span>
        <span class="bp-chip bp-chip-warn">B</span>) would be the first things a good challenger finds — so name them first.
      </div>
    </section>`;
}
