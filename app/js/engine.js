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

/* ============================================================
   Role rubric — two axes, four routes
   Axis A "Criticality Index": weighted strategic leverage + market
   scarcity. Axis B "Tacit-Knowledge Intensity": how hard the role is
   to REBUILD internally, regardless of hiring. They are different
   risks with different fixes — succession bench vs knowledge capture —
   which is exactly what a seniority-only or scarcity-only view misses.
   ============================================================ */

const AXIS_A_WEIGHTS = [
  { key: "impact", label: "Strategic impact (P&L / ambition)", wt: 0.30 },
  { key: "scarcity", label: "Market scarcity / replaceability", wt: 0.25 },
  { key: "vacancy", label: "Vacancy risk (safety, licence, contract)", wt: 0.20 },
  { key: "pivotal", label: "Value-chain pivotalness (choke point)", wt: 0.15 },
  { key: "futurefit", label: "Future-fit (accelerating trend)", wt: 0.10 }
];

const TKI_FACTORS = [
  { key: "time", label: "Time-to-competence (years vs weeks)" },
  { key: "codifiability", label: "Codifiability (in-person vs SOP)" },
  { key: "concentration", label: "Concentration / bus-factor" },
  { key: "consequence", label: "Consequence of inexperience" },
  { key: "relationship", label: "Relationship / context capital" }
];

/* Both thresholds are explicit and shown in the UI so the routing is
   auditable rather than a black box. */
const HIGH_LEVERAGE = 3.5;
const HIGH_TACIT = 3.5;

function criticalityIndex(role) {
  if (!role || !role.axisA) return 0;
  return AXIS_A_WEIGHTS.reduce((a, w) => a + (role.axisA[w.key] || 0) * w.wt, 0);
}

function tkiScore(role) {
  if (!role || !role.tki) return 0;
  const vals = TKI_FACTORS.map(f => role.tki[f.key] || 0);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function routeRole(role) {
  const idx = criticalityIndex(role), tki = tkiScore(role);
  const hiL = idx >= HIGH_LEVERAGE, hiT = tki >= HIGH_TACIT;
  if (hiL && hiT) return "dual";
  if (hiL) return "critical";
  if (hiT) return "specialist";
  return "standard";
}

const ROUTE_META = {
  critical:   { label: "Critical role", fix: "Succession bench — acquire or build ahead of need.", order: 1 },
  dual:       { label: "Dual-critical", fix: "Succession bench AND knowledge capture — a successor name alone is insufficient.", order: 0 },
  specialist: { label: "Specialist / key-person", fix: "Knowledge transfer, apprenticeship, retention — not the leadership succession list.", order: 2 },
  standard:   { label: "Standard population", fix: "Productivity, automation, standard resourcing.", order: 3 }
};

const STATUS_META = {
  exists: { label: "Exists", cls: "good" },
  thin:   { label: "Thin bench", cls: "warn" },
  absent: { label: "Absent", cls: "warn" }
};

function roleSummary(role) {
  const idx = criticalityIndex(role), tki = tkiScore(role), route = routeRole(role);
  return { idx, tki, route, meta: ROUTE_META[route], status: STATUS_META[role.status] || STATUS_META.exists };
}

/* Anchor-seat coverage for a cluster: of the roles that route to
   critical/dual, how many actually exist today? Absent anchor seats are
   structural findings, not opinions. */
function roleCoverage(cluster) {
  const roles = cluster.roles || [];
  const anchors = roles.filter(r => ["critical", "dual"].indexOf(routeRole(r)) !== -1);
  const exists = anchors.filter(r => r.status === "exists").length;
  const gaps = anchors.filter(r => r.status !== "exists");
  return {
    total: roles.length, anchors: anchors.length, exists, gaps,
    pct: anchors.length ? Math.round((exists / anchors.length) * 100) : null
  };
}

/* Enterprise key-person register: high-tacit roles across all clusters,
   ranked by how irreplaceable they are internally. */
function keyPersonRegister(state) {
  const rows = [];
  state.clusters.forEach(cl => {
    (cl.roles || []).forEach(r => {
      const s = roleSummary(r);
      if (s.route === "specialist" || s.route === "dual") rows.push({ cluster: cl, role: r, ...s });
    });
  });
  return rows.sort((a, b) => b.tki - a.tki || b.idx - a.idx);
}

function criticalRoleRegister(state) {
  const rows = [];
  state.clusters.forEach(cl => {
    (cl.roles || []).forEach(r => {
      const s = roleSummary(r);
      if (s.route === "critical" || s.route === "dual") rows.push({ cluster: cl, role: r, ...s });
    });
  });
  const statusRank = { absent: 0, thin: 1, exists: 2 };
  return rows.sort((a, b) => statusRank[a.role.status] - statusRank[b.role.status] || b.idx - a.idx);
}

/* ============================================================
   Value chain — follow the money
   Economic weight per cluster comes from the P&L levers mapped to it.
   Value exposure = how much of the money rides on a capability that
   is not yet strong. This is what turns "weakest first" into
   "weakest where it costs most first".
   ============================================================ */

function clusterEconomicWeight(state, clusterId) {
  const levers = ((state.valueChain || {}).levers) || [];
  return levers.filter(l => l.cluster_id === clusterId)
    .reduce((a, l) => a + (l.share_pct || 0), 0);
}

function hasValueChain(state) {
  return (((state.valueChain || {}).levers) || []).some(l => l.cluster_id && l.share_pct > 0);
}

/* Exposure index 0-100: economic weight × capability gap fraction. */
function clusterValueExposure(state, cluster, lenses) {
  const weight = clusterEconomicWeight(state, cluster.id);
  const gap = Math.max(0, (4 - clusterAvg(cluster, lenses)) / 3);
  return { weight, gap, exposure: weight * gap };
}

/* ============================================================
   Value chain → cluster CALIBRATION
   The value chain is not only grounding context. It is the test of
   whether the cluster set itself is the right one for THIS
   organisation's economics:
     - money with no cluster is an accountability gap;
     - a cluster with no money is a category, not a priority — very
       often an industry-preset default that does not fit;
     - one cluster carrying a third of the P&L across several
       distinct levers is usually two clusters wearing one name.
   These are deterministic, checkable findings — never auto-applied.
   The user approves every structural change.
   ============================================================ */

const CALIB_MIN_LEVER = 3;      // below this share a lever is noise, not a finding
const CALIB_SPLIT_WEIGHT = 30;  // one cluster carrying this much across ≥2 levers
const CALIB_COVERAGE_MIN = 80;  // % of weight that must have a capability owner

function valueChainCoverage(state) {
  const levers = ((state.valueChain || {}).levers) || [];
  const total = levers.reduce((a, l) => a + (l.share_pct || 0), 0);
  const mapped = levers.filter(l => l.cluster_id).reduce((a, l) => a + (l.share_pct || 0), 0);
  return {
    levers: levers.length, weighted: levers.filter(l => (l.share_pct || 0) > 0).length,
    total, mapped, unmapped: total - mapped,
    pct: total ? Math.round((mapped / total) * 100) : 0
  };
}

function clusterLevers(state, clusterId) {
  return (((state.valueChain || {}).levers) || []).filter(l => l.cluster_id === clusterId);
}

/* Materiality of one cluster: economic weight, share of the mapped
   weight, and rank. This is what the Signal Matrix shows per row so
   the analytical read is never money-blind. */
function clusterMateriality(state, cluster) {
  const cov = valueChainCoverage(state);
  const weight = clusterEconomicWeight(state, cluster.id);
  const weights = state.clusters.map(c => clusterEconomicWeight(state, c.id)).sort((a, b) => b - a);
  return {
    weight,
    share: cov.mapped ? Math.round((weight / cov.mapped) * 100) : 0,
    rank: weights.indexOf(weight) + 1,
    of: state.clusters.length,
    levers: clusterLevers(state, cluster.id),
    mapped: cov.mapped > 0
  };
}

/* The calibration findings themselves. */
function calibrateClusters(state) {
  const out = [];
  const levers = ((state.valueChain || {}).levers) || [];
  if (!levers.length) return out;
  const cov = valueChainCoverage(state);

  // 1. Money with no capability owner — the accountability gap.
  levers.forEach(l => {
    if (l.cluster_id || (l.share_pct || 0) < CALIB_MIN_LEVER) return;
    out.push({
      key: "orphan-lever", severity: "high", leverId: l.id, action: "add-cluster",
      title: "No cluster owns “" + (l.name || "this lever") + "”",
      body: l.share_pct + "% of economic weight has no capability owner in the Signal Matrix" +
        (l.capability
          ? " — the capability it needs is “" + l.capability + "”. Add it as a cluster, or map the lever to the cluster that already carries it."
          : ". Name the capability that moves it, then add or map a cluster.")
    });
  });

  // 2. Clusters carrying no money — preset defaults that may not fit.
  if (cov.mapped > 0) {
    state.clusters.forEach(c => {
      if (clusterEconomicWeight(state, c.id) > 0) return;
      out.push({
        key: "unweighted-cluster", severity: "medium", clusterId: c.id, action: "review-cluster",
        title: "“" + c.name + "” carries no economic weight",
        body: "No P&L lever maps to this cluster, so it cannot be ranked by money at risk. Either it is genuinely material and a lever is missing, or it is an industry-preset default that does not fit this business — in which case merge or remove it rather than scoring four cells nobody will act on."
      });
    });
  }

  // 3. Clusters carrying too much across distinct levers — split candidates.
  state.clusters.forEach(c => {
    const ls = clusterLevers(state, c.id).filter(l => (l.share_pct || 0) > 0);
    const w = ls.reduce((a, l) => a + (l.share_pct || 0), 0);
    if (ls.length >= 2 && w >= CALIB_SPLIT_WEIGHT) {
      out.push({
        key: "overloaded-cluster", severity: "medium", clusterId: c.id, action: "split-cluster",
        title: "“" + c.name + "” carries " + w + "% across " + ls.length + " distinct levers",
        body: "One maturity score now has to answer for " + ls.map(l => "“" + l.name + "”").join(" and ") +
          ". Levers this different usually move on different capabilities and different clocks — consider splitting so each carries its own rating and its own owner."
      });
    }
  });

  // 4. Weighted levers with no capability named — undiagnosable.
  levers.forEach(l => {
    if ((l.share_pct || 0) < CALIB_MIN_LEVER) return;
    if (l.capability && l.capability.trim()) return;
    out.push({
      key: "lever-no-capability", severity: "low", leverId: l.id, action: "name-capability",
      title: "“" + (l.name || "Unnamed lever") + "” has no capability named",
      body: "A P&L lever with no named capability cannot be diagnosed. State the capability that actually moves this number before scoring anything against it."
    });
  });

  // 5. Overall coverage of the money map.
  if (cov.total > 0 && cov.pct < CALIB_COVERAGE_MIN) {
    out.push({
      key: "coverage-gap", severity: "high", action: "none",
      title: "Only " + cov.pct + "% of economic weight has a capability owner",
      body: "Below " + CALIB_COVERAGE_MIN + "% the value-exposure ranking is reading a partial map. Map the remaining levers before letting the board order drive investment."
    });
  }

  const sev = { high: 0, medium: 1, low: 2 };
  return out.sort((a, b) => sev[a.severity] - sev[b.severity]);
}

/* One-line verdict on whether the cluster set fits the economics. */
function calibrationSummary(state) {
  const findings = calibrateClusters(state);
  const cov = valueChainCoverage(state);
  const high = findings.filter(f => f.severity === "high").length;
  const medium = findings.filter(f => f.severity === "medium").length;
  let fit = "aligned", verdict;
  if (!cov.levers) {
    fit = "unmapped";
    verdict = "No value chain mapped — the cluster set is the industry preset's, not this organisation's. Map the money first.";
  } else if (!cov.weighted) {
    fit = "unweighted";
    verdict = cov.levers + " starter levers are listed but carry no weight yet. Put a rough share of economic significance on each — materiality, not precision.";
  } else if (high) {
    fit = "misaligned";
    verdict = high + " material mismatch" + (high > 1 ? "es" : "") + " between where the money is and which clusters exist. Tune the cluster set before trusting the ratings.";
  } else if (medium) {
    fit = "tuning";
    verdict = medium + " cluster" + (medium > 1 ? "s" : "") + " to review — the money map and the cluster set are close but not yet clean.";
  } else {
    verdict = "Every material lever has a capability owner and every cluster carries weight. The cluster set fits this organisation's economics.";
  }
  return { findings, high, medium, low: findings.length - high - medium, fit, verdict, coverage: cov };
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

/* Value-weighted order: highest exposure first (money at risk), falling
   back to weakest-first when no value chain has been mapped. */
function sortByExposure(state, clusters, lenses) {
  return [...clusters].sort((a, b) => {
    const ea = clusterValueExposure(state, a, lenses).exposure;
    const eb = clusterValueExposure(state, b, lenses).exposure;
    if (Math.abs(ea - eb) > 1e-9) return eb - ea;
    return clusterAvg(a, lenses) - clusterAvg(b, lenses);
  });
}

function orderClustersForBoard(state, mode) {
  const useValue = mode === "value" || (mode === "auto" && hasValueChain(state));
  return {
    clusters: useValue ? sortByExposure(state, state.clusters, state.lenses)
      : sortWeakestFirst(state.clusters, state.lenses),
    basis: useValue ? "value" : "weakest"
  };
}

/* Cross-lens interdependency patterns (rubric indicator library).
   Deterministic, evidence-based risk flags across lenses in one cluster. */
function detectCrossLensPatterns(state) {
  const out = [];
  state.clusters.forEach(cl => {
    /* Role-grounded structural finding: an anchor seat that does not
       exist is checkable evidence, not an opinion about the org. */
    const cov = roleCoverage(cl);
    if (cov.anchors && cov.gaps.length) {
      const absent = cov.gaps.filter(r => r.status === "absent");
      out.push({
        clusterId: cl.id, cluster: cl.name, key: "anchor-seat-gap",
        title: absent.length ? "Anchor seat absent" : "Anchor bench thin",
        body: cov.gaps.map(r => r.title).join("; ") + " — " +
          (absent.length
            ? "no enterprise owner for this capability, so it defaults to whoever has capacity. Structure cannot score above L2 on the strength of a role nobody holds."
            : "the seat exists but the bench behind it does not; single points of failure carry the capability.")
      });
    }
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
  /* Order every alert group by money first, then by how bad the momentum
     is. An erosion alert on a 30% lever and one on a 2% lever are not the
     same alert, and a list that treats them alike buries the first. */
  Object.keys(alerts).forEach(k => {
    alerts[k].sort((a, b) => {
      const d = clusterEconomicWeight(state, b.cluster.id) - clusterEconomicWeight(state, a.cluster.id);
      return Math.abs(d) > 1e-9 ? d : a.m - b.m;
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
