/* ============================================================
   Capability Compass — Current state across countries

   One workspace per country, all built from the same frame, so the
   same ID means the same thing everywhere (CAP-03 is CAP-03 in each
   country; the engagement key says which country).

   This file answers three questions and nothing else:
     1. Where do the countries differ?            compareFrames, compareDifferences
     2. Which roles exist where?                  compareRoles
     3. What have the other apps found, per country?   compareFindings

   Two rules:
   - A country that has not been scored shows as "not scored". It is
     never read as weak, and never averaged in.
   - Money is never added across countries unless currency and unit
     match. A total across two currencies is a made-up number.

   Pure functions — no DOM, no storage.
   ============================================================ */

/* Why a difference exists decides what to do about it. This is the
   frame EXCO needs: not "the countries differ" but "which differences
   are ours to remove". */
const DIFF_CLASSES = [
  { key: "required", label: "Required", means: "Regulation, a customer contract or the physical site makes it so.", ask: "Leave local" },
  { key: "chosen", label: "Chosen", means: "A deliberate local decision, made for a reason someone can state.", ask: "Decide: keep or align" },
  { key: "inherited", label: "Inherited", means: "History, an acquisition or habit. Nobody decided it.", ask: "Harmonise" }
];
function diffClassMeta(key) { return DIFF_CLASSES.find(c => c.key === key) || null; }

const RETURN_FORMAT = "compass-return";

/* What each kind of imported finding is, in the reader's words, and
   which page of the readout it belongs on. */
const FINDING_KINDS = {
  discrepancy: { label: "Documented vs done", page: "work" },
  step: { label: "Process step", page: "work" },
  intent: { label: "Promise to the customer", page: "work" },
  knowledge_risk: { label: "Knowledge at risk", page: "roles" },
  hypothesis_verdict: { label: "Hypothesis tested", page: "work" },
  structural_baseline: { label: "Structure", page: "roles" },
  work_activity: { label: "Work activity", page: "roles" },
  hypothesis: { label: "Hypothesis", page: "work" },
  option_score: { label: "Structural option", page: "work" },
  task_disposition: { label: "Task and AI", page: "work" },
  role_impact: { label: "Role impact", page: "roles" },
  capacity: { label: "Capacity", page: "work" },
  role_reason: { label: "Why the role is there", page: "roles" },
  variation: { label: "Differs between countries", page: "work" },
  sop: { label: "SOP and its owner", page: "work" },
  process_summary: { label: "Steps and handoffs", page: "work" },
  role_family: { label: "Role family", page: "roles" }
};
/* Optional on any finding (format 1.0, additive). When the sending app
   says what a finding is about, that decides its readout page; without
   it the kind decides, and decision wording as a last resort. */
const FINDING_TOPICS = {
  decision_right: { label: "Who decides", page: "decisions" },
  role_presence: { label: "Which roles exist", page: "people" },
  role_reason: { label: "Why a role is there", page: "people" },
  way_of_working: { label: "How work runs", page: "work" }
};
/* Why something is as it is: the same three words the Compass uses for
   a difference between countries, plus "not known yet". */
const REASON_CLASSES = {
  required: { label: "Required" }, chosen: { label: "Chosen" },
  inherited: { label: "Inherited" }, unknown: { label: "Reason not known" }
};
function findingPage(f) {
  if (f.topic && FINDING_TOPICS[f.topic]) return FINDING_TOPICS[f.topic].page;
  if ((FINDING_KINDS[f.kind] || {}).page === "roles") return "people";
  return isDecisionFinding(f) ? "decisions" : "work";
}
const SOURCE_APP_NAMES = {
  "org-modeling": "Org Modeling", "process-map-studio": "Process Map Studio",
  "ai-org-advisory-workbench": "Workbench", "workbench": "Workbench"
};
function sourceAppName(key) {
  const k = String(key || "").toLowerCase().replace(/[_ ]/g, "-");
  return SOURCE_APP_NAMES[k] || (key ? String(key) : "Another app");
}

/* Is this finding about who decides? Decision rights have their own
   page, so they are picked out of the process findings by wording. */
function isDecisionFinding(f) {
  return /different role|decid|decision|authority|approv|accountab|sign(ed|s)?[- ]?off/i.test((f.title || "") + " " + (f.detail || ""));
}

function normName(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }

/* Shared by every workspace built from the same frame, so the
   classification is the same whichever country is open.
   with / skip: workspaces added to, or left out of, the comparison by hand. */
function defaultComparison() { return { with: [], skip: [], classes: {}, verdict: "", asks: "" }; }

/* ---- Copy a frame to another country -----------------------------
   Same clusters, lenses, levers, roles and charter — and the SAME IDs —
   with every judgement removed: scores, evidence, weights, amounts and
   pilot decisions are the new country's to make. Role statuses cannot
   be known yet, so each is marked "to confirm" rather than guessed. */
function frameCopy(src, country, code) {
  const s = JSON.parse(JSON.stringify(src));
  const cc = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3);
  delete s.workspaceId;
  /* frameId and comparison are kept on purpose: they are what tie the
     countries together. */
  s.country = String(country || "").trim();
  s.frameHomeId = src.frameHomeId || src.workspaceId || "";
  s.unitTier = "mapped";
  s.workspaceName = (src.orgName || "Workspace") + " — " + s.country;
  s.clusters.forEach(cl => {
    Object.keys(cl.cells).forEach(lk => {
      cl.cells[lk] = {
        level: 1, status: "Not yet assessed", rationale: "", intervention: "",
        items: [], evidence: [], leading: [], watch: [], history: [], grade: "",
        last_updated: new Date().toISOString(), updated_by: "—"
      };
    });
    (cl.roles || []).forEach(r => { r.status = "exists"; r.unconfirmed = true; });
  });
  if (s.valueChain) {
    s.valueChain.revenue = ""; s.valueChain.as_of = "";
  }
  /* The period and the volume measure are frame, so every unit is measured
     the same way; the numbers are the unit's own. */
  s.economics = blankEconomics(src.economics);
  /* Each unit names its own SOP owners and dates; the list of SOPs is the
     unit's own too, so it starts empty. Structure figures are the unit's. */
  s.sops = []; s.structureOverride = {}; s.processFacts = {}; s.dataFacts = {}; s.typedDecisions = [];
  /* Typed role families travel as names to confirm: head-count and reason blank. */
  s.roleFamilies = (src.roleFamilies || []).map(x => Object.assign({}, x, { headcount: null, reason_class: "", reason: "" }));
  if (s.valueChain) {
    (s.valueChain.stages || []).forEach(st => { st.note = ""; });
    (s.valueChain.levers || []).forEach(l => { l.share_pct = 0; l.figure = ""; delete l.value_at_stake; l.validated = false; });
  }
  s.versions = []; s.changeLog = []; s.briefings = []; s.documents = []; s.analyses = [];
  /* The pilot DECISION is each country's; the value stream's ID, name and
     KPI are frame, so the same value stream is VS-01 everywhere. */
  s.pilotRefs = Object.assign({}, src.pilotRefs || {});
  Object.keys(src.pilots || {}).forEach(cid => {
    const p = src.pilots[cid];
    if (p && p.decision === "pilot" && p.ref && src.unit !== "value-stream") s.pilotRefs[cid] = { ref: p.ref, name: p.name || "", kpi: p.kpi || "" };
  });
  s.calibrations = []; s.returns = []; s.pilots = {};
  s.currentVersion = "v0.1 (working)";
  if (s.charter) {
    const base = String(src.charter.engagementKey || "ENG").replace(/[^A-Z0-9]/g, "");
    s.charter.engagementKey = (base.slice(0, 10 - cc.length) + cc) || "ENG";
    s.charter.scope = s.country + (src.charter.scope ? " — " + src.charter.scope : "");
  }
  return s;
}

function unconfirmedRoles(state) {
  return (state.clusters || []).reduce((a, c) => a + (c.roles || []).filter(r => r.unconfirmed).length, 0);
}

/* ---- 1. Where do the countries differ? ---------------------------
   `frames` is [{ id, label, state }], one per country, in display order. */
function compareFrames(frames) {
  const lensKeys = [];
  frames.forEach(f => (f.state.lenses || []).forEach(l => { if (lensKeys.indexOf(l.key) === -1) lensKeys.push(l.key); }));
  const rows = [], byId = {}, byName = {};
  frames.forEach(f => (f.state.clusters || []).forEach(cl => {
    let row = byId[cl.id] || byName[normName(cl.name)];
    if (!row) {
      row = { key: cl.id, name: cl.name, ref: cl.ref || "", cells: {} };
      rows.push(row);
    }
    byId[cl.id] = row; byName[normName(cl.name)] = row;
    const levels = {}; let n = 0, sum = 0;
    lensKeys.forEach(lk => {
      const c = cl.cells[lk];
      if (c && cellAssessed(c)) { levels[lk] = c.level; n++; sum += c.level; } else levels[lk] = null;
    });
    const ct = clusterTrajectory(f.state, cl, f.state.lenses);
    const money = clusterMoney(f.state, cl, f.state.lenses);
    row.cells[f.id] = {
      ref: cl.ref || "", scored: n, avg: n ? sum / n : null, levels,
      trajectory: n && ct.known ? trajectoryLabel(ct) : null,
      weight: clusterEconomicWeight(f.state, cl.id),
      /* Money at risk is only meaningful once the country is fully scored:
         an unscored cell would otherwise be read as the worst case. */
      atRisk: money.hasValue && n === lensKeys.filter(lk => cl.cells[lk]).length ? money.atRisk : null
    };
  }));
  rows.forEach(r => {
    const avgs = frames.map(f => (r.cells[f.id] || {}).avg).filter(v => v !== null && v !== undefined);
    r.present = frames.filter(f => r.cells[f.id]).length;
    r.scoredIn = avgs.length;
    r.spread = avgs.length >= 2 ? Math.max.apply(null, avgs) - Math.min.apply(null, avgs) : null;
  });
  return { frames: frames.map(f => ({ id: f.id, label: f.label })), lensKeys, rows };
}

/* Every cluster × lens where scored countries sit at different levels,
   largest gap first. A gap of two levels or more is "material". */
function compareDifferences(cmp) {
  const out = [];
  cmp.rows.forEach(r => cmp.lensKeys.forEach(lk => {
    const vals = cmp.frames.map(f => ({ id: f.id, label: f.label, level: ((r.cells[f.id] || {}).levels || {})[lk] }))
      .filter(v => v.level !== null && v.level !== undefined);
    if (vals.length < 2) return;
    const hi = Math.max.apply(null, vals.map(v => v.level)), lo = Math.min.apply(null, vals.map(v => v.level));
    if (hi === lo) return;
    out.push({
      key: r.key + "|" + lk, cluster: r.name, ref: r.ref ? r.ref + "." + lk : "", lens: lk, gap: hi - lo, material: hi - lo >= 2,
      high: vals.filter(v => v.level === hi).map(v => v.label), low: vals.filter(v => v.level === lo).map(v => v.label),
      hi, lo, values: vals
    });
  }));
  return out.sort((a, b) => b.gap - a.gap || a.cluster.localeCompare(b.cluster));
}

/* ---- 2. Which roles exist where? --------------------------------- */
function roleState(r) { return r.unconfirmed ? "unconfirmed" : r.status; }

function compareRoles(frames) {
  const rows = [], byKey = {};
  frames.forEach(f => (f.state.clusters || []).forEach(cl => (cl.roles || []).forEach(r => {
    const k = r.ref || normName(r.title);
    let row = byKey[k] || byKey[normName(r.title)];
    if (!row) { row = { key: k, ref: r.ref || "", title: r.title, cluster: cl.name, route: routeRole(r), cells: {} }; rows.push(row); }
    byKey[k] = row; byKey[normName(r.title)] = row;
    row.cells[f.id] = roleState(r);
  })));
  rows.forEach(row => {
    const seen = frames.map(f => row.cells[f.id] || "none");
    const known = seen.filter(s => s !== "unconfirmed");
    row.differs = new Set(known).size > 1;
    row.anchor = row.route === "critical" || row.route === "dual";
    row.gapIn = frames.filter(f => row.cells[f.id] === "absent" || row.cells[f.id] === "thin").map(f => f.label);
  });
  const rank = r => (r.differs ? 0 : 2) + (r.anchor ? 0 : 1);
  return rows.sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title));
}

/* ---- 3. What have the other apps found, per country? -------------- */
function allFindings(state) {
  const out = [];
  (state.returns || []).forEach(ret => (ret.findings || []).forEach(f => out.push(Object.assign({ source_app: ret.source_app, return_id: ret.id }, f))));
  return out.concat(typedDecisionFindings(state));
}

function compareFindings(frames) {
  const per = frames.map(f => {
    const all = allFindings(f.state);
    return {
      id: f.id, label: f.label, total: all.length,
      decisions: all.filter(x => findingPage(x) === "decisions"),
      work: all.filter(x => findingPage(x) === "work"),
      people: all.filter(x => findingPage(x) === "people")
    };
  });
  return { per, any: per.some(p => p.total > 0) };
}

const GRADE_ORDER = { confirmed: 0, indicated: 1, hypothesis: 2 };
function strongestFirst(list) {
  return list.slice().sort((a, b) => (GRADE_ORDER[a.grade] === undefined ? 3 : GRADE_ORDER[a.grade]) - (GRADE_ORDER[b.grade] === undefined ? 3 : GRADE_ORDER[b.grade]));
}

/* ---- Normalise an imported return file ----------------------------
   Whatever the sending app wrote, only the agreed fields are kept, a
   grade outside the three is dropped rather than trusted, and nothing
   that could be a person's name or a key is carried by accident. */
/* Optional fields, added 2026-11-25, kept only when the file sends them:
   numbers behind a structural finding, and who decides and who is
   accountable on a decision. */
function returnExtras(f) {
  const out = {};
  if (f.kind !== "process_summary" && f.kind !== "role_family" && f.metrics && typeof f.metrics === "object") {
    const m = {};
    STRUCT_METRICS.forEach(k => { const n = econNum(f.metrics[k]); if (n !== null) m[k] = n; });
    if (Object.keys(m).length) out.metrics = m;
  }
  DECISION_FIELDS.forEach(k => { const v = String(f[k] || "").trim().slice(0, 80); if (v) out[k] = v; });
  if (f.accountable_contested === true) out.accountable_contested = true;
  /* SOP findings (2026-11-25): roles and dates as text, counts as numbers. */
  ["owner_role", "updated_by", "version_date", "last_reviewed", "review_due"].forEach(k => { const v = String(f[k] || "").trim().slice(0, 80); if (v) out[k] = v; });
  if (f.controlled_copy === true || f.controlled_copy === false) out.controlled_copy = f.controlled_copy;
  /* Process summaries (2026-11-25): the owner role, and counts as numbers. */
  { const v = String(f.process_owner || "").trim().slice(0, 80); if (v) out.process_owner = v; }
  if (f.kind === "role_family" && f.metrics && typeof f.metrics === "object") {
    const m = {};
    ["headcount", "job_titles"].forEach(k => { const n = econNum(f.metrics[k]); if (n !== null) m[k] = n; });
    if (Object.keys(m).length) out.metrics = m;
  }
  if (f.kind === "process_summary" && f.metrics && typeof f.metrics === "object") {
    const m = out.metrics || {};
    PROC_NUMBERS.forEach(k => { const n = econNum(f.metrics[k]); if (n !== null) m[k] = n; });
    if (Object.keys(m).length) out.metrics = m;
  }
  ["steps_governed", "steps_departing"].forEach(k => { const n = econNum(f[k]); if (n !== null) out[k] = Math.round(n); });
  return out;
}

function normaliseReturn(raw) {
  if (!raw || raw.format !== RETURN_FORMAT) throw new Error("This is not a findings file from one of the other apps (its format is not “compass-return”).");
  if (!/^1\./.test(String(raw.format_version || ""))) throw new Error("This findings file is version " + raw.format_version + "; this app reads version 1.");
  const findings = (Array.isArray(raw.findings) ? raw.findings : []).map(f => Object.assign({
    ref: String(f.ref || "").trim().slice(0, 40),
    kind: String(f.kind || "").trim().slice(0, 40),
    title: String(f.title || "").trim().slice(0, 300),
    detail: String(f.detail || "").trim().slice(0, 1200),
    grade: ["confirmed", "indicated", "hypothesis"].indexOf(f.grade) !== -1 ? f.grade : "",
    figure: String(f.figure || "").trim().slice(0, 160),
    relates_to: (Array.isArray(f.relates_to) ? f.relates_to : []).map(x => String(x).trim()).filter(Boolean).slice(0, 20),
    source_note: String(f.source_note || "").trim().slice(0, 400),
    topic: FINDING_TOPICS[f.topic] ? f.topic : "",
    reason_class: REASON_CLASSES[f.reason_class] ? f.reason_class : "",
    compared_with: String(f.compared_with || "").trim().slice(0, 60),
    cited: {}
  }, returnExtras(f))).filter(f => f.title);
  if (!findings.length) throw new Error("The file contains no findings.");
  return {
    id: "ret_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    format: RETURN_FORMAT, format_version: String(raw.format_version),
    source_app: String(raw.source_app || "").slice(0, 60),
    engagement_key: String(raw.engagement_key || "").slice(0, 20),
    country: String(raw.country || "").trim().slice(0, 60),
    generated_at: String(raw.generated_at || ""), imported_at: new Date().toISOString(),
    findings
  };
}

/* The cells in THIS workspace a finding points at (CAP-04.People → the
   cluster and lens), so it can be cited there in one click. */
function findingCells(state, f) {
  const out = [];
  (f.relates_to || []).forEach(x => {
    const m = /^([A-Z]+-\d+)\.(.+)$/.exec(x);
    if (!m) return;
    const cl = (state.clusters || []).find(c => c.ref === m[1]);
    if (cl && cl.cells[m[2]]) out.push({ clusterId: cl.id, lensKey: m[2], ref: x, name: cl.name });
  });
  return out;
}

/* ---- The EXCO readout: six pages, assembled not authored -----------
   Everything here is counted or quoted from the workspaces. The only
   words the owner writes are the verdict and the ask. */
function readoutModel(home, frames) {
  const cmp = compareFrames(frames);
  const diffs = compareDifferences(cmp);
  const roles = compareRoles(frames);
  const finds = compareFindings(frames);
  const classes = (home.comparison || {}).classes || {};
  const countries = frames.map(f => {
    const k = enterpriseKpis(f.state);
    let cells = 0, assessed = 0, sum = 0, weak = 0, stake = 0, atRisk = 0, valued = false;
    f.state.clusters.forEach(cl => {
      if (!inScope(cl)) return;   // context only: not part of this cycle's counts
      let clCells = 0, clDone = 0;
      f.state.lenses.forEach(l => {
        const c = cl.cells[l.key]; if (!c) return;
        cells++; clCells++;
        if (cellAssessed(c)) { assessed++; clDone++; sum += c.level; if (c.level <= 2) weak++; }
      });
      const m = clusterMoney(f.state, cl, f.state.lenses);
      if (m.hasValue && clDone === clCells) { valued = true; stake += m.stake; atRisk += m.atRisk; }
    });
    const vc = f.state.valueChain || {};
    return {
      id: f.id, label: f.label, key: (f.state.charter || {}).engagementKey || "", tier: unitTier(f.state),
      cells, assessed, scoredPct: cells ? Math.round((assessed / cells) * 100) : 0,
      avg: assessed ? sum / assessed : null, weak: assessed ? weak : null, grounded: k.groundedPct,
      money: valued ? { atRisk, stake, text: fmtMoney(f.state, atRisk), unit: (vc.currency || "") + "|" + (vc.value_unit || "") } : null,
      quickWins: f.state.clusters.reduce((a, cl) => a.concat(f.state.lenses.filter(l => (cl.cells[l.key] || {}).quick && cl.cells[l.key].quick.on)
        .map(l => ({ ref: (cl.ref || "") + "." + l.key, cluster: cl.name, lens: l.name, action: cl.cells[l.key].quick.action || "", owner: cl.cells[l.key].quick.owner || "" }))), []),
      econ: (() => { const e = ensureEconomics(JSON.parse(JSON.stringify({ economics: f.state.economics }))); return econEntered(e) ? { e, r: econRatios(e), unit: (vc.currency || "") + "|" + (vc.value_unit || ""), currency: vc.currency || "", value_unit: vc.value_unit || "" } : null; })(),
      structure: unitStructure(f.state),
      sops: sopSummary(f.state),
      processes: unitProcesses(f.state),
      data: Object.assign({}, f.state.dataFacts || {}),
      cellGrades: gradeCounts(cellGrades(f.state)),
      pilots: Object.keys(f.state.pilots || {}).filter(cid => f.state.pilots[cid].decision === "pilot")
        .map(cid => { const p = f.state.pilots[cid]; return { ref: p.ref || "", name: p.name || "", kpi: p.kpi || "" }; })
    };
  });
  const moneyUnits = new Set(countries.filter(c => c.money).map(c => c.money.unit));
  const byClass = { required: [], chosen: [], inherited: [], unclassified: [] };
  diffs.forEach(d => { const c = (classes[d.key] || {}).cls; (byClass[c] || byClass.unclassified).push(Object.assign({ note: (classes[d.key] || {}).note || "" }, d)); });
  return {
    cmp, diffs, roles, finds, countries, byClass,
    /* A single total only when every country uses the same currency and unit. */
    moneyComparable: moneyUnits.size === 1 && countries.every(c => c.money),
    econAny: countries.some(c => c.econ),
    econMissing: countries.filter(c => !c.econ).map(c => c.label),
    econSameMoney: new Set(countries.filter(c => c.econ).map(c => c.econ.unit)).size <= 1,
    econLabels: Array.from(new Set(countries.filter(c => c.econ).map(c => c.econ.e.volume_label).filter(Boolean))),
    structureAny: countries.some(c => c.structure),
    sopAny: countries.some(c => c.sops.n > 0),
    processAny: countries.some(c => c.processes.length > 0),
    families: familyComparison(frames),
    sharedVS: sharedValueStream(countries),
    sopOwnerDiffs: sopOwnerDifferences(frames),
    material: diffs.filter(d => d.material).length,
    roleGaps: roles.filter(r => r.anchor && r.gapIn.length),
    rolesDiffer: roles.filter(r => r.differs),
    unscored: countries.filter(c => c.assessed === 0).map(c => c.label),
    partScored: countries.filter(c => c.assessed > 0 && c.assessed < c.cells).map(c => c.label + " (" + c.scoredPct + "% of cells)")
  };
}

/* ============================================================
   Units to compare (owner review, 2026-11-21)

   The unit can be a country, a station, an asset or a business unit.
   The data field stays `country` (the other apps read it); only the
   words on screen change. Each unit has a tier: scored and mapped, or
   scored only (no process map by design).
   ============================================================ */
const UNIT_WORDS = {
  Country: ["country", "countries"], Station: ["station", "stations"],
  Asset: ["asset", "assets"], "Business unit": ["business unit", "business units"]
};
const UNIT_TIERS = {
  mapped: { label: "Scored and mapped", hint: "Scored here, and its process is mapped in Process Map Studio" },
  scored: { label: "Scored only", hint: "Scored here; no process map by design" }
};
function unitWordOf(state) {
  const w = ((state && state.comparison) || {}).unitWord;
  return UNIT_WORDS[w] ? w : "Country";
}
function unitWords(state) {
  const w = UNIT_WORDS[unitWordOf(state)];
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  return { one: w[0], many: w[1], One: cap(w[0]), Many: cap(w[1]) };
}
function unitTier(state) { return state && UNIT_TIERS[state.unitTier] ? state.unitTier : "mapped"; }

/* ---- Bringing frame changes into a unit ---------------------------
   The frame is edited in the home unit only. A unit sees what differs
   and chooses what to bring in. Only additions and renames are ever
   applied: nothing is deleted, and scores, role statuses, weights and
   amounts are never touched. */
function charterCore(ch) {
  ch = ch || {};
  return JSON.stringify([ch.thesis, ch.principles, ch.refModel, ch.criteria, ch.gate, ch.rules, ch.amendments, ch.lockedAt]);
}
function frameDiff(home, unit) {
  const items = [];
  const uCl = {}; (unit.clusters || []).forEach(c => { uCl[c.id] = c; });
  (home.clusters || []).forEach(hc => {
    const uc = uCl[hc.id];
    if (!uc) { items.push({ key: "cl+" + hc.id, kind: "Cluster added", label: (hc.ref ? hc.ref + " " : "") + hc.name }); return; }
    if (uc.name !== hc.name || (uc.desc || "") !== (hc.desc || "") || clusterScope(uc) !== clusterScope(hc))
      items.push({ key: "cl~" + hc.id, kind: "Cluster renamed or re-scoped", label: (uc.name !== hc.name ? uc.name + " → " : "") + hc.name + (clusterScope(uc) !== clusterScope(hc) ? " (" + SCOPE_META[clusterScope(hc)].label + ")" : "") });
    const uRoles = {}; (uc.roles || []).forEach(r => { uRoles[r.ref || r.id] = r; });
    (hc.roles || []).forEach(hr => {
      const ur = uRoles[hr.ref || hr.id];
      if (!ur) items.push({ key: "rl+" + hc.id + "|" + (hr.ref || hr.id), kind: "Role added", label: (hr.ref ? hr.ref + " " : "") + hr.title + " · " + hc.name });
      else if (ur.title !== hr.title) items.push({ key: "rl~" + hc.id + "|" + (hr.ref || hr.id), kind: "Role renamed", label: ur.title + " → " + hr.title });
    });
  });
  const hIds = {}; (home.clusters || []).forEach(c => { hIds[c.id] = true; });
  (unit.clusters || []).forEach(uc => { if (!hIds[uc.id]) items.push({ key: "cl-" + uc.id, kind: "No longer in the frame", label: uc.name + " (kept here; remove it by hand if it should go)", info: true }); });
  const uLv = {}; ((unit.valueChain || {}).levers || []).forEach(l => { uLv[l.id] = l; });
  ((home.valueChain || {}).levers || []).forEach(hl => {
    const ul = uLv[hl.id];
    if (!ul) items.push({ key: "lv+" + hl.id, kind: "Lever added", label: (hl.ref ? hl.ref + " " : "") + hl.name + " (weight 0 until set here)" });
    else if (ul.name !== hl.name || (ul.capability || "") !== (hl.capability || "") || ul.cluster_id !== hl.cluster_id)
      items.push({ key: "lv~" + hl.id, kind: "Lever renamed or re-mapped", label: hl.name });
  });
  if (home.charter && unit.charter && charterCore(home.charter) !== charterCore(unit.charter))
    items.push({ key: "charter", kind: "Charter amended", label: "Thesis, principles, criteria, gate or rules differ from the home unit" });
  return items;
}
function blankCellLike() {
  return { level: 1, status: "Not yet assessed", rationale: "", intervention: "", items: [], evidence: [], leading: [], watch: [], history: [], grade: "", last_updated: new Date().toISOString(), updated_by: "—" };
}
function applyFrameChanges(unit, home, keys) {
  const want = {}; (keys || []).forEach(k => { want[k] = true; });
  const copy = o => JSON.parse(JSON.stringify(o));
  (home.clusters || []).forEach(hc => {
    let uc = unit.clusters.find(c => c.id === hc.id);
    if (!uc && want["cl+" + hc.id]) {
      uc = copy(hc);
      Object.keys(uc.cells).forEach(k => { uc.cells[k] = blankCellLike(); });
      (uc.roles || []).forEach(r => { r.status = "exists"; r.unconfirmed = true; });
      unit.clusters.push(uc);
      return;
    }
    if (!uc) return;
    if (want["cl~" + hc.id]) {
      uc.name = hc.name; uc.desc = hc.desc || "";
      if (hc.scope) uc.scope = hc.scope; else delete uc.scope;
      if (hc.scope === "context") {
        uc.scope_reason = hc.scope_reason;
        unit.pilots = unit.pilots || {};
        unit.pilots[uc.id] = { decision: "out", reason: "Context only: " + hc.scope_reason, name: "", kpi: "", fromScope: true };
      } else {
        delete uc.scope_reason;
        if (unit.pilots && unit.pilots[uc.id] && unit.pilots[uc.id].fromScope) delete unit.pilots[uc.id];
      }
    }
    (hc.roles || []).forEach(hr => {
      const k = hc.id + "|" + (hr.ref || hr.id);
      const ur = (uc.roles || []).find(r => (r.ref || r.id) === (hr.ref || hr.id));
      if (!ur && want["rl+" + k]) { const nr = copy(hr); nr.status = "exists"; nr.unconfirmed = true; uc.roles = (uc.roles || []).concat([nr]); }
      else if (ur && want["rl~" + k]) ur.title = hr.title;
    });
  });
  unit.valueChain = unit.valueChain || { levers: [] };
  ((home.valueChain || {}).levers || []).forEach(hl => {
    const ul = unit.valueChain.levers.find(l => l.id === hl.id);
    if (!ul && want["lv+" + hl.id]) {
      const nl = copy(hl); nl.share_pct = 0; nl.figure = ""; delete nl.value_at_stake; nl.validated = false;
      unit.valueChain.levers.push(nl);
    } else if (ul && want["lv~" + hl.id]) { ul.name = hl.name; ul.capability = hl.capability || ""; ul.cluster_id = hl.cluster_id; }
  });
  if (want.charter && home.charter) {
    ["thesis", "principles", "refModel", "criteria", "gate", "rules", "amendments", "lockedAt", "lockedBy"].forEach(k => { unit.charter[k] = copy(home.charter[k]); });
  }
  /* Keep the ID counters ahead of everything brought in. */
  unit.idSeq = unit.idSeq || {};
  Object.keys(home.idSeq || {}).forEach(p => { unit.idSeq[p] = Math.max(unit.idSeq[p] || 0, home.idSeq[p]); });
  return unit;
}

/* ============================================================
   Five EXCO questions across units (owner review, 2026-11-25)

   A. Unit economics: revenue, manpower and non-manpower cost,
      head-count and one volume measure, entered by the owner per unit.
      Ratios are worked out, never typed. Amounts are in the workspace's
      currency and unit (Value Chain). Head-count and people cost can be
      taken from an Org Modeling file, and the owner can always overwrite.
   B. Structure: Org Modeling's structural findings, read as numbers.
   D. Decision rights: on paper, who decides in practice, and who is
      accountable, from Process Map Studio findings or typed by the owner.
   ============================================================ */
const ECON_AMOUNTS = ["revenue", "manpower_cost", "non_manpower_cost"];
const ECON_NUMBERS = ECON_AMOUNTS.concat(["headcount", "volume"]);
const STRUCT_METRICS = ["headcount", "managers", "manager_ratio_pct", "layers", "median_span", "spans_within",
  "spans_below", "spans_above", "single_report_managers", "health_score", "total_cost",
  /* 2026-11-26: people in supervisory titles with nobody reporting to them in the file. */
  "supervisors_no_reports"];
const DECISION_FIELDS = ["on_paper", "decided_by", "accountable"];

function econNum(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[, ]/g, ""));
  return isFinite(n) && n >= 0 ? n : null;
}
function blankEconomics(prev) {
  const p = prev || {};
  return { period: String(p.period || ""), volume_label: String(p.volume_label || ""),
    revenue: null, manpower_cost: null, non_manpower_cost: null, headcount: null, volume: null,
    validated: false, note: "", from: {} };
}
/* Make any stored value safe to read: unknown keys dropped, numbers checked. */
function ensureEconomics(state) {
  const e = state.economics && typeof state.economics === "object" && !Array.isArray(state.economics) ? state.economics : {};
  const out = blankEconomics(e);
  ECON_NUMBERS.forEach(k => { out[k] = econNum(e[k]); });
  out.validated = !!e.validated;
  out.note = String(e.note || "").slice(0, 400);
  out.from = {};
  if (e.from && typeof e.from === "object") ECON_NUMBERS.forEach(k => { if (typeof e.from[k] === "string" && e.from[k]) out.from[k] = e.from[k].slice(0, 120); });
  state.economics = out;
  return out;
}
function econEntered(e) { return !!e && ECON_NUMBERS.some(k => e[k] !== null && e[k] !== undefined); }

/* Every ratio needs both of its parts; a missing part gives null, never zero. */
function econRatios(e) {
  const v = k => (e && typeof e[k] === "number") ? e[k] : null;
  const rev = v("revenue"), mp = v("manpower_cost"), nmp = v("non_manpower_cost"), hc = v("headcount"), vol = v("volume");
  const div = (a, b) => (a !== null && b !== null && b > 0) ? a / b : null;
  const total = (mp !== null && nmp !== null) ? mp + nmp : null;
  return {
    total_cost: total,
    mp_share_cost: div(mp, total),
    mp_to_revenue: div(mp, rev),
    cost_to_revenue: div(total, rev),
    revenue_per_head: div(rev, hc),
    mp_cost_per_head: div(mp, hc),
    volume_per_head: div(vol, hc),
    cost_per_volume: div(total, vol),
    revenue_per_volume: div(rev, vol)
  };
}

/* Org Modeling sends a full amount (e.g. 41,200,000); the workspace keeps
   amounts in its own unit (e.g. m). */
function econScale(unit) {
  const u = String(unit || "").trim().toLowerCase();
  if (u === "k" || u === "thousand") return 1e3;
  if (u === "m" || u === "mn" || u === "million") return 1e6;
  if (u === "b" || u === "bn" || u === "billion") return 1e9;
  return 1;
}

/* Org Modeling's structural numbers for this unit, from its latest file.
   Read from the optional `metrics` object when present; otherwise from the
   figure and detail text that files written before 2026-11-25 carry. */
function parseStructureText(findings) {
  const m = {};
  const num = s => { const x = parseFloat(String(s).replace(/,/g, "")); return isFinite(x) ? x : null; };
  findings.forEach(f => {
    const fig = f.figure || "", det = f.detail || "", src = f.source_note || "";
    const people = /\((\d[\d,]*) people/.exec(src);
    if (people && m.headcount === undefined) m.headcount = num(people[1]);
    if (f.ref === "baseline.layers") { const x = /(\d+)\s*layers?/.exec(fig); if (x) m.layers = num(x[1]); }
    if (f.ref === "baseline.spans") {
      const x = /(\d+)\s*of\s*(\d+)\s*managers/.exec(fig); if (x) { m.spans_within = num(x[1]); m.managers = num(x[2]); }
      const b = /(\d+)\s*below,\s*(\d+)\s*above/.exec(det); if (b) { m.spans_below = num(b[1]); m.spans_above = num(b[2]); }
      const one = /(\d+)\s*managers have one direct report/.exec(det); if (one) m.single_report_managers = num(one[1]);
      const med = /Median span\s*([\d.]+)/.exec(det); if (med) m.median_span = num(med[1]);
    }
    if (f.ref === "baseline.health") { const x = /(\d+)\s*out of 100/.exec(fig); if (x) m.health_score = num(x[1]); }
  });
  return m;
}
function unitStructure(state) {
  const rets = (state.returns || []).filter(r => (r.findings || []).some(f => f.kind === "structural_baseline"));
  const ov = state.structureOverride && typeof state.structureOverride === "object" ? state.structureOverride : {};
  const typed = STRUCT_METRICS.filter(k => typeof ov[k] === "number");
  if (!rets.length && !typed.length) return null;
  let m = {}, base = [], ret = null;
  if (rets.length) {
    ret = rets.slice().sort((a, b) => String(b.imported_at).localeCompare(String(a.imported_at)))[0];
    base = ret.findings.filter(f => f.kind === "structural_baseline");
    m = parseStructureText(base);
    base.forEach(f => { if (f.metrics) STRUCT_METRICS.forEach(k => { if (typeof f.metrics[k] === "number") m[k] = f.metrics[k]; }); });
  }
  const imported = Object.assign({}, m);
  typed.forEach(k => { m[k] = ov[k]; });
  if (m.manager_ratio_pct === undefined && m.managers && m.headcount) m.manager_ratio_pct = Math.round(m.managers / m.headcount * 1000) / 10;
  const known = STRUCT_METRICS.filter(k => typeof m[k] === "number");
  if (!known.length) return null;
  return { metrics: m, known, imported, typed, imported_at: ret ? ret.imported_at : "", numeric: base.some(f => f.metrics) };
}

/* What Org Modeling can fill in on the economics card, already in the
   workspace's unit. People cost is base salary only: on-costs are not in it. */
function econSuggestions(state) {
  const st = unitStructure(state);
  if (!st) return {};
  const out = {};
  if (typeof st.metrics.headcount === "number") out.headcount = { value: st.metrics.headcount, from: "Org Modeling file (head-count)" };
  if (typeof st.metrics.total_cost === "number") {
    const scale = econScale((state.valueChain || {}).value_unit);
    out.manpower_cost = { value: Math.round(st.metrics.total_cost / scale * 100) / 100, from: "Org Modeling file (base salary only)" };
  }
  return out;
}

/* Decision rights on one finding: what the sending app said, unless the
   owner has typed over it. */
function decisionView(f) {
  const o = f.owner_edit || {};
  const pick = k => (typeof o[k] === "string" && o[k].trim()) ? o[k].trim() : (f[k] || "");
  const d = { on_paper: pick("on_paper"), decided_by: pick("decided_by"), accountable: pick("accountable"),
    contested: o.accountable_contested !== undefined ? !!o.accountable_contested : !!f.accountable_contested,
    edited: !!f.typed || DECISION_FIELDS.some(k => typeof o[k] === "string" && o[k].trim()) };
  const norm = s => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  d.split = !!(d.decided_by && d.accountable && norm(d.decided_by) !== norm(d.accountable));
  d.offPaper = !!(d.decided_by && d.on_paper && norm(d.decided_by) !== norm(d.on_paper));
  d.known = !!(d.on_paper || d.decided_by || d.accountable);
  return d;
}

/* ============================================================
   Sixth question: who owns and updates the SOPs (2026-11-25)

   Each unit keeps a short register of the SOPs that govern its work:
   the owner role, the role that updates it, its version date, when it was
   last reviewed, when the next review is due, and whether the copy in use
   is controlled. Entries are typed by the owner, or come from Process Map
   Studio as `sop` findings, which the owner can correct (the app's value
   is kept beside the correction). Roles only, never people's names.
   ============================================================ */
const SOP_TEXT = ["title", "governs", "owner_role", "updated_by", "version_date", "last_reviewed", "review_due", "note"];
const SOP_STALE_MONTHS = 24;

/* "2025-03-01", "2025-03" or "2025" → a date; anything else → null. */
function sopDate(s) {
  const m = /^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$/.exec(String(s || "").trim());
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], m[2] ? +m[2] - 1 : 0, m[3] ? +m[3] : 1));
  return isNaN(d) ? null : d;
}
function cleanSop(x, i) {
  const o = { id: String(x && x.id || ("sop_" + Date.now().toString(36) + (i || 0))).slice(0, 40) };
  SOP_TEXT.forEach(k => { o[k] = String((x || {})[k] || "").trim().slice(0, k === "note" ? 300 : 120); });
  o.controlled = (x || {}).controlled === true ? true : (x || {}).controlled === false ? false : null;
  return o;
}
function ensureSops(state) {
  state.sops = (Array.isArray(state.sops) ? state.sops : []).filter(x => x && typeof x === "object").map(cleanSop).filter(x => x.title);
  return state.sops;
}

/* One list per unit: the owner's own entries, then Process Map Studio's,
   each with any correction the owner made. */
function unitSops(state) {
  const out = (state.sops || []).map(x => Object.assign({ source: "manual" }, x));
  (state.returns || []).forEach(r => (r.findings || []).forEach((f, i) => {
    if (f.kind !== "sop") return;
    const o = f.owner_edit || {};
    const pick = k => (typeof o[k] === "string" && o[k].trim()) ? o[k].trim() : (f[k] || "");
    const row = { id: r.id + "|" + i, ref: f.ref || "", source: sourceAppName(r.source_app), return_id: r.id, index: i,
      title: pick("sop_title") || f.title, governs: (f.relates_to || []).filter(x => /^(VS|CAP)-\d+$/.test(x)).join(", "),
      edited: Object.keys(o).some(k => k !== "accountable_contested") };
    ["owner_role", "updated_by", "version_date", "last_reviewed", "review_due"].forEach(k => { row[k] = pick(k); });
    row.controlled = o.controlled_copy !== undefined ? o.controlled_copy : (f.controlled_copy === true ? true : f.controlled_copy === false ? false : null);
    row.steps_governed = typeof f.steps_governed === "number" ? f.steps_governed : null;
    row.steps_departing = typeof f.steps_departing === "number" ? f.steps_departing : null;
    out.push(row);
  }));
  return out;
}

/* What needs attention on one SOP, in words. `today` is passed in so the
   rules can be tested. */
function sopFlags(x, today) {
  const now = today || new Date();
  const flags = [];
  if (!x.owner_role) flags.push("no owner");
  if (!x.updated_by) flags.push("nobody named to update it");
  const due = sopDate(x.review_due), last = sopDate(x.last_reviewed) || sopDate(x.version_date);
  if (due && due < now) flags.push("review overdue");
  else if (!due && last && (now - last) > SOP_STALE_MONTHS * 30.44 * 864e5) flags.push("not reviewed in " + SOP_STALE_MONTHS / 12 + " years");
  else if (!due && !last) flags.push("no review date");
  if (x.controlled === false) flags.push("uncontrolled copy in use");
  if (typeof x.steps_departing === "number" && x.steps_departing > 0) flags.push(x.steps_departing + " step" + (x.steps_departing > 1 ? "s" : "") + " done differently");
  return flags;
}
function sopSummary(state, today) {
  const list = unitSops(state);
  const flagged = list.map(x => ({ x, flags: sopFlags(x, today) }));
  const n = list.length;
  return {
    n, list: flagged,
    owned: list.filter(x => x.owner_role).length,
    ownerUpdates: list.filter(x => x.owner_role && x.updated_by && x.owner_role.toLowerCase() === x.updated_by.toLowerCase()).length,
    current: flagged.filter(r => !r.flags.some(f => /overdue|not reviewed|no review date/.test(f))).length,
    controlled: list.filter(x => x.controlled === true).length,
    departing: list.reduce((a, x) => a + (typeof x.steps_departing === "number" ? x.steps_departing : 0), 0),
    attention: flagged.filter(r => r.flags.length).length
  };
}
/* The same SOP (by title) owned by different roles in different units. */
function sopOwnerDifferences(frames, today) {
  const byTitle = {};
  frames.forEach(f => unitSops(f.state).forEach(x => {
    const k = x.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!k) return;
    (byTitle[k] = byTitle[k] || { title: x.title, owners: {} }).owners[f.label] = x.owner_role || "no owner";
  }));
  return Object.values(byTitle).filter(t => Object.keys(t.owners).length > 1 && new Set(Object.values(t.owners).map(o => o.toLowerCase())).size > 1);
}

/* Structure typed or corrected by the owner wins over Org Modeling's. */
function ensureStructureOverride(state) {
  const o = state.structureOverride && typeof state.structureOverride === "object" && !Array.isArray(state.structureOverride) ? state.structureOverride : {};
  const out = {};
  STRUCT_METRICS.forEach(k => { const n = econNum(o[k]); if (n !== null) out[k] = n; });
  if (typeof o.note === "string" && o.note.trim()) out.note = o.note.trim().slice(0, 300);
  state.structureOverride = out;
  return out;
}

/* ============================================================
   Value streams per unit: the process owner, and how many steps and
   handoffs the work takes (owner review, 2026-11-25)

   Keyed by the value stream's ID (VS-nn), which is the same in every unit,
   so the same process lines up across units. Figures come from Process
   Map Studio's `process_summary` findings, or are typed by the owner; a
   typed figure wins and the app's is kept beside it. The process owner is
   a role, named per unit (it may differ between units).
   ============================================================ */
const PROC_NUMBERS = ["steps", "decisions", "approvals", "handoffs", "roles", "rework_loops", "work_min", "wait_min",
  /* 2026-11-26: the data backbone and the deviation share, per value stream. */
  "systems", "handoffs_manual", "off_system_steps", "no_record_steps", "steps_differing"];

function ensureProcessFacts(state) {
  const src = state.processFacts && typeof state.processFacts === "object" && !Array.isArray(state.processFacts) ? state.processFacts : {};
  const out = {};
  Object.keys(src).forEach(ref => {
    if (!/^VS-\d{1,4}$/.test(ref)) return;
    const x = src[ref] && typeof src[ref] === "object" ? src[ref] : {};
    const o = {};
    PROC_NUMBERS.forEach(k => { const n = econNum(x[k]); if (n !== null) o[k] = n; });
    ["process_owner", "note"].forEach(k => { if (typeof x[k] === "string" && x[k].trim()) o[k] = x[k].trim().slice(0, k === "note" ? 300 : 80); });
    if (Object.keys(o).length) out[ref] = o;
  });
  state.processFacts = out;
  return out;
}

/* Every value stream this unit has chosen or has figures for. */
function unitProcesses(state) {
  const typed = state.processFacts || {};
  const by = {};
  const get = ref => (by[ref] = by[ref] || { ref, name: "", imported: {}, typed: {}, facts: {}, process_owner: "", owner_from: "", source: "" });
  Object.keys(state.pilots || {}).forEach(cid => {
    const p = state.pilots[cid];
    if (p && p.decision === "pilot" && /^VS-\d+$/.test(p.ref || "")) get(p.ref).name = p.name || "";
  });
  (state.returns || []).forEach(r => (r.findings || []).forEach(f => {
    if (f.kind !== "process_summary") return;
    const ref = (f.relates_to || []).find(x => /^VS-\d+$/.test(x));
    if (!ref) return;
    const x = get(ref);
    if (!x.name) x.name = f.title || "";
    PROC_NUMBERS.forEach(k => { if (f.metrics && typeof f.metrics[k] === "number") x.imported[k] = f.metrics[k]; });
    if (f.process_owner) x.imported.process_owner = f.process_owner;
    x.source = sourceAppName(r.source_app);
  }));
  Object.keys(typed).forEach(ref => { get(ref).typed = typed[ref]; });
  return Object.values(by).map(x => {
    PROC_NUMBERS.forEach(k => { const v = typeof x.typed[k] === "number" ? x.typed[k] : x.imported[k]; if (typeof v === "number") x.facts[k] = v; });
    x.process_owner = x.typed.process_owner || x.imported.process_owner || "";
    x.owner_from = x.typed.process_owner ? "typed" : x.imported.process_owner ? x.source : "";
    x.known = PROC_NUMBERS.some(k => typeof x.facts[k] === "number");
    return x;
  }).sort((a, b) => a.ref.localeCompare(b.ref, undefined, { numeric: true }));
}

/* ============================================================
   Role families across units: which roles are common, which are unique,
   and why (owner review, 2026-11-25)

   Job titles differ between units, so roles are compared as families
   ("Load control", "Pricing"). Org Modeling defines the families once for
   the whole org file and gives each an `RF-nn` ID, so a family means the
   same thing in every unit; it sends one `role_family` finding per family
   per unit, with the head-count there (0 when nobody). The owner can also
   type families, and correct any head-count or reason. A family typed in
   the home unit is copied to new units with its head-count blank, to
   confirm there. Why a family is unique uses the same three words as
   every other difference: Required, Chosen, Inherited.
   ============================================================ */
const FAMILY_REASONS = ["required", "chosen", "inherited", "unknown"];
function famKey(ref, name) { return /^RF-\d+$/.test(ref || "") ? ref : "n:" + String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function cleanFamily(x, i) {
  const o = { id: String(x && x.id || ("rf_" + Date.now().toString(36) + (i || 0))).slice(0, 40) };
  o.name = String((x || {}).name || "").trim().slice(0, 100);
  o.ref = /^RF-\d{1,4}$/.test((x || {}).ref || "") ? x.ref : "";
  o.headcount = econNum((x || {}).headcount);
  o.reason_class = FAMILY_REASONS.indexOf((x || {}).reason_class) !== -1 ? x.reason_class : "";
  o.reason = String((x || {}).reason || "").trim().slice(0, 300);
  return o;
}
function ensureFamilies(state) {
  state.roleFamilies = (Array.isArray(state.roleFamilies) ? state.roleFamilies : []).filter(x => x && typeof x === "object").map(cleanFamily).filter(x => x.name);
  return state.roleFamilies;
}
/* One list per unit: typed families, then Org Modeling's, each with any
   correction. A typed family with the same ID or name as an imported one
   wins for the figures it gives. */
function unitFamilies(state) {
  const by = {};
  (state.returns || []).forEach(r => (r.findings || []).forEach((f, i) => {
    if (f.kind !== "role_family") return;
    const o = f.owner_edit || {};
    const k = famKey(f.ref, f.title);
    const hc = typeof o.headcount === "number" ? o.headcount : (f.metrics && typeof f.metrics.headcount === "number" ? f.metrics.headcount : null);
    by[k] = { key: k, ref: f.ref || "", name: f.title, headcount: hc, imported_headcount: f.metrics ? f.metrics.headcount : null,
      job_titles: f.metrics && typeof f.metrics.job_titles === "number" ? f.metrics.job_titles : null,
      reason_class: o.reason_class !== undefined ? o.reason_class : (f.reason_class || ""), reason: typeof o.reason === "string" ? o.reason : (f.detail || ""),
      source: sourceAppName(r.source_app), return_id: r.id, index: i, edited: Object.keys(o).length > 0 };
  }));
  (state.roleFamilies || []).forEach(x => {
    const k = famKey(x.ref, x.name), cur = by[k];
    if (cur) {
      if (x.headcount !== null) cur.headcount = x.headcount;
      if (x.reason_class) cur.reason_class = x.reason_class;
      if (x.reason) cur.reason = x.reason;
      cur.typed_id = x.id;
    } else by[k] = { key: k, ref: x.ref, name: x.name, headcount: x.headcount, reason_class: x.reason_class, reason: x.reason, source: "manual", id: x.id };
  });
  return Object.values(by).sort((a, b) => a.name.localeCompare(b.name));
}
/* Across units: present (head-count > 0), absent (0) or not known (blank).
   Only units with any family figures take part. */
function familyComparison(frames) {
  const units = frames.map(f => ({ label: f.label, fams: unitFamilies(f.state) })).filter(u => u.fams.some(x => x.headcount !== null));
  const all = {};
  units.forEach(u => u.fams.forEach(x => {
    const a = all[x.key] = all[x.key] || { key: x.key, ref: x.ref, name: x.name, per: {}, reasons: {} };
    a.per[u.label] = x.headcount;
    if (x.reason_class || x.reason) a.reasons[u.label] = { cls: x.reason_class, text: x.reason };
  }));
  const rows = Object.values(all).map(a => {
    const present = units.filter(u => typeof a.per[u.label] === "number" && a.per[u.label] > 0).map(u => u.label);
    const unknown = units.filter(u => typeof a.per[u.label] !== "number").map(u => u.label);
    const status = present.length === units.length ? "common" : present.length === 1 ? "unique" : present.length === 0 ? "none" : "some";
    return Object.assign(a, { present, unknown, status });
  });
  return { units: units.map(u => u.label), rows,
    common: rows.filter(r => r.status === "common"), some: rows.filter(r => r.status === "some"), unique: rows.filter(r => r.status === "unique"),
    unexplained: rows.filter(r => (r.status === "unique" || r.status === "some") && !r.present.concat(units.map(u => u.label)).some(l => r.reasons[l] && r.reasons[l].cls && r.reasons[l].cls !== "unknown")) };
}

/* ============================================================
   Calibrated round (owner review, 2026-11-26)

   The readout serves four design choices. Each page says which, and how
   strong its evidence is. Choice 4, the data and system backbone, gets
   three facts per unit and four counts per value stream; choice 1 gets
   the share of steps a unit runs differently from the reference; choice 3
   gets decisions the owner types by hand (e.g. who approves a local
   deviation, and how fast). Everything is typed or correctable.
   ============================================================ */
const DESIGN_CHOICES = {
  1: "Standardise or keep local",
  2: "Spans and layers",
  3: "Decision rights, standards and unique roles",
  4: "Data backbone"
};
/* Which design choices each readout page serves. */
const PAGE_CHOICES = { 1: [1, 2, 3, 4], 2: [1, 3, 4], 3: [3], 4: [2, 3], 5: [1, 3, 4], 6: [1, 2, 3, 4] };
const ONE_RECORD = { "": "Not known", none: "Not started", pilot: "Pilot", live: "Live" };
const DEVIATION_REFERENCE = "IATA audits: about 8% of procedures vary from the manual";

function ensureDataFacts(state) {
  const d = state.dataFacts && typeof state.dataFacts === "object" && !Array.isArray(state.dataFacts) ? state.dataFacts : {};
  const out = {};
  if (typeof d.cargo_system === "string" && d.cargo_system.trim()) out.cargo_system = d.cargo_system.trim().slice(0, 80);
  const e = econNum(d.eawb_pct); if (e !== null && e <= 100) out.eawb_pct = e;
  if (ONE_RECORD[d.one_record] && d.one_record) out.one_record = d.one_record;
  if (typeof d.note === "string" && d.note.trim()) out.note = d.note.trim().slice(0, 300);
  state.dataFacts = out;
  return out;
}

/* Count the grades behind a list of findings or cells. */
function gradeCounts(list) {
  const c = { confirmed: 0, indicated: 0, hypothesis: 0, none: 0 };
  (list || []).forEach(x => { c[GRADE_ORDER[x.grade] !== undefined ? x.grade : "none"]++; });
  return c;
}
function cellGrades(state) {
  const out = [];
  (state.clusters || []).forEach(cl => { if (!inScope(cl)) return; Object.values(cl.cells || {}).forEach(c => { if (cellAssessed(c)) out.push({ grade: c.grade || "" }); }); });
  return out;
}

/* Decisions typed by the owner, shaped like a decision-rights finding so
   they sit beside Process Map Studio's on page 3. */
function cleanDecision(x, i) {
  const o = { id: String(x && x.id || ("dec_" + Date.now().toString(36) + (i || 0))).slice(0, 40) };
  ["title", "on_paper", "decided_by", "accountable", "note"].forEach(k => { o[k] = String((x || {})[k] || "").trim().slice(0, k === "title" ? 200 : k === "note" ? 300 : 80); });
  o.days = econNum((x || {}).days);
  o.contested = (x || {}).contested === true;
  o.grade = GRADE_ORDER[(x || {}).grade] !== undefined ? x.grade : "";
  return o;
}
function ensureDecisions(state) {
  state.typedDecisions = (Array.isArray(state.typedDecisions) ? state.typedDecisions : []).filter(x => x && typeof x === "object").map(cleanDecision).filter(x => x.title);
  return state.typedDecisions;
}
function typedDecisionFindings(state) {
  return (state.typedDecisions || []).map(x => ({
    ref: "typed", kind: "decision", topic: "decision_right", title: x.title, detail: x.note || "", grade: x.grade,
    figure: typeof x.days === "number" ? x.days + " day" + (x.days === 1 ? "" : "s") + " to decide" : "",
    on_paper: x.on_paper, decided_by: x.decided_by, accountable: x.accountable, accountable_contested: x.contested,
    source_app: "typed", typed: true, typed_id: x.id, relates_to: []
  }));
}

/* The value stream most units have figures for: the one to line up on page 2. */
function sharedValueStream(countries) {
  const n = {};
  countries.forEach(c => c.processes.forEach(x => { if (x.known) n[x.ref] = (n[x.ref] || 0) + 1; }));
  return Object.keys(n).sort((a, b) => n[b] - n[a] || a.localeCompare(b, undefined, { numeric: true }))[0] || "";
}
