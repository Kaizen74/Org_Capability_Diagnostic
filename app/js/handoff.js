/* ============================================================
   Capability Compass — Workflow, stable IDs and hand-off

   The Compass is the FIRST of four apps in the leapfrog workflow
   (Compass → Org Modeling → Process Map Studio → AI Org Advisory
   Workbench). The other three were built separately and none of
   them knows this app exists, so the shared language is defined
   here and written down in docs/HANDOFF_FORMAT.md:

     1. one ID scheme, so a thing keeps its name in every app;
     2. one evidence grammar (Confirmed / Indicated / Hypothesis);
     3. one hand-off packet, shaped around the fields each of the
        other apps already accepts today.

   Pure functions only — no DOM, no storage — so the Node contract
   test exercises exactly what the browser runs.
   ============================================================ */

const HANDOFF_FORMAT = "compass-handoff";
const HANDOFF_VERSION = "1.0";

/* ---- 1. One ID scheme -------------------------------------------
   A prefix says what a thing is; the number is never reused inside a
   workspace, so an ID quoted in a board paper still means the same
   thing a year later. Prefixes owned by the OTHER apps are listed so
   nobody mints a clashing one here. */
const ID_PREFIXES = [
  { prefix: "CAP", what: "Capability cluster", owner: "Compass", example: "CAP-03" },
  { prefix: "VS", what: "Value stream (a cluster in a value-stream workspace, or a pilot)", owner: "Compass", example: "VS-01" },
  { prefix: "LV", what: "P&L lever", owner: "Compass", example: "LV-02" },
  { prefix: "RL", what: "Anchor role", owner: "Compass", example: "RL-014" },
  { prefix: "SG", what: "External signal", owner: "Compass", example: "SG-007" },
  { prefix: "P", what: "Operating-model design principle", owner: "Compass (Stage 0)", example: "P4" },
  { prefix: "C", what: "Operating-system reference component", owner: "Compass (Stage 0)", example: "C6" },
  { prefix: "DC", what: "Design criterion", owner: "Compass (Stage 0)", example: "DC-2" },
  { prefix: "LG", what: "Leapfrog gate test", owner: "Compass (Stage 0)", example: "LG-3" },
  { prefix: "DEC", what: "Decision-log entry", owner: "Compass (Stage 0)", example: "DEC-04" },
  { prefix: "S", what: "Process step", owner: "Process Map Studio", example: "S-05" },
  { prefix: "X", what: "Discrepancy (documented vs done)", owner: "Process Map Studio", example: "X5" },
  { prefix: "I", what: "Intent statement", owner: "Process Map Studio", example: "I1" },
  { prefix: "H", what: "Operating-model hypothesis", owner: "Org Modeling", example: "H3" },
  { prefix: "V", what: "Difference between two countries' maps of the same process", owner: "Process Map Studio", example: "V2" },
  { prefix: "T", what: "Task", owner: "Workbench", example: "T-014" }
];

/* ---- 2. One evidence grammar ------------------------------------
   Owner decision (2026-11-11): the grade is the assessor's JUDGEMENT,
   made with the evidence in view. Real evidence is fragmentary, so
   the app shows what the grade rests on but never derives it from a
   source count. The nearest terms in the other apps are listed so a
   reader can translate; they are a mapping, not an identity. */
const EVIDENCE_GRADES = [
  {
    key: "confirmed", label: "Confirmed", signal: "Metric",
    means: "You would defend this in front of a sceptic: independent sources agree, or a system record backs it.",
    orgModeling: "OBSERVABLE", processMap: "Observed (O)"
  },
  {
    key: "indicated", label: "Indicated", signal: "Trace",
    means: "A reasonable reading of limited evidence: one good source, or several of the same kind.",
    orgModeling: "PERCEPTUAL", processMap: "Inferred (I)"
  },
  {
    key: "hypothesis", label: "Hypothesis", signal: "Claim",
    means: "Not yet tested: AI output, self-report, or marketing. Never drives a decision on its own.",
    orgModeling: "MODEL-INFERRED", processMap: "Inferred (I), unverified"
  }
];
function gradeMeta(key) { return EVIDENCE_GRADES.find(g => g.key === key) || null; }

const LEVEL_LABELS = ["", "Absent", "Early", "Emerging", "Established"];

function unitWord(state, plural) {
  const vs = state && state.unit === "value-stream";
  return vs ? (plural ? "value streams" : "value stream") : (plural ? "capability clusters" : "capability cluster");
}

/* Mint the next ID for a prefix. Counters only ever go up. */
function nextRef(state, prefix, width) {
  state.idSeq = state.idSeq || {};
  const n = (state.idSeq[prefix] || 0) + 1;
  state.idSeq[prefix] = n;
  return prefix + "-" + String(n).padStart(width || 2, "0");
}

/* Give every cluster, lever, role, signal and pilot a stable ID.
   Safe to call on every render: existing IDs are kept, counters are
   first raised above anything already present (an imported file),
   and a duplicate (a copied row) is re-minted rather than shared. */
function ensureRefs(state) {
  if (!state) return state;
  state.idSeq = state.idSeq || {};
  const items = [];
  const clusterPrefix = state.unit === "value-stream" ? "VS" : "CAP";
  (state.clusters || []).forEach(c => {
    items.push({ o: c, prefix: clusterPrefix, w: 2 });
    (c.roles || []).forEach(r => items.push({ o: r, prefix: "RL", w: 3 }));
  });
  (((state.valueChain || {}).levers) || []).forEach(l => items.push({ o: l, prefix: "LV", w: 2 }));
  (state.briefings || []).forEach(b => (b.signals || []).forEach(s => items.push({ o: s, prefix: "SG", w: 3 })));
  const pilots = state.pilots || {};
  /* A value stream keeps its ID: chosen again after being dropped, or
     chosen in another country's copy of this frame, it is the same VS-nn,
     so the maps of it in each country can be compared. */
  if (!state.pilotRefs || typeof state.pilotRefs !== "object" || Array.isArray(state.pilotRefs)) state.pilotRefs = {};
  Object.keys(pilots).forEach(cid => {
    const p = pilots[cid];
    if (!p || p.decision !== "pilot") return;
    if (!p.ref && state.pilotRefs[cid] && state.unit !== "value-stream") p.ref = state.pilotRefs[cid].ref;
    items.push({ o: p, prefix: "VS", w: 2, pilotOf: cid });
  });
  if (state.unit !== "value-stream") Object.keys(state.pilotRefs).forEach(cid => {
    const m = /^VS-(\d+)$/.exec(state.pilotRefs[cid].ref || "");
    if (m) state.idSeq.VS = Math.max(state.idSeq.VS || 0, parseInt(m[1], 10));
  });

  items.forEach(it => {
    if (it.pilotOf && state.unit === "value-stream") return; // inherits its cluster's ID below
    const m = /^([A-Z]+)-(\d+)$/.exec(it.o.ref || "");
    if (m) state.idSeq[m[1]] = Math.max(state.idSeq[m[1]] || 0, parseInt(m[2], 10));
  });
  const seen = {};
  items.forEach(it => {
    // In a value-stream workspace the cluster already IS the value
    // stream, so its pilot carries the same ID rather than a second one.
    if (it.pilotOf && state.unit === "value-stream") {
      const cl = (state.clusters || []).find(c => c.id === it.pilotOf);
      if (cl && cl.ref) { it.o.ref = cl.ref; return; }
    }
    if (!it.o.ref || seen[it.o.ref]) it.o.ref = nextRef(state, it.prefix, it.w);
    seen[it.o.ref] = true;
    if (it.pilotOf && state.unit !== "value-stream") {
      const prev = state.pilotRefs[it.pilotOf] || {};
      state.pilotRefs[it.pilotOf] = { ref: it.o.ref, name: it.o.name || prev.name || "", kpi: it.o.kpi || prev.kpi || "" };
    }
  });

  if (state.charter) {
    const ch = state.charter;
    if (!ch.engagementKey) {
      const word = String(state.orgName || "").toUpperCase().replace(/[^A-Z0-9 ]/g, "").trim().split(/\s+/)[0] || "ENG";
      ch.engagementKey = word.slice(0, 10);
    }
    (ch.principles || []).forEach((p, i) => { p.ref = "P" + (i + 1); });
    (ch.refModel || []).forEach((c, i) => { c.ref = "C" + (i + 1); });
    (ch.criteria || []).forEach((c, i) => { c.ref = "DC-" + (i + 1); });
    (ch.gate || []).forEach((g, i) => { g.ref = "LG-" + (i + 1); });
    (ch.decisions || []).forEach(d => { if (!d.ref) d.ref = nextRef(state, "DEC", 2); });
  }
  return state;
}

function cellRef(cluster, lensKey) { return (cluster.ref || cluster.id) + "." + lensKey; }

/* ---- 3. Stage 0 — the engagement charter ------------------------
   Stage 0 is the one stage none of the four apps captured: what are
   we designing, by what rules, and who decides. It is settled BEFORE
   any data is seen, so the criteria cannot be bent toward a favoured
   answer afterwards. */
function defaultCharter() {
  return {
    engagementKey: "", sponsor: "", scope: "",
    thesis: { serve: "", outcome: "", profit: "", moat: "", scale: "" },
    principles: [],
    refModel: [
      { name: "Direction", test: "Share of unit scorecards tied to the breakthrough goals and reviewed monthly" },
      { name: "Standard work", test: "Share of critical steps where the documented way matches what is done" },
      { name: "Daily management", test: "Board updated every cycle; time from a red signal to escalation" },
      { name: "Problem solving", test: "Median days from a red signal to a countermeasure; 90-day recurrence" },
      { name: "Improvement engine", test: "Improvements delivered per quarter with savings evidence" },
      { name: "Governance and decision rights", test: "A named owner; decision rights documented and followed" },
      { name: "Capability and talent", test: "Share of unit leaders certified; the criterion is used in talent reviews" },
      { name: "Integration playbook", test: "Days for a new unit to run the first two tiers of the routine" }
    ],
    /* Shaped exactly as Org Modeling's "Compare options" expects, so the
       weights agreed here are the weights scored there. */
    criteria: [
      { name: "Installs the routines in a new unit quickly", kind: "judged", weight: 25, description: "How fast the design gets the operating system running somewhere new" },
      { name: "Clear decision rights at the anchor layer", kind: "judged", weight: 20, description: "One named role makes each recurring decision" },
      { name: "Protects and develops judgement in complex work", kind: "judged", weight: 15, description: "Human judgement is kept where the work needs it" },
      { name: "Layers added", kind: "measured", weight: 15, metric: "layers", better: "lower" },
      { name: "Annual cost change", kind: "measured", weight: 15, metric: "total_cost", better: "lower" },
      { name: "Disruption (people affected)", kind: "measured", weight: 10, metric: "people_affected_pct", better: "lower" }
    ],
    gate: [
      { text: "Standards for clear, rule-based work are written so a machine can run and check them" },
      { text: "Standards are refreshed on a fixed cadence from how the work is actually done" },
      { text: "AI is built into daily management and problem solving, not bolted on" },
      { text: "Human judgement is protected and developed in complex work" },
      { text: "The design installs faster than competitors can in a new unit" }
    ],
    rules: [
      { text: "Every finding carries a grade: Confirmed, Indicated or Hypothesis. The grade is the assessor's judgement, made with the evidence in view.", applies: "All apps" },
      { text: "A Hypothesis never drives a decision on its own.", applies: "All apps" },
      { text: "One assessor scores each cell; the rationale and sources are recorded so the score can be challenged.", applies: "Capability Compass" },
      { text: "At least 5 cases behind any step metric.", applies: "Process Map Studio" },
      { text: "At least 30 desire-pulse responses per role group; any task mapping below 0.70 confidence is reviewed by a person.", applies: "Workbench" },
      { text: "Archetype fit stays a Hypothesis until process evidence tests it.", applies: "Org Modeling" },
      { text: "Value figures are estimates until finance validates them.", applies: "All apps" }
    ],
    decisions: [
      { stage: "0 Frame", decision: "Thesis, design principles, reference model, criteria and evidence rules", owner: "", evidence: "Sponsor sign-off", status: "open" },
      { stage: "1 Focus", decision: "Which value streams to pilot", owner: "", evidence: "Every cluster scored; exclusions stated", status: "open" },
      { stage: "2 Find", decision: "Which discrepancies to act on", owner: "", evidence: "Each graded Confirmed or Indicated", status: "open" },
      { stage: "3 Dial", decision: "Step dispositions and the top operating-system gaps", owner: "", evidence: "Evidence shown for every gap", status: "open" },
      { stage: "4 Design", decision: "The combined model-and-system design, and first-tranche funding", owner: "", evidence: "Criteria ranking, leapfrog gate, investment case", status: "open" },
      { stage: "5 Deliver", decision: "Scale, adjust or stop", owner: "", evidence: "Scorecard with finance-validated value", status: "open" }
    ],
    lockedAt: null, lockedBy: "", amendments: []
  };
}

const THESIS_FIELDS = [
  { key: "serve", label: "Who we serve", hint: "The customers whose problem this business exists to solve." },
  { key: "outcome", label: "The outcome we sell", hint: "What they are really paying for — an outcome, not a product list." },
  { key: "profit", label: "The profit formula", hint: "How that outcome turns into margin: what is charged, what it costs." },
  { key: "moat", label: "The moat", hint: "Why a competitor cannot simply copy it." },
  { key: "scale", label: "The scale logic", hint: "What gets cheaper or better as it grows." }
];

function criteriaWeightTotal(charter) {
  return ((charter || {}).criteria || []).reduce((a, c) => a + (parseFloat(c.weight) || 0), 0);
}

/* Stage 0 gate. `open` items do not block the lock — the workflow stays
   flexible — but they are counted, shown, and written into the decision
   log at the moment of locking, so a skipped step is never invisible. */
function stage0Readiness(state) {
  const ch = state.charter || defaultCharter();
  const filled = THESIS_FIELDS.filter(f => (ch.thesis[f.key] || "").trim()).length;
  const pr = ch.principles || [];
  const total = criteriaWeightTotal(ch);
  const owners = (ch.decisions || []).filter(d => (d.owner || "").trim()).length;
  const checks = [
    { key: "thesis", label: "Business-model thesis written", ok: filled === THESIS_FIELDS.length, detail: filled + " of " + THESIS_FIELDS.length + " parts filled" },
    { key: "principles", label: "Design principles, each with what would prove it wrong", ok: pr.length >= 3 && pr.every(p => (p.text || "").trim() && (p.refute || "").trim()), detail: pr.length + " written" + (pr.some(p => !(p.refute || "").trim()) ? "; some have no refuting evidence" : "") },
    { key: "refmodel", label: "Operating-system reference model agreed", ok: (ch.refModel || []).length >= 1 && ch.refModel.every(c => (c.name || "").trim() && (c.test || "").trim()), detail: (ch.refModel || []).length + " components, each with an observable test" },
    { key: "criteria", label: "Design criteria weighted (weights total 100)", ok: (ch.criteria || []).length >= 3 && Math.abs(total - 100) < 0.01, detail: (ch.criteria || []).length + " criteria; weights total " + total },
    { key: "gate", label: "Leapfrog gate set as pass or fail tests", ok: (ch.gate || []).length >= 1 && ch.gate.every(g => (g.text || "").trim()), detail: (ch.gate || []).length + " tests" },
    { key: "owners", label: "Sponsor and a decision owner named for every gate", ok: !!(ch.sponsor || "").trim() && owners === (ch.decisions || []).length && owners > 0, detail: ((ch.sponsor || "").trim() ? "Sponsor named" : "No sponsor") + "; " + owners + " of " + (ch.decisions || []).length + " decisions have an owner" }
  ];
  const open = checks.filter(c => !c.ok);
  return { checks, open: open.length, locked: !!ch.lockedAt, lockedAt: ch.lockedAt, complete: open.length === 0 };
}

/* ---- 4. Money at risk in currency -------------------------------
   Optional. A lever may carry an estimated amount at stake; a
   cluster's money at risk is that amount × its capability gap. It is
   labelled an estimate everywhere until finance validates the lever. */
function clusterMoney(state, cluster, lenses) {
  const levers = (((state.valueChain || {}).levers) || []).filter(l => l.cluster_id === cluster.id);
  const valued = levers.filter(l => typeof l.value_at_stake === "number" && l.value_at_stake > 0);
  const stake = valued.reduce((a, l) => a + l.value_at_stake, 0);
  const gap = Math.max(0, (4 - clusterAvg(cluster, lenses || state.lenses)) / 3);
  return {
    hasValue: valued.length > 0, stake, gap, atRisk: stake * gap,
    validated: valued.length > 0 && valued.every(l => l.validated === true)
  };
}

function fmtMoney(state, n) {
  const vc = state.valueChain || {};
  const r = n >= 100 ? Math.round(n) : Math.round(n * 10) / 10;
  return (vc.currency || "") + r.toLocaleString("en-US") + (vc.value_unit || "");
}

/* ---- 5. Stage 1 — readiness and the pilot shortlist -------------- */
const PILOT_DECISIONS = ["", "pilot", "later", "out"];

function cellAssessed(cell) { return !!cell && cell.status !== "Not yet assessed"; }

/* Candidates are ranked where the three signals point the same way:
   money at risk, weak cells, and missing anchor seats. */
function pilotCandidates(state) {
  const pilots = state.pilots || {};
  return orderClustersForBoard(state, state.boardSort || "auto").clusters.map(cl => {
    const exp = clusterValueExposure(state, cl, state.lenses);
    const money = clusterMoney(state, cl, state.lenses);
    const cov = roleCoverage(cl);
    const weak = clusterWeakCount(cl, state.lenses);
    const bind = bindingConstraint(state, cl, state.lenses);
    return {
      cluster: cl, exposure: exp.exposure, weight: exp.weight, money, weak,
      seatGaps: cov.gaps.length, binding: bind ? bind.lensName : "",
      pilot: pilots[cl.id] || { decision: "", reason: "", name: "", kpi: "" }
    };
  });
}

function stage1Readiness(state) {
  const k = enterpriseKpis(state);
  const cov = valueChainCoverage(state);
  const cal = calibrationSummary(state);
  const s0 = stage0Readiness(state);
  const pilots = state.pilots || {};
  let cells = 0, assessed = 0, graded = 0;
  state.clusters.forEach(cl => state.lenses.forEach(l => {
    const c = cl.cells[l.key]; if (!c) return;
    cells++; if (cellAssessed(c)) assessed++; if (c.grade) graded++;
  }));
  const withRoles = state.clusters.filter(c => (c.roles || []).length > 0).length;
  const toConfirm = state.clusters.reduce((n, c) => n + (c.roles || []).filter(r => r.unconfirmed).length, 0);
  const decided = state.clusters.filter(c => (pilots[c.id] || {}).decision).length;
  const unreasoned = state.clusters.filter(c => {
    const p = pilots[c.id] || {};
    return (p.decision === "out" || p.decision === "later") && !(p.reason || "").trim();
  }).length;
  const chosen = state.clusters.filter(c => (pilots[c.id] || {}).decision === "pilot");
  const chosenReady = chosen.filter(c => (pilots[c.id].name || "").trim() && (pilots[c.id].kpi || "").trim()).length;
  const U = unitWord(state, true);

  /* must = the playbook's Stage 1 gate ("everything scored, nothing
     silently dropped, a pilot chosen"). should = makes the hand-off
     stronger but is the owner's call. */
  const checks = [
    { key: "charter", level: "should", view: "charter", label: "Stage 0 charter locked", ok: s0.locked, detail: s0.locked ? "Locked " + new Date(s0.lockedAt).toLocaleDateString() : s0.open + " charter item(s) open; not locked" },
    { key: "money", level: "should", view: "valuechain", label: "Money map weighted and owned", ok: cov.weighted > 0 && cov.pct >= CALIB_COVERAGE_MIN, detail: cov.weighted ? cov.pct + "% of economic weight has an owner" : "No lever carries a weight yet" },
    { key: "calibration", level: "should", view: "valuechain", label: "The " + U + " fit where the money is", ok: cal.high === 0 && cov.weighted > 0, detail: cal.verdict },
    { key: "scored", level: "must", view: "matrix", label: "Every cell scored — nothing silently dropped", ok: cells > 0 && assessed === cells, detail: assessed + " of " + cells + " cells assessed" },
    { key: "evidence", level: "should", view: "matrix", label: "Every score cites a source", ok: k.groundedPct === 100, detail: k.groundedPct + "% of scores cite at least one source" },
    { key: "graded", level: "should", view: "matrix", label: "Every score carries an evidence grade", ok: cells > 0 && graded === cells, detail: graded + " of " + cells + " cells graded" },
    { key: "direction", level: "should", view: "trajectory", label: "Direction known for most cells", ok: k.unknownPct <= 25, detail: k.unknownPct + "% of directions unknown" },
    { key: "roles", level: "should", view: "roles", label: "Anchor roles listed for every " + unitWord(state), ok: withRoles === state.clusters.length && toConfirm === 0, detail: withRoles + " of " + state.clusters.length + " have roles scored" + (toConfirm ? "; " + toConfirm + " role(s) copied from another country still to confirm" : "") },
    { key: "baseline", level: "must", view: "delta", label: "Baseline version saved", ok: (state.versions || []).length > 0, detail: (state.versions || []).length ? (state.versions.length + " version(s) saved") : "Use “Save version” to freeze the baseline the scoreboard measures against" },
    { key: "decisions", level: "must", view: "handoff", label: "A pilot decision for every " + unitWord(state) + ", with a reason for each exclusion", ok: decided === state.clusters.length && unreasoned === 0, detail: decided + " of " + state.clusters.length + " decided" + (unreasoned ? "; " + unreasoned + " exclusion(s) have no reason" : "") },
    { key: "pilot", level: "must", view: "handoff", label: "At least one pilot named, with its process KPI", ok: chosen.length > 0 && chosenReady === chosen.length, detail: chosen.length ? chosenReady + " of " + chosen.length + " pilot(s) have a name and KPI" : "No pilot chosen yet" }
  ];
  const mustOpen = checks.filter(c => c.level === "must" && !c.ok).length;
  const shouldOpen = checks.filter(c => c.level === "should" && !c.ok).length;
  return {
    checks, mustOpen, shouldOpen, ready: mustOpen === 0,
    verdict: mustOpen ? "Not ready to hand off" : (shouldOpen ? "Ready, with " + shouldOpen + " thing(s) worth tightening" : "Ready to hand off")
  };
}

/* ---- 6. Stage 5 — the scoreboard --------------------------------- */

/* A past version, replayed as if it were the present, so the same
   engine that scores today scores history. */
function stateAtVersion(state, i) {
  return {
    clusters: state.versions[i].snapshot.clusters, lenses: state.lenses,
    versions: state.versions.slice(0, i), valueChain: state.valueChain
  };
}

function versionTrend(state) {
  const points = (state.versions || []).map((v, i) => {
    const s = stateAtVersion(state, i);
    const k = enterpriseKpis(s);
    return { label: v.version, when: v.savedAt, note: v.label, avg: k.avg, weak: k.weak, grounded: k.groundedPct, clusters: s.clusters };
  });
  const now = enterpriseKpis(state);
  points.push({ label: "Now", when: null, note: state.currentVersion, avg: now.avg, weak: now.weak, grounded: now.groundedPct, clusters: state.clusters, current: true });
  const rows = state.clusters.map(cl => ({
    cluster: cl,
    series: points.map(p => {
      const c = p.clusters.find(x => x.id === cl.id);
      return c ? clusterAvg(c, state.lenses) : null;
    })
  }));
  return { points, rows };
}

/* Were last cycle's directional calls right? The call is replayed from
   the previous version exactly as it would have read on that day, then
   compared with what the level actually did since. An "improving" call
   that has not moved yet is PENDING, not wrong — the forecast horizon
   is two review cycles. */
function forecastCheck(state) {
  const vs = state.versions || [];
  if (!vs.length) return null;
  const i = vs.length - 1;
  const past = stateAtVersion(state, i);
  const rows = [];
  past.clusters.forEach(pc => {
    const nowCl = state.clusters.find(c => c.id === pc.id);
    if (!nowCl) return;
    state.lenses.forEach(l => {
      const then = pc.cells[l.key], now = nowCl.cells[l.key];
      if (!then || !now) return;
      const t = cellTrajectory(past, pc, l.key);
      const lab = trajectoryLabel(t);
      const moved = now.level - then.level;
      let verdict;
      if (!t.known) verdict = "nocall";
      else if (lab.dir === 0) verdict = moved === 0 ? "hit" : "miss";
      else if (Math.sign(moved) === lab.dir) verdict = "hit";
      else verdict = moved === 0 ? "pending" : "miss";
      rows.push({ cluster: nowCl, lensKey: l.key, lensName: l.name, call: lab, from: then.level, to: now.level, moved, verdict });
    });
  });
  const n = v => rows.filter(r => r.verdict === v).length;
  const judged = n("hit") + n("miss");
  const order = { miss: 0, pending: 1, hit: 2, nocall: 3 };
  rows.sort((a, b) => order[a.verdict] - order[b.verdict]);
  return {
    baseline: vs[i].version, rows, hits: n("hit"), misses: n("miss"), pending: n("pending"), nocall: n("nocall"),
    rate: judged ? Math.round((n("hit") / judged) * 100) : null
  };
}

/* ---- 7. The hand-off packet -------------------------------------- */
function slugId(name) {
  return String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "criterion";
}

function buildHandoffPacket(state) {
  ensureRefs(state);
  const ch = state.charter || defaultCharter();
  const vc = state.valueChain || { levers: [] };
  const pilots = state.pilots || {};
  const key = ch.engagementKey || "ENG";
  const refOf = cid => { const c = state.clusters.find(x => x.id === cid); return c ? c.ref : null; };

  const clusters = state.clusters.map(cl => {
    const ct = clusterTrajectory(state, cl, state.lenses);
    const money = clusterMoney(state, cl, state.lenses);
    const exp = clusterValueExposure(state, cl, state.lenses);
    return {
      ref: cl.ref, name: cl.name, desc: cl.desc || "", priority_move: cl.priority_move || "",
      avg_level: Math.round(clusterAvg(cl, state.lenses) * 100) / 100,
      trajectory: ct.known ? trajectoryLabel(ct).word : "Unknown",
      economic_weight_pct: exp.weight, exposure_index: Math.round(exp.exposure * 10) / 10,
      value_at_stake: money.hasValue ? money.stake : null,
      money_at_risk: money.hasValue ? Math.round(money.atRisk * 10) / 10 : null,
      value_validated: money.hasValue ? money.validated : null,
      cells: state.lenses.filter(l => cl.cells[l.key]).map(l => {
        const c = cl.cells[l.key];
        const t = cellTrajectory(state, cl, l.key);
        return {
          ref: cellRef(cl, l.key), lens: l.key, level: c.level, level_label: LEVEL_LABELS[c.level],
          status: c.status, rationale: c.rationale || "", intervention: c.intervention || "",
          grade: c.grade || null,
          trajectory: trajectoryLabel(t).word, confidence: t.known ? t.confidence : null,
          evidence: (c.evidence || []).map(e => ({ label: e.label || "", note: e.note || "", ref: e.ref || null })),
          watch: (c.watch || []).slice()
        };
      })
    };
  });

  const levers = (vc.levers || []).map(l => ({
    ref: l.ref, name: l.name, figure: l.figure || "", economic_weight_pct: l.share_pct || 0,
    value_at_stake: typeof l.value_at_stake === "number" ? l.value_at_stake : null,
    validated: l.validated === true, capability: l.capability || "", cluster_ref: refOf(l.cluster_id)
  }));

  const roles = [];
  state.clusters.forEach(cl => (cl.roles || []).forEach(r => {
    const s = roleSummary(r);
    roles.push({
      ref: r.ref, title: r.title, status: r.status, status_confirmed: !r.unconfirmed, cluster_ref: cl.ref,
      criticality_index: Math.round(s.idx * 10) / 10, tacit_intensity: Math.round(s.tki * 10) / 10,
      route: s.route, note: r.note || ""
    });
  }));

  const signals = [];
  (state.briefings || []).forEach(b => (b.signals || []).forEach(s => signals.push({
    ref: s.ref, headline: s.headline, direction: s.direction, grade: s.grade || null,
    source: s.source || "", lens: s.lens_key || null,
    cluster_refs: (s.affected_cluster_ids || []).map(refOf).filter(Boolean)
  })));

  const pilotList = [], exclusions = [];
  state.clusters.forEach(cl => {
    const p = pilots[cl.id];
    if (!p || !p.decision) return;
    if (p.decision === "pilot") {
      pilotList.push({ ref: p.ref, cluster_ref: cl.ref, name: p.name || cl.name, process_kpi: p.kpi || "", reason: p.reason || "" });
    } else {
      exclusions.push({ cluster_ref: cl.ref, name: cl.name, decision: p.decision, reason: p.reason || "" });
    }
  });

  const ready = stage1Readiness(state);
  const latest = (state.versions || [])[(state.versions || []).length - 1];

  /* Shaped around what each app accepts TODAY. None of them imports this
     file yet, so each block is also offered as copy-ready text. */
  const omCriteria = (ch.criteria || []).map(c => {
    const o = { id: slugId(c.name), ref: c.ref, name: c.name, kind: c.kind, weight: parseFloat(c.weight) || 0 };
    if (c.kind === "measured") { o.metric = c.metric || ""; o.better = c.better || "lower"; }
    if (c.description) o.description = c.description;
    return o;
  });
  const ranked = clusters.slice().sort((a, b) => b.exposure_index - a.exposure_index);
  const strategyText = [
    THESIS_FIELDS.map(f => (ch.thesis[f.key] || "").trim() ? f.label + ": " + ch.thesis[f.key].trim() : "").filter(Boolean).join("\n"),
    (ch.principles || []).length ? "Design principles:\n" + ch.principles.map(p => p.ref + " " + p.text).join("\n") : "",
    "Capability priorities (highest value exposure first):\n" + ranked.map(c =>
      c.ref + " " + c.name + " — maturity " + c.avg_level + "/4, " + c.trajectory.toLowerCase() +
      (c.economic_weight_pct ? ", " + c.economic_weight_pct + "% of economic weight" : "") +
      (c.priority_move ? ". Priority move: " + c.priority_move : "")).join("\n")
  ].filter(Boolean).join("\n\n");

  return {
    format: HANDOFF_FORMAT, format_version: HANDOFF_VERSION,
    generated_at: new Date().toISOString(), source_app: "capability-compass",
    engagement: {
      key: key, name: state.workspaceName || state.orgName, organisation: state.orgName,
      industry: state.industry_name || "", unit: state.unit || "capability", scope: ch.scope || "",
      country: state.country || "",
      currency: vc.currency || "", value_unit: vc.value_unit || "",
      baseline_version: latest ? latest.version : null, working_version: state.currentVersion || ""
    },
    vocabulary: {
      maturity_levels: [1, 2, 3, 4].map(n => ({ level: n, label: LEVEL_LABELS[n] })),
      evidence_grades: EVIDENCE_GRADES.map(g => ({ key: g.key, label: g.label, signal_label: g.signal, means: g.means, org_modeling_term: g.orgModeling, process_map_term: g.processMap })),
      id_prefixes: ID_PREFIXES.map(p => ({ prefix: p.prefix, what: p.what, owner: p.owner })),
      note: "Quote an ID as <engagement key>:<ID>, for example " + key + ":" + (clusters[0] ? clusters[0].ref : "CAP-01") + ", when it leaves this engagement."
    },
    charter: {
      sponsor: ch.sponsor || "", locked_at: ch.lockedAt || null,
      thesis: Object.assign({}, ch.thesis),
      principles: (ch.principles || []).map(p => ({ ref: p.ref, principle: p.text || "", refuted_by: p.refute || "" })),
      reference_model: (ch.refModel || []).map(c => ({ ref: c.ref, name: c.name, observable_test: c.test || "" })),
      design_criteria: omCriteria,
      leapfrog_gate: (ch.gate || []).map(g => ({ ref: g.ref, test: g.text })),
      evidence_rules: (ch.rules || []).map(r => ({ rule: r.text, applies_to: r.applies || "" })),
      decision_log: (ch.decisions || []).map(d => ({ ref: d.ref, stage: d.stage, decision: d.decision, owner: d.owner || "", evidence_required: d.evidence || "", status: d.status || "open", date: d.date || null }))
    },
    clusters, levers, roles, signals,
    pilots: pilotList, exclusions,
    readiness: { ready: ready.ready, verdict: ready.verdict, open: ready.checks.filter(c => !c.ok).map(c => ({ check: c.label, level: c.level, detail: c.detail })) },
    for_apps: {
      org_modeling: {
        how: "Paste strategy_text into the strategy box and enter design_criteria in Compare options. Upload the org file there; it is not part of this packet.",
        strategy_text: strategyText,
        design_criteria: omCriteria,
        structure_lens: clusters.map(c => {
          const s = c.cells.find(x => x.lens === "Structure");
          return s ? { ref: s.ref, cluster: c.name, level: s.level_label, status: s.status, grade: s.grade } : null;
        }).filter(Boolean)
      },
      process_map_studio: {
        how: "Open one engagement per pilot. Put process_kpi on the scope card and use the prompts in the interviews.",
        engagements: pilotList.map(p => {
          const c = clusters.find(x => x.ref === p.cluster_ref);
          return {
            name: key + " " + p.ref + " " + p.name, process_name: p.name, process_kpi: p.process_kpi,
            industry: state.industry_name || "",
            in_scope_roles: roles.filter(r => r.cluster_ref === p.cluster_ref).map(r => r.title),
            interview_prompts: c.cells.filter(x => x.level <= 2 || x.watch.length).map(x =>
              x.ref + " " + x.lens + " is " + x.level_label + ": " + (x.rationale || x.status) + (x.watch.length ? " Watch: " + x.watch[0] : ""))
          };
        })
      },
      workbench: {
        how: "Create one engagement with this name and load the same org file. Start Task Intelligence with these roles.",
        engagement_name: key + " " + (state.workspaceName || state.orgName),
        roles: roles.filter(r => pilotList.some(p => p.cluster_ref === r.cluster_ref) || r.route === "critical" || r.route === "dual")
          .map(r => ({ ref: r.ref, title: r.title, cluster_ref: r.cluster_ref, route: r.route, status: r.status }))
      }
    }
  };
}

/* Copy-ready text for one receiving app. */
function handoffBrief(packet, app) {
  const e = packet.engagement, f = packet.for_apps, L = [];
  const head = t => { L.push(t); L.push("-".repeat(Math.min(60, t.length))); };
  if (app === "org_modeling") {
    head("For Org Modeling — " + e.key + " " + e.name);
    L.push("STRATEGY (paste into the strategy box)", "", f.org_modeling.strategy_text, "");
    L.push("DESIGN CRITERIA (enter in Compare options; weights total " + f.org_modeling.design_criteria.reduce((a, c) => a + c.weight, 0) + ")");
    f.org_modeling.design_criteria.forEach(c => L.push("  " + c.ref + "  " + c.name + " — " + (c.kind === "measured" ? "measured (" + c.metric + ", " + c.better + " is better)" : "judged 1 to 5") + " — weight " + c.weight));
    L.push("", "STRUCTURE LENS TODAY (evidence to test, never a score to copy)");
    f.org_modeling.structure_lens.forEach(s => L.push("  " + s.ref + "  " + s.cluster + ": " + s.level + " — " + s.status + (s.grade ? " [" + s.grade + "]" : "")));
  } else if (app === "process_map_studio") {
    head("For Process Map Studio — " + e.key + " " + e.name);
    if (!f.process_map_studio.engagements.length) L.push("No pilot has been chosen yet. Choose one in the Hand-off view.");
    f.process_map_studio.engagements.forEach(g => {
      L.push("ENGAGEMENT: " + g.name, "  Process: " + g.process_name, "  Process KPI (scope card): " + (g.process_kpi || "not set"), "  Industry: " + g.industry);
      L.push("  Roles in scope: " + (g.in_scope_roles.join("; ") || "none listed"));
      if (g.interview_prompts.length) { L.push("  Use as interview prompts:"); g.interview_prompts.forEach(p => L.push("   - " + p)); }
      L.push("");
    });
  } else {
    head("For the AI Org Advisory Workbench — " + e.key + " " + e.name);
    L.push("ENGAGEMENT NAME: " + f.workbench.engagement_name, "", "ROLES TO START TASK INTELLIGENCE WITH");
    if (!f.workbench.roles.length) L.push("  None yet — score anchor roles in the Roles view.");
    f.workbench.roles.forEach(r => L.push("  " + r.ref + "  " + r.title + " — " + r.route + ", " + r.status + " (" + r.cluster_ref + ")"));
  }
  L.push("", "IDs are quoted as " + e.key + ":<ID>. Grades: Confirmed, Indicated, Hypothesis.");
  return L.join("\n");
}

/* ---- 8. The journey — where am I in the six stages? --------------- */
function journeyStages(state) {
  const s0 = stage0Readiness(state), s1 = stage1Readiness(state);
  const vs = (state.versions || []).length;
  const pilots = Object.values(state.pilots || {}).filter(p => p && p.decision === "pilot").length;
  const st = (done, started) => done ? "done" : (started ? "doing" : "todo");
  return [
    { n: 0, name: "Frame", here: true, view: "charter", app: "This app — Charter",
      q: "What business are we building, and how will we judge the design?",
      status: st(s0.locked, s0.open < s0.checks.length),
      detail: s0.locked ? "Charter locked" : (s0.checks.length - s0.open) + " of " + s0.checks.length + " charter items complete" },
    { n: 1, name: "Focus", here: true, view: "handoff", app: "This app — ground it, score it, choose the pilot",
      q: "Where must the model change, and where does the system matter most?",
      status: st(s1.ready, s1.checks.some(c => c.ok)),
      detail: s1.verdict + " · " + s1.checks.filter(c => c.ok).length + " of " + s1.checks.length + " checks met" },
    { n: 2, name: "Find", here: false, view: "handoff", app: "Process Map Studio",
      q: "How does work really run, and does it support the model?",
      status: pilots ? "elsewhere" : "todo",
      detail: pilots ? "Take the Process Map Studio brief for " + pilots + " pilot(s)" : "Waits for a pilot from Stage 1" },
    { n: 3, name: "Dial", here: false, view: "current", app: "Process Map Studio + Workbench, then back here",
      q: "What to standardise, and how much should AI do?",
      status: "elsewhere",
      detail: (state.returns || []).length
        ? (state.returns || []).reduce((n, r) => n + r.findings.length, 0) + " finding(s) back from the other apps. Cite them on the cells, re-score, and save a new version"
        : "When findings come back, import the file under Current State, cite them on the cells, re-score, and save a new version" },
    { n: 4, name: "Design", here: false, view: "handoff", app: "Org Modeling + Workbench",
      q: "Which operating model and system do we install together?",
      status: "elsewhere",
      detail: "Options are scored against the criteria locked in Stage 0" },
    { n: 5, name: "Deliver", here: true, view: "delta", app: "This app — Scoreboard",
      q: "Is the system lifting capability, cycle by cycle?",
      status: vs >= 2 ? "doing" : "todo",
      detail: vs ? vs + " version(s) saved — the scoreboard compares each cycle with the last" : "Starts once a baseline version is saved" }
  ];
}

/* Node (contract test) export; harmless no-op in the browser. */
if (typeof module !== "undefined" && module.exports) {
  module.exports = { HANDOFF_FORMAT, HANDOFF_VERSION };
}
