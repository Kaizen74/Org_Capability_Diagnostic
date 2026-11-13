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
  capacity: { label: "Capacity", page: "work" }
};
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
  return /different role|decid|decision|owner|approv|accountab|sign[- ]?off/i.test((f.title || "") + " " + (f.detail || ""));
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
    (s.valueChain.stages || []).forEach(st => { st.note = ""; });
    (s.valueChain.levers || []).forEach(l => { l.share_pct = 0; l.figure = ""; delete l.value_at_stake; l.validated = false; });
  }
  s.versions = []; s.changeLog = []; s.briefings = []; s.documents = []; s.analyses = [];
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
  return out;
}

function compareFindings(frames) {
  const per = frames.map(f => {
    const all = allFindings(f.state);
    const process = all.filter(x => (FINDING_KINDS[x.kind] || {}).page !== "roles");
    return {
      id: f.id, label: f.label, total: all.length,
      decisions: process.filter(isDecisionFinding),
      work: process.filter(x => !isDecisionFinding(x)),
      people: all.filter(x => (FINDING_KINDS[x.kind] || {}).page === "roles")
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
function normaliseReturn(raw) {
  if (!raw || raw.format !== RETURN_FORMAT) throw new Error("This is not a findings file from one of the other apps (its format is not “compass-return”).");
  if (!/^1\./.test(String(raw.format_version || ""))) throw new Error("This findings file is version " + raw.format_version + "; this app reads version 1.");
  const findings = (Array.isArray(raw.findings) ? raw.findings : []).map(f => ({
    ref: String(f.ref || "").trim().slice(0, 40),
    kind: String(f.kind || "").trim().slice(0, 40),
    title: String(f.title || "").trim().slice(0, 300),
    detail: String(f.detail || "").trim().slice(0, 1200),
    grade: ["confirmed", "indicated", "hypothesis"].indexOf(f.grade) !== -1 ? f.grade : "",
    figure: String(f.figure || "").trim().slice(0, 160),
    relates_to: (Array.isArray(f.relates_to) ? f.relates_to : []).map(x => String(x).trim()).filter(Boolean).slice(0, 20),
    source_note: String(f.source_note || "").trim().slice(0, 400),
    cited: {}
  })).filter(f => f.title);
  if (!findings.length) throw new Error("The file contains no findings.");
  return {
    id: "ret_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    format: RETURN_FORMAT, format_version: String(raw.format_version),
    source_app: String(raw.source_app || "").slice(0, 60),
    engagement_key: String(raw.engagement_key || "").slice(0, 20),
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
      id: f.id, label: f.label, key: (f.state.charter || {}).engagementKey || "",
      cells, assessed, scoredPct: cells ? Math.round((assessed / cells) * 100) : 0,
      avg: assessed ? sum / assessed : null, weak: assessed ? weak : null, grounded: k.groundedPct,
      money: valued ? { atRisk, stake, text: fmtMoney(f.state, atRisk), unit: (vc.currency || "") + "|" + (vc.value_unit || "") } : null,
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
    material: diffs.filter(d => d.material).length,
    roleGaps: roles.filter(r => r.anchor && r.gapIn.length),
    rolesDiffer: roles.filter(r => r.differs),
    unscored: countries.filter(c => c.assessed === 0).map(c => c.label)
  };
}
