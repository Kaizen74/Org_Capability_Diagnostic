/* ============================================================
   Capability Compass — Application UI
   Views: Signal Matrix, Priority Board, Trajectory, Delta.
   Persistence: localStorage + JSON export/import.
   ============================================================ */

const STORE_KEY = "capability_compass_state_v1";
let state = null;
let activeView = "matrix";
let drawerCtx = null; // { clusterId, lensKey, pendingLevel }

/* ---------- Utilities ---------- */
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function $(id) { return document.getElementById(id); }
function nowIso() { return new Date().toISOString(); }
function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 2600);
}

function saveState() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
  catch (e) { toast("Warning: could not save locally (" + e.message + ")"); }
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return migrateState(JSON.parse(raw));
  } catch (e) { /* corrupted state — fall through to wizard */ }
  return null;
}

/* Backfill fields added after a state was first saved. */
function migrateState(s) {
  if (!s) return s;
  if (!Array.isArray(s.briefings)) s.briefings = [];
  if (!Array.isArray(s.signal_keywords)) {
    const preset = PRESETS.find(p => p.industry_id === s.industry_id);
    s.signal_keywords = preset ? [...preset.signal_keywords] : [];
  }
  (s.clusters || []).forEach(cl => {
    Object.values(cl.cells || {}).forEach(cell => {
      if (!Array.isArray(cell.watch)) cell.watch = [];
    });
  });
  if (!Array.isArray(s.documents)) s.documents = [];
  if (!Array.isArray(s.analyses)) s.analyses = [];
  (s.clusters || []).forEach(cl => { if (!Array.isArray(cl.roles)) cl.roles = []; });
  if (!s.valueChain || typeof s.valueChain !== "object") {
    s.valueChain = { currency: "$", revenue: "", as_of: "", stages: DEFAULT_VC_STAGES.map(x => ({ ...x })), levers: [] };
  }
  if (!Array.isArray(s.valueChain.stages) || !s.valueChain.stages.length) {
    s.valueChain.stages = DEFAULT_VC_STAGES.map(x => ({ ...x }));
  }
  if (!Array.isArray(s.valueChain.levers)) s.valueChain.levers = [];
  if (!s.boardSort) s.boardSort = "auto";
  return s;
}

const DEFAULT_VC_STAGES = [
  { key: "demand", label: "Demand owner", note: "Who creates and controls the volume?" },
  { key: "platform", label: "Platform", note: "What do we operate to serve it?" },
  { key: "billing", label: "Billing unit", note: "What exactly do we invoice?" },
  { key: "cost", label: "Cost consumption", note: "Where does the revenue go?" },
  { key: "value", label: "Value created", note: "What lands as profit and return?" }
];

/* PDF/image payloads live in memory only — never in storage or exports. */
const docBlobs = {};

/* ---------- Blank diagnostic from a preset ---------- */
function stateFromPreset(preset, orgName) {
  const clusters = preset.clusters.map(c => {
    const cells = {};
    DEFAULT_LENSES.forEach(l => {
      cells[l.key] = {
        level: 1, status: "Not yet assessed",
        rationale: "", intervention: "",
        items: [], evidence: [], leading: [], watch: [], history: [],
        last_updated: nowIso(), updated_by: "—"
      };
    });
    return { id: c.id, no: c.no, name: c.name, desc: c.desc, priority_move: c.priority_move, cells, roles: [] };
  });
  return {
    schema: 1,
    orgName: orgName || "My Organisation",
    actor: "You",
    industry_id: preset.industry_id,
    industry_name: preset.display_name,
    lenses: JSON.parse(JSON.stringify(DEFAULT_LENSES)),
    rubric: JSON.parse(JSON.stringify(DEFAULT_RUBRIC)),
    patterns: JSON.parse(JSON.stringify(DEFAULT_PATTERNS)),
    clusters, versions: [], changeLog: [], briefings: [],
    documents: [], analyses: [],
    signal_keywords: [...(preset.signal_keywords || [])],
    currentVersion: "v0.1 (working)"
  };
}

/* ============================================================
   RENDERING
   ============================================================ */
function renderAll() {
  document.documentElement.style.setProperty("--lens-count", state.lenses.length);
  $("org-name").textContent = state.orgName + " · " + state.industry_name;
  const fv = $("footer-version");
  if (fv) fv.textContent = state.currentVersion + " · " + (state.versions.length ? state.versions.length + " saved snapshot" + (state.versions.length > 1 ? "s" : "") + " · " : "") + "stored locally only · ";
  $("print-org").textContent = state.orgName;
  $("print-meta").textContent = state.industry_name + " · " + state.currentVersion + " · printed " + new Date().toLocaleDateString();
  renderKpis();
  renderView();
  saveState();
}

function renderKpis() {
  const k = enterpriseKpis(state);
  const vel = trajectoryLabel({ m: k.velocity, known: k.velocityKnown });
  const risky = k.alerts.erosion.length + k.alerts.critical.length;
  const evidenceGap = k.unknownPct > 25;
  $("kpis").innerHTML = `
    <div class="kpi"><div class="k-label">Average maturity</div>
      <div class="k-value">${fmt1(k.avg)}<span style="font-size:13px;color:var(--muted)"> / 4</span></div>
      <div class="k-note">${k.cells} cells across ${state.clusters.length} clusters</div></div>
    <div class="kpi ${k.weak ? "flag" : ""}"><div class="k-label">Cells needing action</div>
      <div class="k-value">${k.weak}</div><div class="k-note">rated Level 1–2 (amber flagged)</div></div>
    <div class="kpi ${evidenceGap ? "flag" : ""}"><div class="k-label">Capability velocity</div>
      <div class="k-value">${k.velocityKnown ? `${vel.sym} ${fmtSigned(k.velocity)}` : "? n/a"}</div>
      <div class="k-note">${k.velocityKnown
        ? `${vel.word} — across ${k.cells - k.unknownCount} direction-assessed cells${k.unknownCount ? ` (${k.unknownCount} unknown)` : ""}`
        : "no trajectory evidence yet — add leading indicators or save a version"}</div></div>
    <div class="kpi ${risky ? "flag" : ""}"><div class="k-label">Trajectory alerts</div>
      <div class="k-value">${risky}</div><div class="k-note">erosion / weak-and-declining cells</div></div>
    <div class="kpi ${k.groundedPct < 100 ? "flag" : ""}"><div class="k-label">Evidence coverage</div>
      <div class="k-value">${k.groundedPct}%</div><div class="k-note">${evidenceGap
        ? `⚑ ${k.unknownPct}% of directions unknown — the finding is an evidence gap`
        : "of ratings cite at least one source"}</div></div>`;
}

function renderView() {
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.view === activeView));
  const el = $("view");
  if (activeView === "matrix") el.innerHTML = viewMatrix();
  else if (activeView === "board") el.innerHTML = viewBoard();
  else if (activeView === "trajectory") el.innerHTML = viewTrajectory();
  else if (activeView === "signals") el.innerHTML = viewSignals();
  else if (activeView === "evidence") el.innerHTML = viewEvidence();
  else if (activeView === "valuechain") el.innerHTML = viewValueChain();
  else if (activeView === "roles") el.innerHTML = viewRoles();
  else el.innerHTML = viewDelta();
  bindViewEvents();
}

/* ---------- Cell fragment (quadruple encoding + momentum) ---------- */
function cellHtml(cluster, lens) {
  const cell = cluster.cells[lens.key];
  if (!cell) return "<div></div>";
  const t = cellTrajectory(state, cluster, lens.key);
  const ml = trajectoryLabel(t);
  const conf = cellConfidence(cell);
  const trajTitle = t.known
    ? `Trajectory: ${ml.word} (${fmtSigned(t.m)}) · ${t.confidence} confidence · basis: ${t.basis}`
    : "Trajectory unknown — no version history or leading indicators yet";
  const segs = [1, 2, 3, 4].map(i => `<span class="${i <= cell.level ? "on" : ""}"></span>`).join("");
  return `
  <button class="cell lv${cell.level}" data-cluster="${esc(cluster.id)}" data-lens="${esc(lens.key)}"
      aria-label="${esc(cluster.name)} — ${esc(lens.name)}: level ${cell.level} of 4, ${esc(cell.status)}, trajectory ${ml.word}">
    ${cell.level <= 2 ? '<span class="action-pill">Action</span>' : ""}
    <span class="status">${esc(cell.status)}</span>
    <span class="meta">
      <span class="segbar">${segs}</span>
      <span>L${cell.level} · ${["", "Absent", "Early", "Emerging", "Established"][cell.level]} · ${cell.level}/4</span>
    </span>
    <span class="meta">
      <span class="momo ${t.known ? "" : "momo-unknown"}" title="${esc(trajTitle)}"><span class="sym">${ml.sym}</span>${ml.word}</span>
      ${conf.grounded ? `<span class="conf-dot">◈ ${esc(conf.label)}</span>` : '<span class="unsupported">Unsupported</span>'}
    </span>
  </button>`;
}

/* ---------- View 1: Signal Matrix ---------- */
function viewMatrix() {
  const head = `<div class="matrix-head">
      <div class="mh corner">Capability cluster<span class="sub">Priority move always visible</span></div>
      ${state.lenses.map(l => `<div class="mh">${esc(l.name)}<span class="sub">${esc(l.sub)}</span></div>`).join("")}
    </div>`;
  const rows = state.clusters.map(cl => `
    <div class="matrix-row">
      <div class="cluster-head">
        <button class="c-edit" data-editcluster="${esc(cl.id)}" title="Edit cluster">Edit</button>
        <span class="c-no">CLUSTER ${cl.no}</span>
        <span class="c-name">${esc(cl.name)}</span>
        <span class="c-desc">${esc(cl.desc)}</span>
        <span class="pm-chip"><span class="arrow">➜</span><span>${esc(cl.priority_move)}</span></span>
      </div>
      ${state.lenses.map(l => cellHtml(cl, l)).join("")}
    </div>`).join("");
  return `<div class="view-note">Analytical read — every rating is quadruple-encoded (fill + segment bar + label + amber flag) with a momentum arrow. Click any cell to drill down and edit.</div>
    <section class="print-section"><div class="matrix">${head}${rows}</div></section>`;
}

/* ---------- View 2: Priority Board ---------- */
function viewBoard() {
  const heroes = state.patterns.map(p => `
    <div class="hero"><div class="h-kicker">Cross-cluster pattern ${p.num}</div>
      <h3>${esc(p.title)}</h3><p>${esc(p.body)}</p></div>`).join("");
  const ordered = orderClustersForBoard(state, state.boardSort || "auto");
  const sorted = ordered.clusters;
  const cards = sorted.map((cl, i) => {
    const avg = clusterAvg(cl, state.lenses);
    const weak = clusterWeakCount(cl, state.lenses);
    const ct = clusterTrajectory(state, cl, state.lenses);
    const ml = trajectoryLabel(ct);
    const bind = bindingConstraint(state, cl, state.lenses);
    const bindLabel = bind ? trajectoryLabel(bind.t) : null;
    const exp = clusterValueExposure(state, cl, state.lenses);
    const cov = roleCoverage(cl);
    const chips = state.lenses.map(l => {
      const cell = cl.cells[l.key];
      if (!cell) return "";
      return `<button class="lens-chip lv${cell.level}" data-cluster="${esc(cl.id)}" data-lens="${esc(l.key)}">
        <span class="lc-top"><span>${esc(l.name)} · L${cell.level}</span>${cell.level <= 2 ? '<span class="flag">ACTION</span>' : ""}</span>
        <span class="lc-status">${esc(cell.status)}</span></button>`;
    }).join("");
    return `<div class="bcard">
      <div class="bcard-top"><span class="rank">${i + 1}</span>
        <div><h3>${esc(cl.name)}</h3><p class="b-desc">${esc(cl.desc)}</p></div></div>
      <div class="b-stats">
        <span class="b-avg">Avg ${fmt1(avg)} / 4</span>
        ${weak ? `<span class="b-flagpill">⚑ ${weak} ${weak > 1 ? "lenses need" : "lens needs"} action</span>` : ""}
        <span class="b-velocity">${ct.known ? `${ml.sym} ${ml.word} (${fmtSigned(ct.m)})` : "? direction unknown"}</span>
        ${exp.weight ? `<span class="b-exposure" title="Economic weight ${exp.weight}% × capability gap">◧ Exposure ${Math.round(exp.exposure)}</span>` : ""}
        ${cov.gaps.length ? `<span class="b-flagpill" title="${esc(cov.gaps.map(r => r.title).join('; '))}">⚑ ${cov.gaps.length} anchor seat${cov.gaps.length > 1 ? "s" : ""} ${cov.gaps.every(r => r.status === "absent") ? "absent" : "at risk"}</span>` : ""}
      </div>
      <div class="pm-banner"><span class="arrow">➜</span><span>${esc(cl.priority_move)}</span></div>
      ${bind ? `<div class="b-binding" title="The lowest-level cell that is not already improving — where intervention bites first">Binding constraint: <button class="b-bind-link" data-cluster="${esc(cl.id)}" data-lens="${esc(bind.lensKey)}">${esc(bind.lensName)} · L${bind.cell.level} ${bindLabel.sym} ${bindLabel.word}</button></div>` : ""}
      <div class="lens-chips">${chips}</div>
    </div>`;
  }).join("");
  const basisNote = ordered.basis === "value"
    ? "ranked by <strong>value exposure</strong> — economic weight from the Value Chain × capability gap, so the money at risk leads"
    : "ranked <strong>weakest-first</strong> (average level ascending, tie-break by count of weak lenses). Map your P&amp;L levers in the Value Chain view to rank by money at risk instead";
  return `<div class="view-note">Action read — hero patterns on top, clusters ${basisNote}. Edit hero patterns in Settings.</div>
    <div class="board-controls">
      <label class="sig-kw-label" for="board-sort">Order by</label>
      <select id="board-sort">
        <option value="auto" ${(state.boardSort || "auto") === "auto" ? "selected" : ""}>Automatic (value exposure when mapped)</option>
        <option value="value" ${state.boardSort === "value" ? "selected" : ""}>Value exposure — money at risk</option>
        <option value="weakest" ${state.boardSort === "weakest" ? "selected" : ""}>Weakest capability first</option>
      </select>
    </div>
    <section class="print-section"><div class="hero-row">${heroes}</div><div class="board">${cards}</div></section>`;
}

/* ---------- View 3: Trajectory (predictive) ---------- */
function viewTrajectory() {
  const k = enterpriseKpis(state);
  const alertList = (items, empty) => items.length
    ? `<ul>${items.map(a => `<li><button data-cluster="${esc(a.cluster.id)}" data-lens="${esc(a.lens.key)}">${esc(a.cluster.name)} · ${esc(a.lens.name)}</button> — ${esc(a.cell.status)} (L${a.cell.level}${a.t.known ? ", " + fmtSigned(a.m) : ""})</li>`).join("")}</ul>`
    : `<div class="alert-empty">${empty}</div>`;
  const unknownNote = k.unknownPct > 25
    ? `<p class="alert-empty" style="margin-top:6px"><strong>${k.unknownPct}% of cells have no assessable direction — that IS the finding: an evidence-infrastructure gap. Build leading indicators before trusting any forecast.</strong></p>` : "";
  const alerts = `<div class="traj-alerts">
    <div class="alert-card warn"><h4>⚠ Weak &amp; declining</h4>${alertList(k.alerts.critical, "None — no weak cell is deteriorating.")}</div>
    <div class="alert-card warn"><h4>⚠ Erosion risk (strengths under threat)</h4>${alertList(k.alerts.erosion, "None — established capabilities are holding.")}</div>
    <div class="alert-card warn"><h4>⚑ Stalled weaknesses</h4>${alertList(k.alerts.stalled, "None — every weak cell has positive momentum.")}</div>
    <div class="alert-card good"><h4>↗ Breakouts underway</h4>${alertList(k.alerts.breakout, "None yet — add leading indicators to weak cells to track progress.")}</div>
    <div class="alert-card"><h4>? Direction unknown</h4>${alertList(k.alerts.unassessed, "None — every cell has qualifying trajectory evidence.")}${unknownNote}</div>
  </div>`;

  const patterns = detectCrossLensPatterns(state);
  const patternSection = patterns.length ? `
    <div class="xlens">
      <h4 class="xlens-title">Cross-lens risk patterns <span class="sig-meta">— interdependencies the heatmap hides</span></h4>
      <div class="xlens-grid">${patterns.map(p => `
        <div class="pattern-card">
          <span class="pattern-cluster">${esc(p.cluster)}</span>
          <h5>${esc(p.title)}</h5>
          <p>${esc(p.body)}</p>
        </div>`).join("")}</div>
    </div>` : "";

  const pos = v => (((v - 1) / 3) * 92 + 4) + "%";
  const rows = state.clusters.map(cl => {
    const cur = clusterAvg(cl, state.lenses);
    const proj = clusterProjectedAvg(state, cl, state.lenses);
    const ct = clusterTrajectory(state, cl, state.lenses);
    const ml = trajectoryLabel(ct);
    const left = Math.min(cur, proj), right = Math.max(cur, proj);
    const showProj = ct.known && Math.abs(proj - cur) > 0.01;
    const chips = state.lenses.map(l => {
      const cell = cl.cells[l.key];
      if (!cell) return "";
      const t = cellTrajectory(state, cl, l.key);
      const mm = trajectoryLabel(t);
      return `<button class="tl-chip lv${cell.level}" data-cluster="${esc(cl.id)}" data-lens="${esc(l.key)}" title="${esc(l.name)}: ${mm.word}${t.known ? " · " + t.confidence + " confidence" : ""}">${esc(l.name)} L${cell.level} ${mm.sym}</button>`;
    }).join("");
    return `<div class="traj-row">
      <div class="traj-name">${esc(cl.name)}<span class="t-sub">${ct.known ? `${ml.sym} ${ml.word} · momentum ${fmtSigned(ct.m)} · ${ct.knownCount}/${ct.total} cells assessed` : "? direction unknown — no trajectory evidence yet"}</span></div>
      <div class="scale">
        <div class="track"></div>
        ${[1, 2, 3, 4].map(t => `<span class="tick" style="left:${pos(t)}">L${t}</span>`).join("")}
        ${showProj ? `<div class="link" style="left:${pos(left)};width:calc(${pos(right)} - ${pos(left)})"></div>` : ""}
        <span class="dot" style="left:${pos(cur)}" title="Current average"></span>
        <span class="dot-label" style="left:${pos(cur)}">now ${fmt1(cur)}</span>
        ${showProj ? `<span class="dot proj" style="left:${pos(proj)}" title="Projected average, conditional on indicators holding"></span><span class="dot-label" style="left:${pos(proj)};top:38px">proj ${fmt1(proj)}</span>` : ""}
      </div>
      <div class="traj-lenses">${chips}</div>
    </div>`;
  }).join("");

  return `<div class="view-note">Predictive read — direction, never dates-and-points. Trajectory blends version-over-version movement 50/50 with the leading indicators you maintain; projections are conditional on those indicators holding and span two review cycles. Cells with no qualifying evidence honestly show “? Unknown” rather than a guessed arrow. Solid dot = today; outlined dot = conditional projection.</div>
    <section class="print-section">${alerts}${patternSection}<div class="traj-table">${rows}</div></section>`;
}

/* ---------- View 4: External Signals (Claude API) ---------- */
let scanBusy = false;

function viewSignals() {
  const cfg = getApiConfig();
  const kws = state.signal_keywords || [];
  if (!cfg.apiKey) {
    return `<div class="view-note">External calibration — scan the latest market research, competitor moves, and regulatory shifts, then apply them as leading indicators that recalibrate the trajectory forecast.</div>
      <div class="delta-empty"><strong>No Claude API key configured.</strong><br><br>
      Add your Anthropic API key under <em>Settings → External intelligence</em> to enable live scanning (the key stays in this browser and is never exported).<br>
      No key yet? Enter <code>mock</code> as the key to explore this feature with simulated signals — free and offline.<br><br>
      <button class="btn-navy" id="sig-open-settings">Open Settings</button></div>`;
  }
  const dirMeta = {
    tailwind: { sym: "↗", word: "Tailwind", cls: "good" },
    headwind: { sym: "↘", word: "Headwind", cls: "warn" },
    neutral: { sym: "→", word: "Neutral", cls: "" }
  };
  const briefings = (state.briefings || []).slice().reverse().map(b => {
    const cards = b.signals.map((sig, si) => {
      const d = dirMeta[sig.direction] || dirMeta.neutral;
      const clusters = sig.affected_cluster_ids.map(cid => {
        const cl = state.clusters.find(c => c.id === cid);
        if (!cl) return "";
        const done = sig.applied && sig.applied[cid];
        return `<button class="mini-btn ${done ? "" : ""}" data-apply-sig="${esc(b.id)}|${si}|${esc(cid)}" ${done ? "disabled" : ""}>
          ${done ? "✓ Applied to " : "＋ Apply to "}${esc(cl.name)} · ${esc(sig.lens_key)}</button>`;
      }).join(" ");
      return `<div class="sig-card">
        <div class="sig-head">
          <span class="sig-dir ${d.cls}">${d.sym} ${d.word}</span>
          <h3>${esc(sig.headline)}</h3>
        </div>
        <p class="sig-summary">${esc(sig.summary)}</p>
        <p class="sig-meta">Source: ${esc(sig.source || "—")}${sig.source_quality ? ` <span class="src-q q${sig.source_quality}" title="Source quality 1–5: 5 = primary (filings, regulator, the organisation itself), 4 = reputable secondary, 3 = trade aggregate, 2 = SEO farm, 1 = content mill">Q${sig.source_quality}</span>` : ""}${sig.calibration_note ? ` · <em>${esc(sig.calibration_note)}</em>` : ""}</p>
        <div class="sig-actions">${clusters || '<span class="sig-meta">No matching clusters.</span>'}</div>
      </div>`;
    }).join("");
    return `<section class="sig-briefing">
      <div class="sig-brief-head">
        <h2>Briefing — ${new Date(b.generated_at).toLocaleString()}</h2>
        <span class="sig-meta">${b.signals.length} signals · model: ${esc(b.model)}</span>
        <button class="mini-btn danger" data-del-brief="${esc(b.id)}">Delete</button>
      </div>
      ${cards}
    </section>`;
  }).join("");
  return `<div class="view-note">External calibration — Claude scans the web for the latest market research and signals relevant to your industry, then you apply each signal to a cluster as a leading indicator. Applied signals feed the momentum model behind the Trajectory view. Findings are suggestions: you stay the calibrator.</div>
    <div class="sig-controls">
      <div>
        <span class="sig-kw-label">Watch keywords:</span>
        <input type="text" id="sig-keywords" value="${esc(kws.join(", "))}" placeholder="e.g. cargo tonnage, IATA, safety incidents">
      </div>
      <button class="btn-navy" id="sig-scan" ${scanBusy ? "disabled" : ""}>${scanBusy ? "Scanning…" : "Scan external signals"}</button>
      <span class="sig-meta" id="sig-status">${scanBusy ? "Searching the latest research — this can take up to a minute." : ""}</span>
    </div>
    ${briefings || '<div class="delta-empty">No briefings yet. Run your first scan — results appear here and are saved locally.</div>'}`;
}

function bindSignalEvents() {
  const open = $("sig-open-settings");
  if (open) open.addEventListener("click", openSettings);
  const scan = $("sig-scan");
  if (scan) scan.addEventListener("click", runSignalScan);
  document.querySelectorAll("[data-apply-sig]").forEach(b => b.addEventListener("click", () => {
    const [bid, si, cid] = b.dataset.applySig.split("|");
    applySignal(bid, parseInt(si, 10), cid);
  }));
  document.querySelectorAll("[data-del-brief]").forEach(b => b.addEventListener("click", () => {
    state.briefings = state.briefings.filter(x => x.id !== b.dataset.delBrief);
    renderAll();
  }));
}

async function runSignalScan() {
  const kwInput = $("sig-keywords");
  state.signal_keywords = kwInput.value.split(",").map(s => s.trim()).filter(Boolean);
  scanBusy = true;
  renderView();
  try {
    const briefing = await scanExternalSignals(state, state.signal_keywords);
    state.briefings = (state.briefings || []).concat([briefing]).slice(-10);
    toast("Briefing ready — " + briefing.signals.length + " signals found.");
  } catch (e) {
    toast("Scan failed: " + e.message);
  } finally {
    scanBusy = false;
    renderAll();
  }
}

function applySignal(briefingId, sigIndex, clusterId) {
  const briefing = (state.briefings || []).find(b => b.id === briefingId);
  const sig = briefing && briefing.signals[sigIndex];
  const cluster = state.clusters.find(c => c.id === clusterId);
  if (!sig || !cluster) return;
  const lensKey = cluster.cells[sig.lens_key] ? sig.lens_key : state.lenses[0].key;
  const cell = cluster.cells[lensKey];
  cell.leading = cell.leading || [];
  cell.leading.push({ name: sig.headline.slice(0, 80), signal: directionToLeading(sig.direction) });
  cell.evidence = cell.evidence || [];
  cell.evidence.push({ label: sig.source || "External signal briefing", note: sig.calibration_note || sig.headline });
  cell.last_updated = nowIso();
  cell.updated_by = state.actor || "You";
  sig.applied = sig.applied || {};
  sig.applied[clusterId] = true;
  state.changeLog.push({ at: nowIso(), cluster: cluster.name, lens: lensKey, from: cell.level, to: cell.level, rationale: "External signal applied as leading indicator: " + sig.headline, by: cell.updated_by });
  renderAll();
  toast("Signal applied — it now feeds the trajectory forecast for " + cluster.name + ".");
}

/* ---------- View: Value Chain (follow the money) ---------- */
function viewValueChain() {
  const vc = state.valueChain;
  const total = vc.levers.reduce((a, l) => a + (l.share_pct || 0), 0);
  const mapped = vc.levers.filter(l => l.cluster_id).reduce((a, l) => a + (l.share_pct || 0), 0);
  const unmapped = vc.levers.filter(l => !l.cluster_id);

  const stages = vc.stages.map((s, i) => `
    <div class="vc-stage">
      <span class="vc-stage-label">${esc(s.label)}</span>
      <input type="text" data-vc-stage="${i}" value="${esc(s.note || "")}" placeholder="…">
    </div>${i < vc.stages.length - 1 ? '<span class="vc-arrow">→</span>' : ""}`).join("");

  const rows = vc.levers.map((l, i) => {
    const cl = state.clusters.find(c => c.id === l.cluster_id);
    const gap = cl ? clusterValueExposure(state, cl, state.lenses) : null;
    return `<tr>
      <td><input type="text" class="vc-in" data-lv="name|${i}" value="${esc(l.name)}" placeholder="P&L lever"></td>
      <td><input type="text" class="vc-in narrow" data-lv="figure|${i}" value="${esc(l.figure || "")}" placeholder="figure"></td>
      <td><input type="number" class="vc-in tiny" data-lv="share_pct|${i}" value="${l.share_pct}" min="0" max="100" step="1"></td>
      <td><input type="text" class="vc-in" data-lv="capability|${i}" value="${esc(l.capability || "")}" placeholder="capability that moves it"></td>
      <td><select data-lv="cluster_id|${i}">
        <option value="">— unmapped —</option>
        ${state.clusters.map(c => `<option value="${esc(c.id)}" ${c.id === l.cluster_id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}
      </select></td>
      <td class="vc-exposure">${gap ? `<span class="exposure-pill ${gap.exposure >= 10 ? "hot" : ""}" title="Economic weight × capability gap">${Math.round(gap.exposure)}</span>` : "—"}</td>
      <td><button class="mini-btn danger" data-lv-del="${i}">✕</button></td>
    </tr>`;
  }).join("");

  return `<div class="view-note"><strong>Follow the money first.</strong> A capability is only critical if money, risk or the strategy actually rides on it. Map each P&L lever to the capability that moves it and the cluster that owns it — the Priority Board then ranks by <em>value exposure</em> (economic weight × capability gap), not by weakness alone. ${total ? "" : "Nothing mapped yet: the board falls back to weakest-first."}</div>
    <section class="print-section">
      <div class="vc-band">
        <div class="vc-head">
          <div><label>Currency</label><input type="text" id="vc-currency" value="${esc(vc.currency || "")}" style="width:70px"></div>
          <div><label>Revenue</label><input type="text" id="vc-revenue" value="${esc(vc.revenue || "")}" placeholder="e.g. 6.35B"></div>
          <div><label>As of</label><input type="text" id="vc-asof" value="${esc(vc.as_of || "")}" placeholder="e.g. FY2026"></div>
        </div>
        <div class="vc-flow">${stages}</div>
      </div>

      <div class="vc-tablewrap">
        <div class="sig-brief-head">
          <h2>From P&amp;L lever to critical capability</h2>
          <span class="sig-meta">${vc.levers.length} levers · ${mapped}% of weight mapped to clusters${total !== 100 && total > 0 ? ` · weights total ${total}% (they need not sum to 100)` : ""}</span>
          <button class="mini-btn" id="vc-add">＋ Add lever</button>
        </div>
        <table class="vc-table">
          <thead><tr><th>P&amp;L lever</th><th>Figure</th><th title="Share of economic weight">Weight %</th><th>Capability that moves it</th><th>Cluster that owns it</th><th title="Economic weight × capability gap">Exposure</th><th></th></tr></thead>
          <tbody>${rows || '<tr><td colspan="7" style="text-align:center;color:var(--muted)">No levers yet — add the handful of drivers that actually move your P&L.</td></tr>'}</tbody>
        </table>
        ${unmapped.length ? `<p class="sig-meta" style="margin-top:8px">⚑ ${unmapped.length} lever${unmapped.length > 1 ? "s" : ""} not yet mapped to a cluster — that money has no capability owner in this diagnostic.</p>` : ""}
      </div>
    </section>`;
}

function bindValueChainEvents() {
  const cur = $("vc-currency");
  if (!cur) return;
  const save = () => { saveState(); renderKpis(); };
  cur.addEventListener("change", () => { state.valueChain.currency = cur.value.trim(); save(); });
  $("vc-revenue").addEventListener("change", () => { state.valueChain.revenue = $("vc-revenue").value.trim(); save(); });
  $("vc-asof").addEventListener("change", () => { state.valueChain.as_of = $("vc-asof").value.trim(); save(); });
  document.querySelectorAll("[data-vc-stage]").forEach(inp => inp.addEventListener("change", () => {
    state.valueChain.stages[parseInt(inp.dataset.vcStage, 10)].note = inp.value.trim(); save();
  }));
  $("vc-add").addEventListener("click", () => {
    state.valueChain.levers.push({ id: "lv_" + Date.now(), name: "", figure: "", share_pct: 0, capability: "", pillar: "", cluster_id: "" });
    renderAll();
  });
  document.querySelectorAll("[data-lv]").forEach(el => el.addEventListener("change", () => {
    const [field, idx] = el.dataset.lv.split("|");
    const lever = state.valueChain.levers[parseInt(idx, 10)];
    lever[field] = field === "share_pct" ? Math.max(0, Math.min(100, parseFloat(el.value) || 0)) : el.value.trim();
    renderAll();
  }));
  document.querySelectorAll("[data-lv-del]").forEach(b => b.addEventListener("click", () => {
    state.valueChain.levers.splice(parseInt(b.dataset.lvDel, 10), 1);
    renderAll();
  }));
}

/* ---------- View: Roles (two-axis critical-role rubric) ---------- */
let rolesCluster = null;

function roleMatrixCell(rows, label, hint) {
  return `<div class="rm-quadrant">
    <div class="rm-q-head"><strong>${esc(label)}</strong><span>${rows.length}</span></div>
    <p class="rm-q-hint">${esc(hint)}</p>
    <ul>${rows.length ? rows.map(r => `<li><button data-role-open="${esc(r.cluster.id)}|${esc(r.role.id)}">${esc(r.role.title)}</button> <span class="rm-status ${r.status.cls}">${r.status.label}</span></li>`).join("") : '<li class="rm-empty">—</li>'}</ul>
  </div>`;
}

function viewRoles() {
  const clusterId = rolesCluster || state.clusters[0].id;
  const cluster = state.clusters.find(c => c.id === clusterId) || state.clusters[0];
  const all = [];
  state.clusters.forEach(cl => (cl.roles || []).forEach(r => all.push({ cluster: cl, role: r, ...roleSummary(r) })));
  const byRoute = k => all.filter(r => r.route === k);
  const critReg = criticalRoleRegister(state);
  const keyReg = keyPersonRegister(state);
  const absent = critReg.filter(r => r.role.status === "absent");

  const roleRows = (cluster.roles || []).map(r => {
    const s = roleSummary(r);
    return `<tr>
      <td><input type="text" class="vc-in" data-role="title|${esc(r.id)}" value="${esc(r.title)}"></td>
      <td><select data-role="status|${esc(r.id)}">
        ${Object.keys(STATUS_META).map(k => `<option value="${k}" ${r.status === k ? "selected" : ""}>${STATUS_META[k].label}</option>`).join("")}
      </select></td>
      ${AXIS_A_WEIGHTS.map(w => `<td><input type="number" class="vc-in tiny" data-role="axisA.${w.key}|${esc(r.id)}" value="${r.axisA[w.key]}" min="1" max="5" step="0.5" title="${esc(w.label)} (${Math.round(w.wt * 100)}%)"></td>`).join("")}
      <td class="rt-calc">${fmt1(s.idx)}</td>
      ${TKI_FACTORS.map(f => `<td><input type="number" class="vc-in tiny" data-role="tki.${f.key}|${esc(r.id)}" value="${r.tki[f.key]}" min="1" max="5" step="0.5" title="${esc(f.label)}"></td>`).join("")}
      <td class="rt-calc">${fmt1(s.tki)}</td>
      <td><span class="route-pill rt-${s.route}">${s.meta.label}</span></td>
      <td><button class="mini-btn danger" data-role-del="${esc(r.id)}">✕</button></td>
    </tr>`;
  }).join("");

  return `<div class="view-note"><strong>Roles are the checkable half of the rubric.</strong> A capability nobody is accountable for is not a Level 3. Each role is scored on two independent axes — <em>Criticality</em> (strategic leverage &amp; market scarcity: hard to hire) and <em>Tacit-Knowledge Intensity</em> (hard to rebuild internally, regardless of hiring). They are different risks with different fixes, which is exactly what a seniority-only view misses. Thresholds are explicit: ≥ ${HIGH_LEVERAGE} is high on either axis.</div>
    <section class="print-section">
      <div class="rm-grid">
        ${roleMatrixCell(byRoute("critical"), "Critical role", "Succession bench — acquire or build ahead of need.")}
        ${roleMatrixCell(byRoute("dual"), "Dual-critical", "Succession AND knowledge capture. A successor name alone is insufficient.")}
        ${roleMatrixCell(byRoute("standard"), "Standard population", "Productivity, automation, standard resourcing.")}
        ${roleMatrixCell(byRoute("specialist"), "Specialist / key-person", "Knowledge transfer, apprenticeship, retention — not the succession list.")}
      </div>
      <p class="rm-axis-note">↑ Strategic leverage &amp; scarcity (Criticality Index) · → Tacit-knowledge intensity (hard to rebuild)</p>

      ${absent.length ? `<div class="xlens"><h4 class="xlens-title">Highest succession risk <span class="sig-meta">— anchor seats with no internal successor pool</span></h4>
        <div class="xlens-grid">${absent.slice(0, 3).map(r => `
          <div class="pattern-card">
            <span class="pattern-cluster">${esc(r.cluster.name)}</span>
            <h5>${esc(r.role.title)}</h5>
            <p>Absent today · criticality ${fmt1(r.idx)} / 5 · ${esc(r.meta.fix)}</p>
          </div>`).join("")}</div></div>` : ""}

      <div class="sig-brief-head">
        <h2>Role register</h2>
        <select id="roles-cluster">${state.clusters.map(c => `<option value="${esc(c.id)}" ${c.id === cluster.id ? "selected" : ""}>${esc(c.name)} (${(c.roles || []).length})</option>`).join("")}</select>
        <span class="sig-meta">${(() => { const cov = roleCoverage(cluster); return cov.anchors ? `anchor seats filled: ${cov.exists}/${cov.anchors} (${cov.pct}%)` : "no anchor roles scored yet"; })()}</span>
        <button class="mini-btn" id="role-add">＋ Add role</button>
        <button class="mini-btn" id="role-import">Import roles CSV</button>
      </div>
      <div class="rt-wrap">
        <table class="rt-table">
          <thead>
            <tr>
              <th rowspan="2">Role (real job title)</th><th rowspan="2">Status</th>
              <th colspan="${AXIS_A_WEIGHTS.length}" class="rt-group">Axis A · Criticality (1–5)</th><th rowspan="2">Index</th>
              <th colspan="${TKI_FACTORS.length}" class="rt-group">Axis B · Tacit-knowledge (1–5)</th><th rowspan="2">TKI</th>
              <th rowspan="2">Route</th><th rowspan="2"></th>
            </tr>
            <tr>
              ${AXIS_A_WEIGHTS.map(w => `<th class="rt-sub" title="${esc(w.label)}">${esc(w.label.split(" ")[0])}<br><span>${Math.round(w.wt * 100)}%</span></th>`).join("")}
              ${TKI_FACTORS.map(f => `<th class="rt-sub" title="${esc(f.label)}">${esc(f.label.split(" ")[0].replace("/", ""))}</th>`).join("")}
            </tr>
          </thead>
          <tbody>${roleRows || `<tr><td colspan="16" style="text-align:center;color:var(--muted)">No roles scored for this cluster yet. Add the anchor seats — the ones the capability genuinely depends on.</td></tr>`}</tbody>
        </table>
      </div>

      <div class="xlens" style="margin-top:18px">
        <h4 class="xlens-title">Key-person risk register <span class="sig-meta">— high tacit knowledge: plan overlap and shadowing, not a name on a chart</span></h4>
        ${keyReg.length ? `<table class="delta-table"><thead><tr><th>Role</th><th>Cluster</th><th>TKI</th><th>Why internally irreplaceable</th><th>Routing</th></tr></thead><tbody>
          ${keyReg.map(r => `<tr>
            <td><strong>${esc(r.role.title)}</strong></td>
            <td>${esc(r.cluster.name)}</td>
            <td><span class="tki-pill">${fmt1(r.tki)}</span></td>
            <td>${esc(r.role.note || "—")}</td>
            <td><span class="route-pill rt-${r.route}">${r.meta.label}</span></td>
          </tr>`).join("")}
        </tbody></table>` : '<div class="alert-empty">No high-tacit roles scored yet — these are the quiet experts a scarcity-only view misses.</div>'}
      </div>
    </section>`;
}

function bindRolesEvents() {
  const sel = $("roles-cluster");
  if (!sel) return;
  sel.addEventListener("change", () => { rolesCluster = sel.value; renderView(); });
  $("role-add").addEventListener("click", () => {
    const cl = state.clusters.find(c => c.id === (rolesCluster || state.clusters[0].id));
    cl.roles = cl.roles || [];
    cl.roles.push({
      id: "r_" + Date.now(), title: "New role", status: "absent",
      axisA: { impact: 3, scarcity: 3, vacancy: 3, pivotal: 3, futurefit: 3 },
      tki: { time: 3, codifiability: 3, concentration: 3, consequence: 3, relationship: 3 },
      note: ""
    });
    renderAll();
  });
  $("role-import").addEventListener("click", () => $("file-roles").click());
  document.querySelectorAll("[data-role]").forEach(el => el.addEventListener("change", () => {
    const [field, roleId] = el.dataset.role.split("|");
    const cl = state.clusters.find(c => (c.roles || []).some(r => r.id === roleId));
    const role = cl && cl.roles.find(r => r.id === roleId);
    if (!role) return;
    if (field.indexOf(".") !== -1) {
      const [axis, key] = field.split(".");
      role[axis][key] = Math.max(1, Math.min(5, parseFloat(el.value) || 1));
    } else if (field === "status") {
      role.status = el.value;
    } else {
      role.title = el.value.trim() || role.title;
    }
    renderAll();
  }));
  document.querySelectorAll("[data-role-del]").forEach(b => b.addEventListener("click", () => {
    const cl = state.clusters.find(c => (c.roles || []).some(r => r.id === b.dataset.roleDel));
    cl.roles = cl.roles.filter(r => r.id !== b.dataset.roleDel);
    renderAll();
  }));
  document.querySelectorAll("[data-role-open]").forEach(b => b.addEventListener("click", () => {
    const [cid] = b.dataset.roleOpen.split("|");
    rolesCluster = cid; renderView();
    const t = document.querySelector(".rt-wrap");
    if (t) t.scrollIntoView({ behavior: "smooth", block: "center" });
  }));
}

/* ---------- View 5: Evidence (document ingestion, PRD F6) ---------- */
let analyzeBusy = false;

const DOC_TYPE_LABELS = {
  "strategy-deck": "Strategy deck", "survey-report": "Engagement survey",
  "board-paper": "Board paper", "workforce-file": "Workforce file",
  "annual-report": "Annual report", "org-chart": "Org chart / job titles",
  "program-update": "Programme update", "other": "Other"
};

function docStatus(d) {
  if (d.kind === "unsupported") {
    return { label: d.parse_error ? "Could not parse — " + d.parse_error : "Unsupported format — save as PDF or paste text", cls: "warn" };
  }
  if (d.kind === "text") {
    const from = d.parsed_from ? { docx: "Word", pptx: "PowerPoint", xlsx: "Excel", pdf: "PDF" }[d.parsed_from] : null;
    return { label: from ? "Ready (" + from + " parsed locally)" : "Ready (parsed locally)", cls: "good" };
  }
  return docBlobs[d.id]
    ? { label: d.kind === "pdf" ? "Ready (scanned PDF → read by Claude)" : "Ready (image → read by Claude)", cls: "good" }
    : { label: "Re-attach file to analyse (content is never stored)", cls: "warn" };
}

function viewEvidence() {
  const cfg = getApiConfig();
  const docs = state.documents || [];
  const docRows = docs.map(d => {
    const st = docStatus(d);
    return `<div class="doc-row">
      <div class="doc-main">
        <span class="doc-name" title="${esc(d.name)}">${esc(d.name)}</span>
        <input type="text" class="doc-label" value="${esc(d.label)}" data-doc-label="${esc(d.id)}" placeholder="Source label (propagates to citations)">
        <select data-doc-type="${esc(d.id)}">
          ${Object.keys(DOC_TYPE_LABELS).map(k => `<option value="${k}" ${d.doc_type === k ? "selected" : ""}>${DOC_TYPE_LABELS[k]}</option>`).join("")}
        </select>
      </div>
      <span class="doc-status ${st.cls}">${esc(st.label)}</span>
      <button class="mini-btn danger" data-doc-del="${esc(d.id)}">✕</button>
    </div>`;
  }).join("");

  const analyses = (state.analyses || []).slice().reverse().map(a => {
    const cards = a.findings.map((f, fi) => {
      const cl = state.clusters.find(c => c.id === f.cluster_id);
      if (!cl) return "";
      return `<div class="finding-card">
        <div class="sig-head">
          <span class="sig-dir ${f.classification === "leading" ? "good" : "warn"}">${f.classification === "leading" ? "◇ Leading" : "◆ Lagging"}</span>
          <span class="finding-target">${esc(cl.name)} · ${esc(f.lens_key)}</span>
          ${f.direction ? `<span class="sig-meta">direction: ${esc(f.direction)}</span>` : ""}
        </div>
        <p class="finding-quote">“${esc(f.quote)}”${f.figure ? ` — <strong>${esc(f.figure)}</strong>` : ""}${f.source_ref ? ` <span class="sig-meta">(${esc(f.source_ref)})</span>` : ""}</p>
        <p class="sig-meta">${esc(f.rationale)}${f.suggested_level ? ` · Suggested level: <strong>L${f.suggested_level}${f.suggested_status ? " — " + esc(f.suggested_status) : ""}</strong> (you decide — open the cell to score)` : ""}</p>
        ${f.watch ? `<p class="sig-meta">Watch: <em>${esc(f.watch)}</em></p>` : ""}
        <div class="sig-actions">
          <button class="mini-btn" data-apply-find="${esc(a.id)}|${fi}" ${f.applied ? "disabled" : ""}>${f.applied ? "✓ Applied to cell" : "＋ Apply to cell (evidence" + (f.classification === "leading" && f.direction ? " + leading indicator" : "") + (f.watch ? " + watch" : "") + ")"}</button>
          <button class="mini-btn" data-open-cell="${esc(f.cluster_id)}|${esc(f.lens_key)}">Open cell</button>
        </div>
      </div>`;
    }).join("");
    const roleCards = (a.roles || []).map((r, ri) => {
      const cl = state.clusters.find(c => c.id === r.cluster_id);
      if (!cl) return "";
      const s = roleSummary(r);
      return `<div class="finding-card role-card">
        <div class="sig-head">
          <span class="route-pill rt-${s.route}">${s.meta.label}</span>
          <span class="finding-target">${esc(r.title)}</span>
          <span class="rm-status ${s.status.cls}">${s.status.label}</span>
          <span class="sig-meta">${esc(cl.name)} · criticality ${fmt1(s.idx)} · TKI ${fmt1(s.tki)}</span>
        </div>
        <p class="finding-quote">${esc(r.note || "—")}</p>
        ${r.status_evidence ? `<p class="sig-meta">Basis: ${esc(r.status_evidence)}</p>` : ""}
        <p class="sig-meta">Fix: ${esc(s.meta.fix)}</p>
        <div class="sig-actions">
          <button class="mini-btn" data-apply-role="${esc(a.id)}|${ri}" ${r.applied ? "disabled" : ""}>${r.applied ? "✓ Added to role register" : "＋ Add to role register"}</button>
        </div>
      </div>`;
    }).join("");
    return `<section class="sig-briefing">
      <div class="sig-brief-head">
        <h2>Analysis — ${new Date(a.generated_at).toLocaleString()}</h2>
        <span class="sig-meta">${a.findings.length} findings${(a.roles || []).length ? ` · ${a.roles.length} roles` : ""} · from: ${esc((a.doc_labels || []).join(", "))} · model: ${esc(a.model)}</span>
        <button class="mini-btn danger" data-del-ana="${esc(a.id)}">Delete</button>
      </div>
      ${cards}
      ${roleCards ? `<h3 class="ev-subhead">Roles found in these documents</h3>${roleCards}` : ""}
    </section>`;
  }).join("");

  return `<div class="view-note">Evidence before scores — upload the documents your diagnostic should be grounded in (strategy decks, engagement surveys, annual reports, workforce files, org charts). Text files parse locally and free; PDFs and images are analysed by Claude with your API key. Claude extracts verbatim evidence mapped to your clusters and lenses, classified leading vs lagging — you apply each finding and you keep the scoring pen.</div>
    <div class="sig-controls" style="flex-direction:column;align-items:stretch">
      <div class="dropzone" id="ev-drop">
        <strong>Drop files here</strong> or
        <button class="mini-btn" id="ev-pick">Choose files</button>
        <button class="mini-btn" id="ev-paste">Paste text instead</button>
        <span class="sig-meta">Supported: .pdf .docx .pptx .xlsx .xls .txt .md .csv .json — all parsed locally in your browser · scanned PDFs &amp; images (.png .jpg) are read by Claude with your API key · anything else: Paste text</span>
      </div>
      <div class="tpl-row">
        <span class="sig-kw-label">Not sure what to gather?</span>
        ${Object.keys(TEMPLATES).map(k => `<button class="mini-btn" data-tpl="${k}" title="${esc(TEMPLATES[k].hint)}">↓ ${esc(TEMPLATES[k].label)}</button>`).join("")}
      </div>
      ${docRows ? `<div class="doc-list">${docRows}</div>` : ""}
      <div class="m-row" style="margin-top:2px">
        <button class="btn-navy" id="ev-analyze" ${analyzeBusy ? "disabled" : ""}>${analyzeBusy ? "Analysing…" : "Analyze & synthesize evidence"}</button>
        <span class="sig-meta" id="ev-status">${analyzeBusy ? "Extracting evidence against your clusters and lenses — up to a minute for PDFs." : (cfg.apiKey ? "" : "Text analysis needs a Claude API key (Settings → External intelligence) — or enter the key 'mock' to simulate.")}</span>
      </div>
    </div>
    ${analyses || '<div class="delta-empty">No analyses yet. Add a document and click <strong>Analyze &amp; synthesize evidence</strong> — findings arrive mapped to specific cluster × lens cells, ready to apply.</div>'}`;
}

function bindEvidenceEvents() {
  const pick = $("ev-pick");
  if (!pick) return;
  pick.addEventListener("click", () => $("file-evidence").click());
  $("ev-paste").addEventListener("click", openPasteModal);
  document.querySelectorAll("[data-tpl]").forEach(b => b.addEventListener("click", () => downloadTemplate(b.dataset.tpl)));
  $("ev-analyze").addEventListener("click", runEvidenceAnalysis);
  const drop = $("ev-drop");
  drop.addEventListener("dragover", e => { e.preventDefault(); drop.classList.add("over"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", e => {
    e.preventDefault(); drop.classList.remove("over");
    addEvidenceFiles(e.dataTransfer.files);
  });
  document.querySelectorAll("[data-doc-label]").forEach(inp => inp.addEventListener("change", () => {
    const d = state.documents.find(x => x.id === inp.dataset.docLabel);
    if (d) { d.label = inp.value.trim() || d.name; saveState(); }
  }));
  document.querySelectorAll("[data-doc-type]").forEach(sel => sel.addEventListener("change", () => {
    const d = state.documents.find(x => x.id === sel.dataset.docType);
    if (d) { d.doc_type = sel.value; saveState(); }
  }));
  document.querySelectorAll("[data-doc-del]").forEach(b => b.addEventListener("click", () => {
    state.documents = state.documents.filter(x => x.id !== b.dataset.docDel);
    delete docBlobs[b.dataset.docDel];
    renderAll();
  }));
  document.querySelectorAll("[data-apply-find]").forEach(b => b.addEventListener("click", () => {
    const [aid, fi] = b.dataset.applyFind.split("|");
    applyFinding(aid, parseInt(fi, 10));
  }));
  document.querySelectorAll("[data-open-cell]").forEach(b => b.addEventListener("click", () => {
    const [cid, lk] = b.dataset.openCell.split("|");
    openDrawer(cid, lk);
  }));
  document.querySelectorAll("[data-apply-role]").forEach(b => b.addEventListener("click", () => {
    const [aid, ri] = b.dataset.applyRole.split("|");
    applyExtractedRole(aid, parseInt(ri, 10));
  }));
  document.querySelectorAll("[data-del-ana]").forEach(b => b.addEventListener("click", () => {
    state.analyses = state.analyses.filter(x => x.id !== b.dataset.delAna);
    renderAll();
  }));
}

function applyExtractedRole(analysisId, roleIndex) {
  const analysis = (state.analyses || []).find(a => a.id === analysisId);
  const r = analysis && (analysis.roles || [])[roleIndex];
  const cluster = r && state.clusters.find(c => c.id === r.cluster_id);
  if (!r || !cluster) return;
  cluster.roles = cluster.roles || [];
  cluster.roles.push({
    id: "r_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
    title: r.title, status: r.status,
    axisA: { ...r.axisA }, tki: { ...r.tki },
    note: r.note || r.status_evidence || ""
  });
  r.applied = true;
  state.changeLog.push({ at: nowIso(), cluster: cluster.name, lens: "Roles", from: 0, to: 0, rationale: "Role added from document evidence: " + r.title + " (" + r.status + ")", by: state.actor || "You" });
  renderAll();
  toast("Added “" + r.title + "” to the " + cluster.name + " role register.");
}

async function addEvidenceFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;
  state.documents = state.documents || [];   // defensive: pre-migration states
  state.analyses = state.analyses || [];
  for (const f of files) {
    if ((state.documents || []).length >= 15) { toast("Document limit reached (15) — remove one first."); break; }
    try {
      const doc = await ingestFile(f, docBlobs);
      state.documents.push(doc);
      if (doc.kind === "unsupported") toast(f.name + ": " + (doc.parse_error ? "could not be parsed (" + doc.parse_error + ")" : "this format can't be parsed here") + " — save it as PDF or use Paste text.");
    } catch (e) {
      toast(e.message);
    }
  }
  renderAll();
}

function openPasteModal() {
  openModal(`
    <button class="m-close" id="m-close">✕</button>
    <h2>Paste evidence text</h2>
    <p class="m-sub">For content locked in Word/PowerPoint/Excel, emails, or intranet pages — paste the text and label the source. It is treated exactly like an uploaded text document.</p>
    <div class="m-field"><label>Source label</label>
      <input type="text" id="paste-label" placeholder="e.g. Engagement Survey 2026 — divisional cut"></div>
    <div class="m-field"><label>Document type</label>
      <select id="paste-type">${Object.keys(DOC_TYPE_LABELS).map(k => `<option value="${k}">${DOC_TYPE_LABELS[k]}</option>`).join("")}</select></div>
    <div class="m-field"><label>Text</label>
      <textarea id="paste-text" style="min-height:180px" placeholder="Paste the relevant content here…"></textarea></div>
    <div class="m-row"><span class="grow"></span><button class="btn-navy" id="paste-save">Add as evidence</button></div>`);
  $("m-close").addEventListener("click", closeModal);
  $("paste-save").addEventListener("click", () => {
    const text = $("paste-text").value.trim();
    if (!text) { toast("Nothing pasted yet."); return; }
    const label = $("paste-label").value.trim() || "Pasted text";
    state.documents.push({
      id: "doc_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      name: label + " (pasted)", label, doc_type: $("paste-type").value,
      kind: "text", size: text.length, added_at: nowIso(),
      text: text.slice(0, 100000)
    });
    closeModal(); renderAll(); toast("Pasted evidence added.");
  });
}

async function runEvidenceAnalysis() {
  analyzeBusy = true;
  renderView();
  try {
    const analysis = await analyzeEvidence(state, state.documents || [], docBlobs);
    state.analyses = (state.analyses || []).concat([analysis]).slice(-10);
    toast("Analysis ready — " + analysis.findings.length + " findings mapped to your clusters.");
  } catch (e) {
    toast("Analysis failed: " + e.message);
  } finally {
    analyzeBusy = false;
    renderAll();
  }
}

function applyFinding(analysisId, findingIndex) {
  const analysis = (state.analyses || []).find(a => a.id === analysisId);
  const f = analysis && analysis.findings[findingIndex];
  const cluster = f && state.clusters.find(c => c.id === f.cluster_id);
  if (!f || !cluster) return;
  const lensKey = cluster.cells[f.lens_key] ? f.lens_key : state.lenses[0].key;
  const cell = cluster.cells[lensKey];
  const srcLabel = (analysis.doc_labels || []).join(", ") || "Uploaded evidence";
  cell.evidence = cell.evidence || [];
  cell.evidence.push({ label: srcLabel + (f.source_ref ? " · " + f.source_ref : ""), note: f.quote + (f.figure ? " (" + f.figure + ")" : "") });
  if (f.classification === "leading" && f.direction) {
    cell.leading = cell.leading || [];
    cell.leading.push({ name: (f.figure || f.quote).slice(0, 80), signal: f.direction });
  }
  if (f.watch) {
    cell.watch = cell.watch || [];
    if (cell.watch.indexOf(f.watch) === -1) cell.watch.push(f.watch);
  }
  cell.last_updated = nowIso();
  cell.updated_by = state.actor || "You";
  f.applied = true;
  state.changeLog.push({ at: nowIso(), cluster: cluster.name, lens: lensKey, from: cell.level, to: cell.level, rationale: "Document evidence applied: " + f.quote.slice(0, 100), by: cell.updated_by });
  renderAll();
  toast("Finding applied to " + cluster.name + " · " + lensKey + ". Level stays yours — open the cell to score against the suggestion.");
}

/* ---------- View 6: Delta ---------- */
function viewDelta() {
  if (!state.versions.length) {
    return `<div class="delta-empty"><strong>No saved versions yet.</strong><br>
      Click “Save version” in the top bar to snapshot the current diagnostic. Future changes can then be compared here — and momentum in the Trajectory view will use the snapshot as its baseline.</div>`;
  }
  const opts = state.versions.map((v, i) =>
    `<option value="${i}" ${i === state.versions.length - 1 ? "selected" : ""}>${esc(v.version)} — ${esc(v.label)} (${new Date(v.savedAt).toLocaleDateString()})</option>`).join("");
  const sel = $("delta-base") ? parseInt($("delta-base").value, 10) : state.versions.length - 1;
  const base = state.versions[isNaN(sel) ? state.versions.length - 1 : sel];
  const rows = computeDelta(base.snapshot.clusters, state.clusters);
  const dirLabel = { up: "▲ moved up", down: "▼ moved down", added: "＋ added", removed: "－ removed", reworded: "✎ re-worded" };
  const body = rows.length ? rows.map(r => `
    <tr>
      <td><strong>${esc(r.cluster.name)}</strong><br><span style="color:var(--muted)">${esc(r.lensKey)}</span></td>
      <td>${r.from ? `<span class="lvl-pill lv${r.from}">L${r.from}</span>` : "—"}
          <span class="delta-dir">${dirLabel[r.kind] || ""}</span>
          ${r.to ? `<span class="lvl-pill lv${r.to}">L${r.to}</span>` : "—"}</td>
      <td>${esc(r.cell.status)}${r.prevStatus && r.prevStatus !== r.cell.status ? `<br><span style="color:var(--muted)">was: ${esc(r.prevStatus)}</span>` : ""}</td>
      <td>${esc(r.cell.rationale || "—")}</td>
    </tr>`).join("")
    : `<tr><td colspan="4" style="text-align:center;color:var(--muted)">No differences between ${esc(base.version)} and the current working state.</td></tr>`;
  return `<div class="view-note">Recalibration read — what changed since a saved baseline, and why. Level moves are sorted declines-first.</div>
    <div class="delta-controls"><label class="head" style="font-weight:800;font-size:12px">Compare current state against:</label>
      <select id="delta-base">${opts}</select></div>
    <section class="print-section"><table class="delta-table">
      <thead><tr><th style="width:200px">Cluster · Lens</th><th style="width:220px">Movement</th><th style="width:200px">Status now</th><th>Rationale</th></tr></thead>
      <tbody>${body}</tbody></table></section>`;
}

/* ---------- View event binding ---------- */
function bindViewEvents() {
  document.querySelectorAll("[data-cluster][data-lens]").forEach(el => {
    el.addEventListener("click", () => openDrawer(el.dataset.cluster, el.dataset.lens));
  });
  document.querySelectorAll("[data-editcluster]").forEach(el => {
    el.addEventListener("click", e => { e.stopPropagation(); openClusterModal(el.dataset.editcluster); });
  });
  const db = $("delta-base");
  if (db) db.addEventListener("change", renderView);
  const bs = $("board-sort");
  if (bs) bs.addEventListener("change", () => { state.boardSort = bs.value; renderAll(); });
  bindSignalEvents();
  bindEvidenceEvents();
  bindValueChainEvents();
  bindRolesEvents();
}

/* ---------- Upload templates (evidence the rubric actually needs) ---------- */
const TEMPLATES = {
  "role-inventory": {
    file: "role-inventory-template.csv",
    label: "Role inventory (job titles → two-axis scoring)",
    hint: "The org-chart evidence: one row per anchor role. Import it straight back into the Roles view.",
    body: [
      "cluster_id,role_title,status,impact,scarcity,vacancy,pivotal,futurefit,tki_time,tki_codifiability,tki_concentration,tki_consequence,tki_relationship,note",
      "# status = exists | thin | absent. All scores 1-5. Delete these comment rows before importing.",
      "# cluster_id must match a cluster id in your diagnostic (see the Value Chain view's cluster dropdown).",
      "commercial,Head of Pricing / Revenue Management,absent,5,5,4,5,4,3,2,3,4,2,Scarce technical keystone; pricing fragments without it",
      "commercial,Bid & Solutions Architect,thin,4,5,3,4,4,4,3,3,3,3,Live bid economics",
      "gateway,Load Control / Weight & Balance Officer,exists,2,3,5,4,1,5,4,4,5,3,Safety-critical judgement; years to master"
    ].join("\n")
  },
  "value-chain": {
    file: "value-chain-template.csv",
    label: "Value chain / P&L levers (follow the money)",
    hint: "Where the money is earned and spent, and which capability moves each lever.",
    body: [
      "lever_name,figure,share_pct,capability_that_moves_it,pillar_served,cluster_id",
      "# share_pct = rough share of economic weight (0-100). They need not sum to 100.",
      "Revenue quality,$6345M +9%,22,Pricing & revenue management; bid architecture; key accounts,Revenue > $8B,commercial",
      "Staff-cost productivity,$3425M ~54% of revenue,30,AI workforce optimisation; rostering; job redesign,20%+ EBITDA,tdx"
    ].join("\n")
  },
  "evidence-checklist": {
    file: "evidence-checklist.md",
    label: "Evidence checklist (what to gather before scoring)",
    hint: "The document set that makes a diagnostic defensible, with the lens each one grounds.",
    body: [
      "# Evidence checklist — Capability Compass",
      "",
      "Gather these before scoring. Evidence before scores: a level assigned first and justified later is the endemic failure of self-assessed diagnostics.",
      "",
      "| # | Document | Grounds which lens | Why it matters | Have it? |",
      "|---|---|---|---|---|",
      "| 1 | Latest strategy deck / FY ambition | All | Defines what capability must deliver | ☐ |",
      "| 2 | P&L summary or annual report | Value chain | Follow the money — which levers are material | ☐ |",
      "| 3 | Job-title inventory / org chart (with headcount) | Structure, People | Anchor seats: present, thin, or absent | ☐ |",
      "| 4 | Succession / talent review | People | Bench depth, successor readiness | ☐ |",
      "| 5 | Engagement or pulse survey (with benchmark) | Culture | The only defensible culture evidence | ☐ |",
      "| 6 | Programme / transformation status report | Process | Deployment vs adoption — the stall predictor | ☐ |",
      "| 7 | Systems landscape or IT roadmap | Process | What is live vs in build | ☐ |",
      "| 8 | Safety / quality / incident report | Culture, Process | Licence-to-operate signals | ☐ |",
      "| 9 | Attrition and hiring-funnel data | People | Leading indicators for the People lens | ☐ |",
      "| 10 | Board papers from the last 2 cycles | All | Decided vs proposed — authority of the evidence | ☐ |",
      "",
      "**As-of dates matter more than file dates.** A July deck showing Q1 numbers is Q1 evidence.",
      "",
      "**Two documents beat one.** The same metric at two dates is what justifies a trajectory call; a single reading only supports a level."
    ].join("\n")
  }
};

function downloadTemplate(key) {
  const t = TEMPLATES[key];
  if (!t) return;
  const blob = new Blob([t.body], { type: t.file.endsWith(".md") ? "text/markdown" : "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = t.file;
  a.click();
  URL.revokeObjectURL(a.href);
  toast("Template downloaded: " + t.file);
}

/* Minimal RFC-4180-ish CSV parser (handles quoted fields and commas). */
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.length && !(r.length === 1 && !r[0].trim()));
}

function importRolesCsv(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const rows = parseCsv(String(reader.result)).filter(r => !String(r[0]).trim().startsWith("#"));
      if (!rows.length) throw new Error("empty file");
      const header = rows[0].map(h => h.trim().toLowerCase());
      const col = n => header.indexOf(n);
      const need = ["cluster_id", "role_title", "status"];
      const missing = need.filter(n => col(n) === -1);
      if (missing.length) throw new Error("missing column(s): " + missing.join(", "));
      const num = (r, n, d) => {
        const i = col(n);
        const v = i === -1 ? NaN : parseFloat(r[i]);
        return isNaN(v) ? d : Math.max(1, Math.min(5, v));
      };
      let added = 0, skipped = 0;
      rows.slice(1).forEach(r => {
        const cid = (r[col("cluster_id")] || "").trim();
        const title = (r[col("role_title")] || "").trim();
        const cl = state.clusters.find(c => c.id === cid);
        if (!cl || !title) { skipped++; return; }
        const status = (r[col("status")] || "exists").trim().toLowerCase();
        cl.roles = cl.roles || [];
        cl.roles.push({
          id: "r_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
          title,
          status: ROLE_STATUSES.indexOf(status) !== -1 ? status : "exists",
          axisA: {
            impact: num(r, "impact", 3), scarcity: num(r, "scarcity", 3), vacancy: num(r, "vacancy", 3),
            pivotal: num(r, "pivotal", 3), futurefit: num(r, "futurefit", 3)
          },
          tki: {
            time: num(r, "tki_time", 3), codifiability: num(r, "tki_codifiability", 3),
            concentration: num(r, "tki_concentration", 3), consequence: num(r, "tki_consequence", 3),
            relationship: num(r, "tki_relationship", 3)
          },
          note: col("note") !== -1 ? (r[col("note")] || "").trim() : ""
        });
        added++;
      });
      renderAll();
      toast(`Imported ${added} role${added === 1 ? "" : "s"}` + (skipped ? ` · ${skipped} row(s) skipped (unknown cluster_id or blank title)` : ""));
    } catch (e) {
      toast("Roles import failed: " + e.message);
    }
  };
  reader.readAsText(file);
}

/* ============================================================
   DRAWER (drill-down + editing)
   ============================================================ */
function openDrawer(clusterId, lensKey) {
  const cluster = state.clusters.find(c => c.id === clusterId);
  if (!cluster || !cluster.cells[lensKey]) return;
  drawerCtx = { clusterId, lensKey, pendingLevel: cluster.cells[lensKey].level };
  renderDrawer();
  $("drawer").classList.add("open");
  $("drawer-backdrop").classList.add("open");
}
function closeDrawer() {
  drawerCtx = null;
  $("drawer").classList.remove("open");
  $("drawer-backdrop").classList.remove("open");
}

function renderDrawer() {
  const cluster = state.clusters.find(c => c.id === drawerCtx.clusterId);
  const lens = state.lenses.find(l => l.key === drawerCtx.lensKey);
  const cell = cluster.cells[drawerCtx.lensKey];
  const t = cellTrajectory(state, cluster, drawerCtx.lensKey);
  const ml = trajectoryLabel(t);
  const proj = projectedLevel(cell, t);
  const conf = cellConfidence(cell);
  const mix = evidenceMix(cell);
  const mixMeta = {
    both: { label: "Leading + lagging evidence", cls: "good" },
    leading: { label: "Leading evidence only", cls: "good" },
    lagging: { label: "Rear-view evidence only — trajectory confidence capped", cls: "warn" },
    none: { label: "No evidence recorded", cls: "warn" }
  }[mix];
  const cls = CLASS_META[classifyCell(cell, t)].label;
  const rubricText = (state.rubric[lens.key] || {})["L" + drawerCtx.pendingLevel] || "";

  const liRows = (cell.leading || []).map((li, i) => `
    <div class="li-row">
      <input type="text" value="${esc(li.name)}" data-li-name="${i}" placeholder="Indicator name">
      <select data-li-sig="${i}">
        <option value="improving" ${li.signal === "improving" ? "selected" : ""}>↗ Improving</option>
        <option value="stable" ${li.signal === "stable" ? "selected" : ""}>→ Stable</option>
        <option value="declining" ${li.signal === "declining" ? "selected" : ""}>↘ Declining</option>
      </select>
      <button class="mini-btn danger" data-li-del="${i}">✕</button>
    </div>`).join("");

  const evRows = (cell.evidence || []).map((ev, i) => `
    <div class="ev-row">
      <input type="text" value="${esc(ev.label)}" data-ev-label="${i}" placeholder="Source (e.g. Engagement Survey 2026)">
      <input type="text" value="${esc(ev.note || "")}" data-ev-note="${i}" placeholder="What it evidences">
      <button class="mini-btn danger" data-ev-del="${i}">✕</button>
    </div>`).join("");

  const hist = (cell.history || []).slice(-6).reverse().map(h =>
    `<div><strong>L${h.from} → L${h.to}</strong> · ${new Date(h.at).toLocaleDateString()} · ${esc(h.by)}<br>${esc(h.rationale)}</div>`).join("");

  $("drawer").innerHTML = `
    <div class="drawer-head lv${cell.level}">
      <button class="d-close" id="d-close" aria-label="Close">✕</button>
      <div class="d-kicker">Cluster ${cluster.no} · ${esc(cluster.name)} · ${esc(lens.name)} lens</div>
      <h2>${esc(cell.status)}</h2>
      <div class="d-meta">
        <span>L${cell.level} · ${["", "Absent", "Early", "Emerging", "Established"][cell.level]} · ${cell.level}/4</span>
        <span>${ml.sym} ${ml.word}${t.known ? ` (${fmtSigned(t.m)}) · ${t.confidence} confidence` : ""}</span>
        <span>${esc(cls)}${t.known && proj !== cell.level ? ` · toward L${proj} within 2 cycles IF indicators hold` : ""}</span>
        ${conf.grounded ? "" : '<span class="unsupported">Unsupported — add evidence</span>'}
      </div>
      <div class="d-meta" style="margin-top:5px">
        <span class="mix-badge ${mixMeta.cls}">${esc(mixMeta.label)}</span>
        ${t.known ? `<span style="opacity:.85">Basis: ${esc(t.basis)}</span>` : '<span style="opacity:.85">No qualifying trajectory evidence — add leading indicators or save a version snapshot</span>'}
      </div>
    </div>
    <div class="drawer-body">
      <div class="d-section">
        <h4>Maturity level</h4>
        <div class="level-picker" id="lvl-picker">
          ${[1, 2, 3, 4].map(i => `<button class="lv${i} ${i === drawerCtx.pendingLevel ? "sel" : ""}" data-lvl="${i}">L${i} ${["", "Absent", "Early", "Emerging", "Established"][i]}</button>`).join("")}
        </div>
        <p style="font-size:11.5px;color:var(--muted);margin:6px 0 0 0"><strong>Rubric — ${esc(lens.name)} L${drawerCtx.pendingLevel}:</strong> ${esc(rubricText)}</p>
        <p style="font-size:11px;color:var(--amber-deep);margin:5px 0 0 0"><strong>Scoring discipline:</strong> between two levels, take the lower. Announcements and approvals justify an improving trajectory — not a higher level. Levels score what is operating today.</p>
      </div>
      <div class="d-field"><label>Status headline (2–4 words)</label>
        <input type="text" id="d-status" value="${esc(cell.status)}"></div>
      <div class="d-field"><label>Rationale — one sentence of evidence with real numbers</label>
        <textarea id="d-rationale">${esc(cell.rationale)}</textarea></div>
      <div class="d-field"><label>Intervention — imperative verb phrase</label>
        <input type="text" id="d-intervention" value="${esc(cell.intervention)}"></div>
      ${cell.intervention ? `<div class="d-callout amber">➜ ${esc(cell.intervention)}</div>` : ""}
      <div class="d-callout navy">Cluster priority move: ${esc(cluster.priority_move)}</div>
      <div class="d-section">
        <h4>Leading indicators (drive the trajectory forecast)</h4>
        <div id="li-list">${liRows || '<p style="font-size:12px;color:var(--muted);margin:0">None yet. Add 1–3 forward-looking signals (e.g. hiring funnel, adoption rate, pulse trend).</p>'}</div>
        <button class="mini-btn" id="li-add" style="margin-top:6px">＋ Add leading indicator</button>
      </div>
      <div class="d-section">
        <h4>Watch signals (falsifiers for the trajectory call)</h4>
        <div id="w-list">${(cell.watch || []).map((w, i) => `
          <div class="ev-row">
            <input type="text" value="${esc(w)}" data-w="${i}" placeholder="Threshold + trigger, e.g. CRM adoption <60% by Oct → flip trajectory down">
            <button class="mini-btn danger" data-w-del="${i}">✕</button>
          </div>`).join("") || '<p style="font-size:12px;color:var(--muted);margin:0">None yet. A trajectory call without a falsifier is a hope, not a call — state what observable event, with a threshold, would prove it wrong and force a re-score.</p>'}</div>
        <button class="mini-btn" id="w-add" style="margin-top:6px">＋ Add watch signal</button>
      </div>
      <div class="d-section">
        <h4>Evidence sources (grounding guardrail)</h4>
        <div id="ev-list">${evRows || '<p style="font-size:12px;color:var(--muted);margin:0">No sources yet — this rating is flagged as unsupported until you cite at least one.</p>'}</div>
        <button class="mini-btn" id="ev-add" style="margin-top:6px">＋ Add evidence source</button>
      </div>
      <div class="d-section"><h4>Underlying detail (items)</h4>
        <div class="d-field"><textarea id="d-items" placeholder="One item per line">${esc((cell.items || []).join("\n"))}</textarea></div>
      </div>
      ${hist ? `<div class="d-section"><h4>Change history</h4><div class="d-history">${hist}</div></div>` : ""}
      <div class="d-field" id="d-rationale-req" style="display:${drawerCtx.pendingLevel !== cell.level ? "block" : "none"}">
        <label>Change rationale (required for a level change)</label>
        <input type="text" id="d-change-rationale" placeholder="Why did the level change? Cite the evidence.">
      </div>
      <div class="d-save-row">
        <button class="btn-save" id="d-save">Save changes</button>
        <span class="d-save-note">Saved locally · logged with timestamp and rationale · updated ${new Date(cell.last_updated).toLocaleDateString()} by ${esc(cell.updated_by)}</span>
      </div>
    </div>`;

  $("d-close").addEventListener("click", closeDrawer);
  document.querySelectorAll("#lvl-picker button").forEach(b => {
    b.addEventListener("click", () => {
      drawerCtx.pendingLevel = parseInt(b.dataset.lvl, 10);
      persistDrawerFields(cluster, cell, false);
      renderDrawer();
    });
  });
  $("li-add").addEventListener("click", () => {
    persistDrawerFields(cluster, cell, false);
    cell.leading = cell.leading || [];
    cell.leading.push({ name: "", signal: "stable" });
    renderDrawer();
  });
  $("ev-add").addEventListener("click", () => {
    persistDrawerFields(cluster, cell, false);
    cell.evidence = cell.evidence || [];
    cell.evidence.push({ label: "", note: "" });
    renderDrawer();
  });
  $("w-add").addEventListener("click", () => {
    persistDrawerFields(cluster, cell, false);
    cell.watch = cell.watch || [];
    cell.watch.push("");
    renderDrawer();
  });
  document.querySelectorAll("[data-w-del]").forEach(b => b.addEventListener("click", () => {
    persistDrawerFields(cluster, cell, false);
    cell.watch.splice(parseInt(b.dataset.wDel, 10), 1); renderDrawer();
  }));
  document.querySelectorAll("[data-li-del]").forEach(b => b.addEventListener("click", () => {
    persistDrawerFields(cluster, cell, false);
    cell.leading.splice(parseInt(b.dataset.liDel, 10), 1); renderDrawer();
  }));
  document.querySelectorAll("[data-ev-del]").forEach(b => b.addEventListener("click", () => {
    persistDrawerFields(cluster, cell, false);
    cell.evidence.splice(parseInt(b.dataset.evDel, 10), 1); renderDrawer();
  }));
  $("d-save").addEventListener("click", () => saveDrawer(cluster, lens, cell));
}

function persistDrawerFields(cluster, cell, includeLevel) {
  cell.status = $("d-status").value.trim() || cell.status;
  cell.rationale = $("d-rationale").value.trim();
  cell.intervention = $("d-intervention").value.trim();
  cell.items = $("d-items").value.split("\n").map(s => s.trim()).filter(Boolean);
  document.querySelectorAll("[data-li-name]").forEach(inp => { cell.leading[parseInt(inp.dataset.liName, 10)].name = inp.value.trim(); });
  document.querySelectorAll("[data-li-sig]").forEach(sel => { cell.leading[parseInt(sel.dataset.liSig, 10)].signal = sel.value; });
  document.querySelectorAll("[data-ev-label]").forEach(inp => { cell.evidence[parseInt(inp.dataset.evLabel, 10)].label = inp.value.trim(); });
  document.querySelectorAll("[data-ev-note]").forEach(inp => { cell.evidence[parseInt(inp.dataset.evNote, 10)].note = inp.value.trim(); });
  cell.watch = cell.watch || [];
  document.querySelectorAll("[data-w]").forEach(inp => { cell.watch[parseInt(inp.dataset.w, 10)] = inp.value.trim(); });
  cell.evidence = cell.evidence.filter(e => e.label || e.note);
  cell.leading = cell.leading.filter(l => l.name);
  cell.watch = cell.watch.filter(Boolean);
  if (includeLevel) cell.level = drawerCtx.pendingLevel;
}

function saveDrawer(cluster, lens, cell) {
  const levelChanged = drawerCtx.pendingLevel !== cell.level;
  let rationale = "";
  if (levelChanged) {
    rationale = $("d-change-rationale").value.trim();
    if (!rationale) {
      toast("A change rationale is required when the level moves.");
      $("d-change-rationale").focus();
      return;
    }
  }
  const from = cell.level;
  persistDrawerFields(cluster, cell, true);
  cell.last_updated = nowIso();
  cell.updated_by = state.actor || "You";
  if (levelChanged) {
    cell.history = cell.history || [];
    cell.history.push({ at: cell.last_updated, from, to: cell.level, rationale, by: cell.updated_by });
    state.changeLog.push({ at: cell.last_updated, cluster: cluster.name, lens: lens.name, from, to: cell.level, rationale, by: cell.updated_by });
  }
  closeDrawer();
  renderAll();
  toast("Cell saved" + (levelChanged ? " — level change logged." : "."));
}

/* ============================================================
   MODALS: wizard, cluster editor, settings, save-version
   ============================================================ */
function openModal(html) { $("modal").innerHTML = html; $("modal-backdrop").classList.add("open"); }
function closeModal() { $("modal-backdrop").classList.remove("open"); }

function openWizard(allowCancel) {
  const cards = PRESETS.map(p => `
    <button class="preset-card" data-preset="${esc(p.industry_id)}">
      <h3>${esc(p.display_name)}</h3><p>${esc(p.description)}</p>
      <span class="p-count">${p.clusters.length} clusters · 4 lenses</span>
    </button>`).join("");
  openModal(`
    ${allowCancel ? '<button class="m-close" id="m-close">✕</button>' : ""}
    <h2>Welcome to the Capability Compass</h2>
    <p class="m-sub">Pick an industry preset to generate your diagnostic scaffold — clusters, lenses, and rubric — or explore the fictional demo first. Everything is editable afterwards. All data stays in this browser.</p>
    <div class="preset-grid">
      <button class="preset-card demo" data-demo="1">
        <h3>▶ Explore the demo</h3><p>A fully populated diagnostic for “Meridian Group”, a fictional aviation-services company — including a prior version so momentum, trajectory, and delta views light up.</p>
        <span class="p-count">Recommended first step</span>
      </button>
      ${cards}
    </div>`);
  if (allowCancel) $("m-close").addEventListener("click", closeModal);
  document.querySelectorAll("[data-demo]").forEach(b => b.addEventListener("click", () => {
    state = migrateState(buildDemoState()); closeModal(); activeView = "matrix"; renderAll();
    toast("Demo loaded — fictional data. Use the menu to start fresh anytime.");
  }));
  document.querySelectorAll("[data-preset]").forEach(b => b.addEventListener("click", () => wizardPreview(b.dataset.preset)));
}

function wizardPreview(presetId) {
  const p = PRESETS.find(x => x.industry_id === presetId);
  openModal(`
    <h2>${esc(p.display_name)}</h2>
    <p class="m-sub">${esc(p.description)} Review the scaffold, name your organisation, then generate. Every cluster, move, and rating is editable later.</p>
    <div class="m-field"><label>Organisation name</label>
      <input type="text" id="wiz-org" value="My Organisation"></div>
    <div class="wiz-preview">
      <h4>Capability clusters (${p.clusters.length})</h4>
      <ul>${p.clusters.map(c => `<li><strong>${esc(c.name)}</strong> — ${esc(c.desc)}<br><em style="color:var(--accent)">➜ ${esc(c.priority_move)}</em></li>`).join("")}</ul>
      <h4>Assessment lenses</h4>
      <ul>${DEFAULT_LENSES.map(l => `<li><strong>${esc(l.name)}</strong> — ${esc(l.sub)}</li>`).join("")}</ul>
      <h4>Maturity scale</h4>
      <ul><li>L1 Absent → L2 Early → L3 Emerging → L4 Established (colorblind-safe navy ramp; amber flags on L1–L2)</li></ul>
    </div>
    <div class="m-row">
      <button class="btn-plain" id="wiz-back">← Back</button>
      <span class="grow"></span>
      <button class="btn-navy" id="wiz-go">Generate diagnostic</button>
    </div>`);
  $("wiz-back").addEventListener("click", () => openWizard(!!state));
  $("wiz-go").addEventListener("click", () => {
    state = migrateState(stateFromPreset(p, $("wiz-org").value.trim()));
    closeModal(); activeView = "matrix"; renderAll();
    toast("Diagnostic scaffold created. Click any cell to start rating with evidence.");
  });
}

function openClusterModal(clusterId) {
  const cl = state.clusters.find(c => c.id === clusterId);
  openModal(`
    <button class="m-close" id="m-close">✕</button>
    <h2>Edit cluster</h2><p class="m-sub">Changes apply immediately across all views.</p>
    <div class="m-field"><label>Name</label><input type="text" id="cm-name" value="${esc(cl.name)}"></div>
    <div class="m-field"><label>One-line description</label><input type="text" id="cm-desc" value="${esc(cl.desc)}"></div>
    <div class="m-field"><label>Priority move — the one sentence of what must be done next</label>
      <textarea id="cm-pm">${esc(cl.priority_move)}</textarea></div>
    <div class="m-row"><span class="grow"></span><button class="btn-navy" id="cm-save">Save cluster</button></div>`);
  $("m-close").addEventListener("click", closeModal);
  $("cm-save").addEventListener("click", () => {
    cl.name = $("cm-name").value.trim() || cl.name;
    cl.desc = $("cm-desc").value.trim();
    cl.priority_move = $("cm-pm").value.trim();
    closeModal(); renderAll(); toast("Cluster updated.");
  });
}

function openSettings() {
  const heroes = state.patterns.map((p, i) => `
    <div class="m-field"><label>Hero pattern ${p.num} — title</label>
      <input type="text" data-hero-title="${i}" value="${esc(p.title)}"></div>
    <div class="m-field"><label>Hero pattern ${p.num} — body</label>
      <textarea data-hero-body="${i}">${esc(p.body)}</textarea></div>`).join("");
  openModal(`
    <button class="m-close" id="m-close">✕</button>
    <h2>Settings</h2><p class="m-sub">Identity, hero patterns, and data management. Everything lives locally in your browser.</p>
    <div class="m-field"><label>Organisation name</label><input type="text" id="set-org" value="${esc(state.orgName)}"></div>
    <div class="m-field"><label>Your name (recorded as the actor on changes)</label><input type="text" id="set-actor" value="${esc(state.actor)}"></div>
    <h2 style="font-size:15px;margin-top:18px">External intelligence (Claude API)</h2>
    <p class="m-sub" style="margin-bottom:10px">Optional. Enables the <strong>Signals</strong> view: scanning the latest external market research and calibrating the diagnostic against it. Your key is stored only in this browser, is never included in exports, and is sent only to Anthropic's API. Enter <code>mock</code> to try the feature with simulated data at no cost.</p>
    <div class="m-field"><label>Anthropic API key</label>
      <input type="password" id="set-api-key" value="${esc(getApiConfig().apiKey)}" placeholder="sk-ant-… (or 'mock' to simulate)" autocomplete="off"></div>
    <div class="m-field"><label>Model</label>
      <select id="set-model">
        ${MODEL_CHOICES.map(m => `<option value="${esc(m.id)}" ${getApiConfig().model === m.id ? "selected" : ""}>${esc(m.label)}</option>`).join("")}
        <option value="__custom__" ${MODEL_CHOICES.every(m => m.id !== getApiConfig().model) ? "selected" : ""}>Custom model ID…</option>
      </select></div>
    <div class="m-field" id="set-model-custom-wrap" style="display:${MODEL_CHOICES.every(m => m.id !== getApiConfig().model) ? "block" : "none"}">
      <label>Custom model ID</label>
      <input type="text" id="set-model-custom" value="${esc(MODEL_CHOICES.every(m => m.id !== getApiConfig().model) ? getApiConfig().model : "")}" placeholder="e.g. claude-sonnet-4-6"></div>
    <div class="m-row" style="margin-top:4px;margin-bottom:6px">
      <button class="btn-plain" id="btn-test-conn">Test connection</button>
      <button class="btn-plain" id="btn-clear-key" style="color:var(--amber-deep)">Remove key</button>
      <span class="grow"></span>
      <span id="conn-status" style="font-size:12px;color:var(--muted)"></span>
    </div>
    <h2 style="font-size:15px;margin-top:18px">Priority Board hero patterns</h2>
    ${heroes}
    <div class="m-row">
      <button class="btn-plain" id="set-wizard">Change industry / start fresh…</button>
      <button class="btn-plain" id="set-reset" style="color:var(--amber-deep)">Erase all local data</button>
      <span class="grow"></span>
      <button class="btn-navy" id="set-save">Save settings</button>
    </div>`);
  $("m-close").addEventListener("click", closeModal);
  const readModelChoice = () => {
    const sel = $("set-model").value;
    if (sel !== "__custom__") return sel;
    return $("set-model-custom").value.trim() || DEFAULT_MODEL;
  };
  const persistApiConfig = () => setApiConfig({ apiKey: $("set-api-key").value.trim(), model: readModelChoice() });
  $("set-model").addEventListener("change", () => {
    $("set-model-custom-wrap").style.display = $("set-model").value === "__custom__" ? "block" : "none";
  });
  $("btn-test-conn").addEventListener("click", async () => {
    persistApiConfig();
    const status = $("conn-status");
    status.textContent = "Testing…";
    try {
      const r = await testConnection(getApiConfig());
      status.textContent = "✓ " + r.note;
    } catch (e) {
      status.textContent = "✗ " + e.message;
    }
  });
  $("btn-clear-key").addEventListener("click", () => {
    clearApiConfig();
    $("set-api-key").value = "";
    $("conn-status").textContent = "Key removed from this browser.";
  });
  $("set-save").addEventListener("click", () => {
    state.orgName = $("set-org").value.trim() || state.orgName;
    state.actor = $("set-actor").value.trim() || "You";
    persistApiConfig();
    document.querySelectorAll("[data-hero-title]").forEach(inp => { state.patterns[parseInt(inp.dataset.heroTitle, 10)].title = inp.value.trim(); });
    document.querySelectorAll("[data-hero-body]").forEach(inp => { state.patterns[parseInt(inp.dataset.heroBody, 10)].body = inp.value.trim(); });
    closeModal(); renderAll(); toast("Settings saved.");
  });
  $("set-wizard").addEventListener("click", () => openWizard(true));
  $("set-reset").addEventListener("click", () => {
    if (confirm("Erase ALL locally stored diagnostic data? Export a JSON backup first if you want to keep it.")) {
      localStorage.removeItem(STORE_KEY);
      state = null; closeModal(); openWizard(false);
    }
  });
}

function openSaveVersion() {
  const next = "v" + (state.versions.length + 1) + ".0";
  openModal(`
    <button class="m-close" id="m-close">✕</button>
    <h2>Save a version snapshot</h2>
    <p class="m-sub">Snapshots power the Delta view and anchor the momentum baseline in the Trajectory view. Save one at every recalibration (quarterly refresh, post-offsite, EES release…).</p>
    <div class="m-field"><label>Version tag</label><input type="text" id="sv-tag" value="${esc(next)}"></div>
    <div class="m-field"><label>Label — what moment does this capture?</label>
      <input type="text" id="sv-label" placeholder="e.g. Q3 2026 refresh after strategy offsite"></div>
    <div class="m-row"><span class="grow"></span><button class="btn-navy" id="sv-save">Save snapshot</button></div>`);
  $("m-close").addEventListener("click", closeModal);
  $("sv-save").addEventListener("click", () => {
    state.versions.push({
      version: $("sv-tag").value.trim() || next,
      label: $("sv-label").value.trim() || "Snapshot",
      savedAt: nowIso(),
      snapshot: { clusters: JSON.parse(JSON.stringify(state.clusters)), patterns: JSON.parse(JSON.stringify(state.patterns)) }
    });
    state.currentVersion = ($("sv-tag").value.trim() || next) + "+ (working)";
    closeModal(); renderAll(); toast("Version saved — Delta and Trajectory now use it as baseline.");
  });
}

/* ---------- Export / import ---------- */
function exportJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = (state.orgName || "diagnostic").replace(/[^a-z0-9]+/gi, "_").toLowerCase() + "_capability_compass.json";
  a.click();
  URL.revokeObjectURL(a.href);
  toast("Exported JSON backup.");
}
function importJson(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = migrateState(JSON.parse(reader.result));
      const errs = validateState(parsed);
      if (errs.length) throw new Error(errs[0]);
      state = parsed;
      renderAll();
      toast("Import successful — file passed contract validation.");
    } catch (e) { toast("Import failed: " + e.message); }
  };
  reader.readAsText(file);
}

/* ============================================================
   BOOT
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".tab").forEach(b => b.addEventListener("click", () => { activeView = b.dataset.view; renderView(); }));
  $("btn-save-version").addEventListener("click", openSaveVersion);
  $("btn-export").addEventListener("click", exportJson);
  $("btn-import").addEventListener("click", () => $("file-import").click());
  $("file-import").addEventListener("change", e => { if (e.target.files[0]) importJson(e.target.files[0]); e.target.value = ""; });
  $("file-evidence").addEventListener("change", e => { addEvidenceFiles(e.target.files); e.target.value = ""; });
  $("file-roles").addEventListener("change", e => { if (e.target.files[0]) importRolesCsv(e.target.files[0]); e.target.value = ""; });
  $("btn-report").addEventListener("click", () => window.print());
  $("btn-settings").addEventListener("click", openSettings);
  $("drawer-backdrop").addEventListener("click", closeDrawer);
  document.addEventListener("keydown", e => { if (e.key === "Escape") { closeDrawer(); closeModal(); } });

  state = loadState();
  if (state) renderAll();
  else openWizard(false);
});
