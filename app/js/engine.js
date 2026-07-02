/* ============================================================
   Capability Compass — Predictive Engine
   Pure functions: momentum, forecasting, classification,
   confidence, and aggregate indices. No DOM access here.

   Momentum model (directionally predictive, transparent):
   - Historical component: level change vs the most recent saved
     version, clamped to [-1, +1].
   - Leading-indicator component: mean of user-maintained leading
     indicator signals (improving = +1, stable = 0, declining = -1).
   - Blend: 50/50 when both exist; otherwise whichever exists.
   The blend is deliberately simple and inspectable — every score
   can be explained to a board in one sentence.
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

/* Momentum score in [-1, +1] for a single cell. */
function cellMomentum(state, cluster, lensKey) {
  const cell = cluster.cells[lensKey];
  const prev = priorLevel(state, cluster.id, lensKey);
  const hasHist = prev !== null && prev !== undefined;
  const hist = hasHist ? clamp(cell.level - prev, -1, 1) : 0;

  const leads = (cell.leading || []).filter(l => l.signal in SIGNAL_VALUE);
  const hasLead = leads.length > 0;
  const lead = hasLead ? leads.reduce((a, l) => a + SIGNAL_VALUE[l.signal], 0) / leads.length : 0;

  if (hasHist && hasLead) return clamp(0.5 * hist + 0.5 * lead, -1, 1);
  if (hasHist) return hist;
  if (hasLead) return lead;
  return 0;
}

/* Momentum descriptor: symbol + word, always paired (never colour-only). */
function momentumLabel(m) {
  if (m >= 0.25) return { sym: "↗", word: "Improving", dir: 1 };
  if (m <= -0.25) return { sym: "↘", word: "At risk", dir: -1 };
  return { sym: "→", word: "Stable", dir: 0 };
}

/* Projected level over the next two review cycles. */
function projectedLevel(cell, m) {
  let delta = 0;
  if (m >= 0.25) delta = 1;
  else if (m <= -0.25) delta = -1;
  return clamp(cell.level + delta, 1, 4);
}

/* Trajectory classification — the predictive vocabulary of the app. */
function classifyCell(cell, m) {
  if (cell.level >= 3 && m <= -0.25) return "erosion";      // strength being lost
  if (cell.level <= 2 && m >= 0.25) return "breakout";      // weakness on the move
  if (cell.level <= 2 && m > -0.25 && m < 0.25) return "stalled"; // weak and static
  if (cell.level <= 2 && m <= -0.25) return "critical";     // weak and worsening
  if (cell.level === 4 && m >= 0) return "compounding";     // strength holding
  return "steady";
}

const CLASS_META = {
  critical:    { label: "Weak & declining", order: 0 },
  erosion:     { label: "Erosion risk", order: 1 },
  stalled:     { label: "Stalled weakness", order: 2 },
  breakout:    { label: "Breakout underway", order: 3 },
  steady:      { label: "Steady", order: 4 },
  compounding: { label: "Compounding strength", order: 5 }
};

/* Evidence confidence: grounding guardrail. */
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

function clusterMomentum(state, cluster, lenses) {
  const ms = lenses.map(l => (cluster.cells[l.key] ? cellMomentum(state, cluster, l.key) : null)).filter(v => v !== null);
  if (!ms.length) return 0;
  return ms.reduce((a, b) => a + b, 0) / ms.length;
}

function clusterProjectedAvg(state, cluster, lenses) {
  const lv = lenses.map(l => {
    const cell = cluster.cells[l.key];
    if (!cell) return null;
    return projectedLevel(cell, cellMomentum(state, cluster, l.key));
  }).filter(v => v !== null);
  if (!lv.length) return 0;
  return lv.reduce((a, b) => a + b, 0) / lv.length;
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

/* Enterprise KPIs for the header strip. */
function enterpriseKpis(state) {
  const { clusters, lenses } = state;
  let sum = 0, n = 0, weak = 0, grounded = 0, msum = 0;
  const alerts = { erosion: [], breakout: [], stalled: [], critical: [] };
  clusters.forEach(cl => {
    lenses.forEach(l => {
      const cell = cl.cells[l.key];
      if (!cell) return;
      n++;
      sum += cell.level;
      if (cell.level <= 2) weak++;
      if (cellConfidence(cell).grounded) grounded++;
      const m = cellMomentum(state, cl, l.key);
      msum += m;
      const cls = classifyCell(cell, m);
      if (alerts[cls]) alerts[cls].push({ cluster: cl, lens: l, cell, m });
    });
  });
  return {
    avg: n ? sum / n : 0,
    cells: n,
    weak,
    velocity: n ? msum / n : 0,
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
