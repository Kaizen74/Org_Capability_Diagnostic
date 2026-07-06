/* ============================================================
   Capability Compass — Predictive Engine
   Pure functions: trajectory, forecasting, classification,
   confidence, evidence mix, cross-lens patterns, aggregates.
   No DOM access here.

   Methodology (capability-compass-rubric v4 — prediction honesty):
   - Direction, never dates-and-points: outputs are conditional
     vectors, not point forecasts.
   - Trajectory requires qualifying evidence: version-over-version
     movement and/or user-maintained leading indicators. With
     neither, the trajectory is UNKNOWN — rendered honestly,
     never guessed as "stable".
   - Confidence is mechanical, about evidence not conviction:
     High   = history + ≥2 leading indicators agree(able)
     Medium = history OR ≥1 leading indicator
     (unknown cells carry no confidence at all)
   - Cells whose evidence is all rear-view (sources but no leading
     indicators) are flagged evidence_mix: lagging and capped at
     Medium confidence.
   ============================================================ */

const SIGNAL_VALUE = { improving: 1, stable: 0, declining: -1 };

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function latestVersion(state) {
  if (!state.versions || state.versions.length === 0) return null;
  return state.versions[state.versions.length - 1];
}

function priorLevel(state, clusterId, lensKey) {
  const v = latestVersion(state);
  if (!v) return null;
  const cl = v.snapshot.clusters.find(c => c.id === clusterId);
  if (!cl || !cl.cells[lensKey]) return null;
  return cl.cells[lensKey].level;
}

/* ---------- Trajectory (the predictive channel) ----------
   Returns { m, known, confidence, basis }:
   m          momentum in [-1, +1] (0 when unknown)
   known      false when there is NO qualifying evidence
   confidence "High" | "Medium" | "None"
   basis      human-readable one-liner of what the call rests on */
function cellTrajectory(state, cluster, lensKey) {
  const cell = cluster.cells[lensKey];
  const prev = priorLevel(state, cluster.id, lensKey);
  const hasHist = prev !== null && prev !== undefined;
  const hist = hasHist ? clamp(cell.level - prev, -1, 1) : 0;

  const leads = (cell.leading || []).filter(l => l.signal in SIGNAL_VALUE);
  const hasLead = leads.length > 0;
  const lead = hasLead ? leads.reduce((a, l) => a + SIGNAL_VALUE[l.signal], 0) / leads.length : 0;

  const known = hasHist || hasLead;
  let m = 0;
  if (hasHist && hasLead) m = clamp(0.5 * hist + 0.5 * lead, -1, 1);
  else if (hasHist) m = hist;
  else if (hasLead) m = lead;

  let confidence = "None";
  if (known) {
    confidence = (hasHist && leads.length >= 2) ? "High" : "Medium";
    // Rear-view-only evidence caps confidence (rubric: lagging photograph)
    if (evidenceMix(cell) === "lagging" && confidence === "High") confidence = "Medium";
  }

  const parts = [];
  if (hasHist) parts.push("movement since " + (latestVersion(state).version || "last snapshot"));
  if (hasLead) parts.push(leads.length + " leading indicator" + (leads.length > 1 ? "s" : ""));
  return { m, known, confidence, basis: parts.join(" + ") || "no qualifying evidence" };
}

/* Legacy numeric accessor (kept for aggregates/tests). */
function cellMomentum(state, cluster, lensKey) {
  return cellTrajectory(state, cluster, lensKey).m;
}

/* Trajectory descriptor: symbol + word, always paired (never colour-only).
   Unknown renders honestly — a "?" and the word, no fabricated arrow. */
function trajectoryLabel(t) {
  if (!t.known) return { sym: "?", word: "Unknown", dir: 0 };
  if (t.m >= 0.25) return { sym: "↗", word: "Improving", dir: 1 };
  if (t.m <= -0.25) return { sym: "↘", word: "At risk", dir: -1 };
  return { sym: "→", word: "Stable", dir: 0 };
}
/* Numeric variant for aggregate values that are known by construction. */
function momentumLabel(m) { return trajectoryLabel({ m: m, known: true }); }

/* Conditional projection over the next two review cycles.
   Unknown trajectory → no projection (never guess). */
function projectedLevel(cell, t) {
  if (!t.known) return cell.level;
  let delta = 0;
  if (t.m >= 0.25) delta = 1;
  else if (t.m <= -0.25) delta = -1;
  return clamp(cell.level + delta, 1, 4);
}

/* Evidence mix per rubric v4: leading | lagging | both | none. */
function evidenceMix(cell) {
  const hasLead = (cell.leading || []).length > 0;
  const hasSrc = (cell.evidence || []).length > 0;
  if (hasLead && hasSrc) return "both";
  if (hasLead) return "leading";
  if (hasSrc) return "lagging";
  return "none";
}

/* Trajectory classification — the early-warning vocabulary. */
function classifyCell(cell, t) {
  if (!t.known) return "unassessed";
  if (cell.level <= 2 && t.m <= -0.25) return "critical";
  if (cell.level >= 3 && t.m <= -0.25) return "erosion";
  if (cell.level <= 2 && t.m >= 0.25) return "breakout";
  if (cell.level <= 2) return "stalled";
  if (cell.level === 4 && t.m >= 0) return "compounding";
  return "steady";
}

const CLASS_META = {
  critical:    { label: "Weak & declining", order: 0 },
  erosion:     { label: "Erosion risk", order: 1 },
  stalled:     { label: "Stalled weakness", order: 2 },
  breakout:    { label: "Breakout underway", order: 3 },
  steady:      { label: "Steady", order: 4 },
  compounding: { label: "Compounding strength", order: 5 },
  unassessed:  { label: "Direction unknown", order: 6 }
};

/* Evidence confidence (grounding guardrail — sources cited). */
function cellConfidence(cell) {
  const n = (cell.evidence || []).length;
  if (n === 0) return { key: "unsupported", label: "Unsupported", grounded: false };
  if (n === 1) return { key: "low", label: "1 source", grounded: true };
  return { key: "ok", label: n + " sources", grounded: true };
}

/* ---------- Aggregates ---------- */

function clusterAvg(cluster, lenses) {
  const lv = lenses.map(l => (cluster.cells[l.key] ? cluster.cells[l.key].level : null)).filter(v => v !== null);
  if (!lv.length) return 0;
  return lv.reduce((a, b) => a + b, 0) / lv.length;
}

function clusterWeakCount(cluster, lenses) {
  return lenses.filter(l => cluster.cells[l.key] && cluster.cells[l.key].level <= 2).length;
}

/* Cluster trajectory: averaged over cells with KNOWN direction only. */
function clusterTrajectory(state, cluster, lenses) {
  const ts = lenses.map(l => (cluster.cells[l.key] ? cellTrajectory(state, cluster, l.key) : null)).filter(Boolean);
  const known = ts.filter(t => t.known);
  if (!known.length) return { m: 0, known: false, knownCount: 0, total: ts.length };
  return {
    m: known.reduce((a, t) => a + t.m, 0) / known.length,
    known: true, knownCount: known.length, total: ts.length
  };
}
/* Legacy numeric accessor. */
function clusterMomentum(state, cluster, lenses) { return clusterTrajectory(state, cluster, lenses).m; }

function clusterProjectedAvg(state, cluster, lenses) {
  const lv = lenses.map(l => {
    const cell = cluster.cells[l.key];
    if (!cell) return null;
    return projectedLevel(cell, cellTrajectory(state, cluster, l.key));
  }).filter(v => v !== null);
  if (!lv.length) return 0;
  return lv.reduce((a, b) => a + b, 0) / lv.length;
}

/* The binding constraint (rubric workflow #6): the lowest-level cell
   with a down or flat/unknown trajectory — not simply the lowest level.
   Improving cells are already being fixed; the constraint is what
   is weak AND not moving. */
function bindingConstraint(state, cluster, lenses) {
  let best = null;
  lenses.forEach(l => {
    const cell = cluster.cells[l.key];
    if (!cell) return;
    const t = cellTrajectory(state, cluster, l.key);
    const moving = t.known && t.m >= 0.25;
    const cand = { lensKey: l.key, lensName: l.name, cell, t, moving };
    if (!best) { best = cand; return; }
    // Prefer non-moving over moving; then lower level; then worse momentum.
    if (best.moving !== cand.moving) { if (!cand.moving) best = cand; return; }
    if (cand.cell.level !== best.cell.level) { if (cand.cell.level < best.cell.level) best = cand; return; }
    if (cand.t.m < best.t.m) best = cand;
  });
  return best;
}

/* Weakest-first sort for the Priority Board:
   avg level ascending, tie-break by count of L<=2 descending. */
function sortWeakestFirst(clusters, lenses) {
  return [...clusters].sort((a, b) => {
    const d = clusterAvg(a, lenses) - clusterAvg(b, lenses);
    if (Math.abs(d) > 1e-9) return d;
    return clusterWeakCount(b, lenses) - clusterWeakCount(a, lenses);
  });
}

/* Cross-lens interdependency patterns (rubric indicator library).
   Deterministic, evidence-based risk flags across lenses in one cluster. */
function detectCrossLensPatterns(state) {
  const out = [];
  state.clusters.forEach(cl => {
    const cells = cl.cells;
    const people = cells.People, process = cells.Process, structure = cells.Structure, culture = cells.Culture;
    if (people && process && people.level <= 2 && process.level >= 3) {
      out.push({
        clusterId: cl.id, cluster: cl.name, key: "bench-starves-rollout",
        title: "Bench-starves-rollout risk",
        body: "People at L" + people.level + " while Process sits at L" + process.level + ". Rollouts rarely hold an improving trajectory beyond two quarters when the bench running them is this thin — the Process rating is at risk of stalling."
      });
    }
    if (structure && people && structure.level === 4 && people.level <= 2) {
      out.push({
        clusterId: cl.id, cluster: cl.name, key: "structure-without-people",
        title: "Structure without people is scaffolding",
        body: "Structure at L4 with People at L" + people.level + ". The architecture headline masks execution risk — the priority move belongs to People."
      });
    }
    if (process && culture) {
      const tp = cellTrajectory(state, cl, "Process");
      const tc = cellTrajectory(state, cl, "Culture");
      if (tp.known && tc.known && tp.m >= 0.25 && tc.m <= -0.25) {
        out.push({
          clusterId: cl.id, cluster: cl.name, key: "adoption-red-flag",
          title: "Adoption red flag",
          body: "Process is improving while Culture is declining in the same cluster. Culture normally lags process change — but declining during change signals an adoption problem, not normal lag."
        });
      }
    }
  });
  return out;
}

/* Enterprise KPIs for the header strip. */
function enterpriseKpis(state) {
  const { clusters, lenses } = state;
  let sum = 0, n = 0, weak = 0, grounded = 0, msum = 0, knownCount = 0, laggingOnly = 0;
  const alerts = { erosion: [], breakout: [], stalled: [], critical: [], unassessed: [] };
  clusters.forEach(cl => {
    lenses.forEach(l => {
      const cell = cl.cells[l.key];
      if (!cell) return;
      n++;
      sum += cell.level;
      if (cell.level <= 2) weak++;
      if (cellConfidence(cell).grounded) grounded++;
      if (evidenceMix(cell) === "lagging") laggingOnly++;
      const t = cellTrajectory(state, cl, l.key);
      if (t.known) { msum += t.m; knownCount++; }
      const cls = classifyCell(cell, t);
      if (alerts[cls]) alerts[cls].push({ cluster: cl, lens: l, cell, t, m: t.m });
    });
  });
  return {
    avg: n ? sum / n : 0,
    cells: n,
    weak,
    velocity: knownCount ? msum / knownCount : 0,
    velocityKnown: knownCount > 0,
    unknownCount: n - knownCount,
    unknownPct: n ? Math.round(((n - knownCount) / n) * 100) : 0,
    laggingOnly,
    groundedPct: n ? Math.round((grounded / n) * 100) : 0,
    alerts
  };
}

/* Delta between a saved version snapshot and the current state. */
function computeDelta(snapshotClusters, currentClusters) {
  const rows = [];
  currentClusters.forEach(cl => {
    const old = snapshotClusters.find(c => c.id === cl.id);
    Object.keys(cl.cells).forEach(lk => {
      const cur = cl.cells[lk];
      const prev = old && old.cells[lk];
      if (!prev) {
        rows.push({ cluster: cl, lensKey: lk, kind: "added", from: null, to: cur.level, cell: cur });
      } else if (prev.level !== cur.level || prev.status !== cur.status) {
        rows.push({
          cluster: cl, lensKey: lk,
          kind: prev.level === cur.level ? "reworded" : (cur.level > prev.level ? "up" : "down"),
          from: prev.level, to: cur.level, cell: cur, prevStatus: prev.status
        });
      }
    });
  });
  snapshotClusters.forEach(old => {
    if (!currentClusters.find(c => c.id === old.id)) {
      Object.keys(old.cells).forEach(lk => {
        rows.push({ cluster: old, lensKey: lk, kind: "removed", from: old.cells[lk].level, to: null, cell: old.cells[lk] });
      });
    }
  });
  const kindOrder = { down: 0, removed: 1, up: 2, added: 3, reworded: 4 };
  rows.sort((a, b) => (kindOrder[a.kind] ?? 9) - (kindOrder[b.kind] ?? 9));
  return rows;
}

function fmt1(v) { return (Math.round(v * 10) / 10).toFixed(1); }
function fmtSigned(v) {
  const r = Math.round(v * 100) / 100;
  return (r > 0 ? "+" : "") + r.toFixed(2);
}
