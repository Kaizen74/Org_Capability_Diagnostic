/* ============================================================
   Capability Compass — Application UI
   Views: Signal Matrix, Priority Board, Trajectory, Delta.
   Persistence: localStorage + JSON export/import.
   ============================================================ */

const STORE_KEY = "capability_compass_state_v1";
let state = null;
let activeView = "journey";
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
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); wsRegister(state); }
  catch (e) { toast("Warning: could not save locally (" + e.message + ")"); }
}

/* ---------- Workspaces: several named diagnostics in one browser ---------- */
/* A new diagnostic never overwrites the one on screen: the current one
   is parked first and stays one click away in the workspace list. */
function adoptNewState(fresh, name) {
  if (state) { saveState(); wsPark(state); }
  fresh.workspaceId = wsNewId();
  fresh.workspaceName = (name || fresh.orgName || "Workspace").trim();
  state = fresh;
}

function switchWorkspace(id) {
  if (!state || id === state.workspaceId) return;
  try {
    saveState(); wsPark(state);
    const next = wsTakeParked(id);
    if (!next) { wsTakeParked(state.workspaceId); toast("That workspace could not be found."); renderAll(); return; }
    state = migrateState(next);
    closeDrawer(); activeView = "journey"; renderAll();
    toast("Switched to “" + state.workspaceName + "”.");
  } catch (e) { toast(e.message); }
}

function renderWorkspaceSwitch() {
  const sel = $("ws-switch");
  if (!sel || !state) return;
  const ix = wsReadIndex();
  const rows = ix.list.length ? ix.list : [{ id: state.workspaceId, name: state.workspaceName }];
  sel.innerHTML = rows.map(w => `<option value="${esc(w.id)}" ${w.id === state.workspaceId ? "selected" : ""}>${esc(w.name)}</option>`).join("") +
    `<option disabled>──────────</option>
     <option value="__new__">＋ New workspace…</option>
     <option value="__manage__">Rename or delete this one…</option>`;
}

function openWorkspaceManager() {
  const others = wsReadIndex().list.filter(w => w.id !== state.workspaceId);
  openModal(`
    <button class="m-close" id="m-close">✕</button>
    <h2>This workspace</h2>
    <p class="m-sub">A workspace is one complete diagnostic. Keep one for the group and one per segment or client; they never mix. ${others.length ? "You also have: " + others.map(w => esc(w.name)).join(", ") + "." : "This is your only workspace."}</p>
    <div class="m-field"><label>Workspace name</label><input type="text" id="wsm-name" value="${esc(state.workspaceName)}"></div>
    <div class="m-row">
      <button class="btn-plain danger" id="wsm-delete">Delete this workspace</button>
      <span class="grow"></span>
      <button class="btn-navy" id="wsm-save">Save name</button>
    </div>`);
  $("m-close").addEventListener("click", () => { closeModal(); renderWorkspaceSwitch(); });
  $("wsm-save").addEventListener("click", () => {
    state.workspaceName = $("wsm-name").value.trim() || state.workspaceName;
    closeModal(); renderAll(); toast("Workspace renamed.");
  });
  $("wsm-delete").addEventListener("click", () => {
    if (!confirm(`Delete the workspace “${state.workspaceName}” and everything in it?\n\nExport a JSON backup first if you may want it back. Your other workspaces are not affected.`)) return;
    const gone = state.workspaceId;
    const next = wsReadIndex().list.filter(w => w.id !== gone)[0];
    wsForget(gone);
    localStorage.removeItem(STORE_KEY);
    state = null; closeModal(); closeDrawer();
    if (next) {
      state = migrateState(wsTakeParked(next.id));
      activeView = "journey"; renderAll(); toast("Workspace deleted. Now in “" + state.workspaceName + "”.");
    } else {
      $("view").innerHTML = ""; $("kpis").innerHTML = ""; openWizard(false);
    }
  });
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
  /* v4.4: ten role criteria became six. Convert before validation so an
     older export still imports cleanly rather than failing the contract. */
  (s.clusters || []).forEach(cl => {
    if (!Array.isArray(cl.roles)) cl.roles = [];
    else cl.roles.forEach(migrateRoleScores);
  });
  (s.analyses || []).forEach(a => (a.roles || []).forEach(migrateRoleScores));
  if (!s.valueChain || typeof s.valueChain !== "object") {
    s.valueChain = { currency: "$", revenue: "", as_of: "", stages: DEFAULT_VC_STAGES.map(x => ({ ...x })), levers: [] };
  }
  if (!Array.isArray(s.valueChain.stages) || !s.valueChain.stages.length) {
    s.valueChain.stages = DEFAULT_VC_STAGES.map(x => ({ ...x }));
  }
  if (!Array.isArray(s.valueChain.levers)) s.valueChain.levers = [];
  /* Seed the industry's typical P&L levers once, for diagnostics created
     before starter value chains existed. Weight 0 → nothing invented, and
     the guard means levers the user deleted never come back. */
  if (!s.vc_seeded) {
    s.vc_seeded = true;
    if (!s.valueChain.levers.length) {
      const p = PRESETS.find(x => x.industry_id === s.industry_id);
      if (p && p.value_levers) {
        s.valueChain.levers = JSON.parse(JSON.stringify(p.value_levers))
          .filter(l => (s.clusters || []).some(c => c.id === l.cluster_id));
      }
    }
  }
  if (!s.boardSort) s.boardSort = "auto";
  if (!Array.isArray(s.calibrations)) s.calibrations = [];
  /* v5 workflow layer: Stage 0 charter, pilot shortlist, the unit being
     scored, and a stable ID on everything that leaves this app. */
  if (!s.unit) s.unit = "capability";
  if (!s.charter || typeof s.charter !== "object") s.charter = defaultCharter();
  else {
    const d = defaultCharter();
    Object.keys(d).forEach(k => { if (s.charter[k] === undefined) s.charter[k] = d[k]; });
  }
  if (!s.pilots || typeof s.pilots !== "object" || Array.isArray(s.pilots)) s.pilots = {};
  Object.keys(s.pilots).forEach(cid => { if (!(s.clusters || []).some(c => c.id === cid)) delete s.pilots[cid]; });
  ensureRefs(s);
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
function stateFromPreset(preset, orgName, streams) {
  /* A value-stream workspace scores a business segment end to end: the
     rows are the streams the owner names, not the preset's functions. */
  const useStreams = Array.isArray(streams) && streams.length > 0;
  const rows = useStreams
    ? streams.map((n, i) => ({ id: "vs_" + (i + 1) + "_" + n.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 24), no: i + 1, name: n, desc: "", priority_move: "Score this value stream from evidence, then name the one move that matters." }))
    : preset.clusters;
  const clusters = rows.map(c => {
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
    documents: [], analyses: [], calibrations: [],
    signal_keywords: [...(preset.signal_keywords || [])],
    /* The industry preset seeds the STRUCTURE of the money map, never
       the numbers. Weights start at 0 so nothing is fabricated — the
       board keeps saying "weakest-first" until real weights arrive. */
    unit: useStreams ? "value-stream" : "capability",
    valueChain: {
      currency: "$", revenue: "", as_of: "",
      stages: DEFAULT_VC_STAGES.map(x => ({ ...x })),
      /* The preset's starter levers point at the preset's clusters, so a
         value-stream workspace starts with none rather than orphans. */
      levers: useStreams ? [] : JSON.parse(JSON.stringify(preset.value_levers || []))
    },
    vc_seeded: true,
    boardSort: "auto",
    currentVersion: "v0.1 (working)"
  };
}

/* ============================================================
   RENDERING
   ============================================================ */
/* A field's "change" fires as it loses focus — which is usually the
   mouse-down of the very button the user is about to click. Redrawing
   at that instant replaces the button under the pointer and the click
   is lost. So a redraw requested while the mouse is down waits until
   the click has landed. Drop-downs are exempt (their mouse-up is not
   reliably reported), and a timer guarantees the redraw always happens. */
let pointerDownAt = 0, renderPending = false;
function pointerIsDown() { return pointerDownAt > 0 && Date.now() - pointerDownAt < 700; }
const afterPointerQueue = [];
function flushRender() {
  if (pointerIsDown() || !state) return;
  if (renderPending) { renderPending = false; afterPointerQueue.length = 0; renderAll(); return; }
  while (afterPointerQueue.length) afterPointerQueue.shift()();
}
/* Run a partial screen refresh now, or — if a click is in progress —
   as soon as it has landed. Same reason as the deferred redraw. */
function afterPointer(fn) { if (pointerIsDown()) afterPointerQueue.push(fn); else fn(); }
document.addEventListener("mousedown", e => {
  pointerDownAt = /^(SELECT|OPTION)$/.test(e.target.tagName) ? 0 : Date.now();
  setTimeout(flushRender, 800);
}, true);
document.addEventListener("mouseup", () => { pointerDownAt = 0; setTimeout(flushRender, 0); }, true);

function renderAll() {
  if (pointerIsDown()) { renderPending = true; return; }
  renderPending = false;
  ensureRefs(state);
  document.documentElement.style.setProperty("--lens-count", state.lenses.length);
  $("org-name").textContent = state.orgName + " · " + state.industry_name;
  const fv = $("footer-version");
  if (fv) fv.textContent = state.currentVersion + " · " + (state.versions.length ? state.versions.length + " saved snapshot" + (state.versions.length > 1 ? "s" : "") + " · " : "") + "stored locally only · ";
  $("print-org").textContent = state.orgName;
  $("print-meta").textContent = state.industry_name + " · " + state.currentVersion + " · printed " + new Date().toLocaleDateString();
  renderKpis();
  renderView();
  saveState();
  renderWorkspaceSwitch();   // after the save, which is what lists a new workspace
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
  else if (activeView === "blueprint") el.innerHTML = viewBlueprint();
  else if (activeView === "charter") el.innerHTML = viewCharter();
  else if (activeView === "handoff") el.innerHTML = viewHandoff();
  else if (activeView === "delta") el.innerHTML = viewDelta();
  else el.innerHTML = viewJourney();
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
      ${conf.grounded ? `<span class="conf-dot" ${cell.grade ? `title="Evidence grade: ${gradeMeta(cell.grade).label}"` : ""}>◈ ${esc(conf.label)}${cell.grade ? " · " + gradeMeta(cell.grade).label : ""}</span>` : '<span class="unsupported">Unsupported</span>'}
    </span>
  </button>`;
}

/* ---------- View 1: Signal Matrix ----------
   The rows are ordered by the SAME basis as the Priority Board, so the
   analytical read and the action read tell one story rather than two,
   and each row carries its economic weight — a maturity score with no
   materiality beside it invites the board to fix the cheapest gap. */
function viewMatrix() {
  const cal = calibrationSummary(state);
  const ordered = orderClustersForBoard(state, state.boardSort || "auto");
  const head = `<div class="matrix-head">
      <div class="mh corner">${state.unit === "value-stream" ? "Value stream" : "Capability cluster"}<span class="sub">Weight · priority move always visible</span></div>
      ${state.lenses.map(l => `<div class="mh">${esc(l.name)}<span class="sub">${esc(l.sub)}</span></div>`).join("")}
    </div>`;
  const rows = ordered.clusters.map(cl => {
    const mat = clusterMateriality(state, cl);
    const matChip = mat.mapped
      ? (mat.weight
        ? `<span class="mat-chip" title="${esc(mat.levers.map(l => l.name).join('; '))}">◧ ${mat.weight}% of P&L weight${(() => { const m = clusterMoney(state, cl); return m.hasValue ? " · ≈ " + fmtMoney(state, m.atRisk) + " at risk" + (m.validated ? "" : " (est.)") : " · " + mat.share + "% of the mapped money"; })()}</span>`
        : `<span class="mat-chip none" title="No P&L lever maps to this cluster">◧ no economic weight mapped</span>`)
      : "";
    return `
    <div class="matrix-row">
      <div class="cluster-head">
        <button class="c-edit" data-editcluster="${esc(cl.id)}" title="Edit cluster">Edit</button>
        <span class="c-no" title="Stable ID — quote it in the other apps">${esc(cl.ref || ("CLUSTER " + cl.no))}</span>
        <span class="c-name">${esc(cl.name)}</span>
        <span class="c-desc">${esc(cl.desc)}</span>
        ${matChip}
        <span class="pm-chip"><span class="arrow">➜</span><span>${esc(cl.priority_move)}</span></span>
      </div>
      ${state.lenses.map(l => cellHtml(cl, l)).join("")}
    </div>`;
  }).join("");

  const banner = cal.fit === "aligned" || !cal.findings.length ? "" : `
    <div class="calib-banner ${cal.fit === "misaligned" ? "hot" : ""}">
      <div>
        <strong>Cluster calibration: ${esc({ unmapped: "value chain not mapped", unweighted: "weights not set", misaligned: "misaligned with the money", tuning: "close, needs tuning" }[cal.fit] || cal.fit)}</strong>
        <p>${esc(cal.verdict)}</p>
      </div>
      <button class="mini-btn" data-goto="valuechain">Calibrate clusters →</button>
    </div>`;

  const orderNote = ordered.basis === "value"
    ? "ordered by <strong>value exposure</strong> (economic weight × capability gap), matching the Priority Board"
    : "in cluster order — map P&amp;L weights in the Value Chain view to order by money at risk";
  return `<div class="view-note">Analytical read — every rating is quadruple-encoded (fill + segment bar + label + amber flag) with a momentum arrow, and every row carries the share of the P&amp;L that rides on it. Rows are ${orderNote}. Click any cell to drill down and edit.</div>
    ${banner}
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
        ${(() => { const m = clusterMoney(state, cl); return m.hasValue ? `<span class="b-money" title="Amount at stake ${fmtMoney(state, m.stake)} × capability gap. ${m.validated ? "Validated by finance." : "An estimate until finance validates it."}">≈ ${fmtMoney(state, m.atRisk)} at risk${m.validated ? "" : " (est.)"}</span>` : ""; })()}
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
    ? `<ul>${items.map(a => {
      const wt = clusterEconomicWeight(state, a.cluster.id);
      return `<li><button data-cluster="${esc(a.cluster.id)}" data-lens="${esc(a.lens.key)}">${esc(a.cluster.name)} · ${esc(a.lens.name)}</button> — ${esc(a.cell.status)} (L${a.cell.level}${a.t.known ? ", " + fmtSigned(a.m) : ""})${wt ? ` <span class="alert-wt" title="Share of mapped economic weight riding on this cluster">◧ ${wt}%</span>` : ""}</li>`;
    }).join("")}</ul>`
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
  const rows = orderClustersForBoard(state, state.boardSort || "auto").clusters.map(cl => {
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
          <h3>${sig.ref ? `<span class="ref-chip">${esc(sig.ref)}</span> ` : ""}${esc(sig.headline)}</h3>
          <select class="sig-grade" data-sig-grade="${esc(b.id)}|${si}" title="Your judgement of how solid this signal is">
            <option value="">Grade…</option>
            ${EVIDENCE_GRADES.map(g => `<option value="${g.key}" ${sig.grade === g.key ? "selected" : ""}>${g.signal} (${g.label})</option>`).join("")}
          </select>
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
  document.querySelectorAll("[data-sig-grade]").forEach(sel => sel.addEventListener("change", () => {
    const [bid, si] = sel.dataset.sigGrade.split("|");
    const br = state.briefings.find(x => x.id === bid);
    if (!br) return;
    br.signals[parseInt(si, 10)].grade = sel.value;
    saveState();
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

/* ============================================================
   "How to fill this in" — the two sections that need judgement
   rather than data entry. Kept collapsed so the working view stays
   clean, and written for someone doing this for the first time:
   what goes in each column, one worked line, and the mistake that
   actually happens.
   ============================================================ */
const HOWTO_VALUE_CHAIN = `<details class="howto">
  <summary>How to fill this in <span class="howto-sub">— 20 minutes, six lines, no spreadsheet required</span></summary>
  <div class="howto-body">
    <ol>
      <li><strong>Write the money flow across the top five boxes.</strong> In plain words: who creates the demand, what you operate to serve it, what exactly appears on the invoice, where the revenue goes, and what lands as profit. If you cannot fill the <em>billing unit</em> box in four words, that is the first finding.</li>
      <li><strong>Keep only the levers that genuinely move the P&amp;L.</strong> Your industry's typical levers are already listed — delete what does not apply, rename what you call something else, add what is missing. <strong>Five to eight lines is right.</strong> Twenty lines is a chart of accounts, not a diagnostic.</li>
      <li><strong>Put a rough weight on each (0–100).</strong> This is share of <em>economic significance</em>, not a budget. They need not sum to 100. Ask: “if this went 10% the wrong way, how much would we feel it?”</li>
      <li><strong>Name the capability that moves the number</strong> — a discipline, not a department. “Pricing &amp; revenue management” moves revenue quality; “Finance” does not.</li>
      <li><strong>Pick the cluster that owns it.</strong> One owner per lever. If two clusters could own it, the accountability is genuinely unclear and that is worth knowing.</li>
      <li><strong>Read the Cluster calibration panel below and act on it</strong> before you score a single cell. It tells you whether these are the right clusters for where your money actually is.</li>
    </ol>
    <div class="howto-eg"><strong>One good line:</strong> <code>Staff-cost productivity</code> · <code>$3,425M ≈ 54% of revenue</code> · weight <code>30</code> · <code>AI workforce optimisation, predictive rostering, job redesign</code> · owned by <code>Technology, Data &amp; AI</code></div>
    <div class="howto-warn"><strong>The mistake to avoid:</strong> false precision. Weights are for separating 30% from 5%, never 12% from 14%. Get the order of magnitude right and move on — the exposure ranking only needs to know which levers are big.</div>
  </div>
</details>`;

const HOWTO_ROLES = `<details class="howto">
  <summary>How to fill this in <span class="howto-sub">— six criteria, six remedies; score the anchor seats only</span></summary>
  <div class="howto-body">
    <ol>
      <li><strong>List only the anchor seats</strong> — the handful of real job titles this capability genuinely depends on, as they appear in your HR system. Three to six per cluster. This is not a headcount list; a cluster with twenty rows here has not been thought about.</li>
      <li><strong>Set the status honestly:</strong> <em>exists</em> (filled and effective), <em>thin</em> (one person, interim, or a stretch), <em>absent</em> (nobody holds it). An absent anchor seat is direct evidence that the cluster's Structure and People lenses cannot score above L2.</li>
      <li><strong>Score Axis A — how much rides on the seat, and how hard it is to fill.</strong> Three criteria: <em>Consequence</em> (45%) — what actually breaks if it is empty for three months; <em>Scarcity</em> (35%) — how hard to put a capable person in it; <em>Trend</em> (20%) — is the need growing or fading. The panel above the table states what share of the P&amp;L this cluster carries, so consequence is grounded rather than guessed.</li>
      <li><strong>Score Axis B — how hard it is to rebuild internally,</strong> even when you can hire. Three factors: <em>Time to competence</em>, <em>Locked in heads</em> (undocumented and held by few), and <em>Relationship capital</em>. Click any column heading for the definition and its 1/3/5 anchors.</li>
      <li><strong>Read the routing, not the decimals.</strong> Only which side of 3.5 a score lands on matters. Critical → succession bench. Dual-critical → bench <em>and</em> knowledge capture. Specialist → knowledge transfer and retention, not the succession list. Standard → productivity and automation.</li>
      <li><strong>Bulk entry:</strong> download the <em>Role inventory</em> template in the Evidence view, fill it in a spreadsheet, and import the CSV — or upload your org chart and let the evidence analysis propose the roles for you to accept.</li>
    </ol>
    <div class="howto-eg"><strong>Score against anchors, not feelings.</strong> Every criterion carries a written 1 / 3 / 5 anchor — click a column heading, or the <em>Scoring guide</em> button, to see them. Scarcity 5 = “we have searched and failed, or lost a bid over it”; 3 = “findable within a quarter”; 1 = “replaceable within a month”. Locked in heads 5 = “it lives in one or two heads”; 1 = “documented, and several people do it”.</div>
    <div class="howto-warn"><strong>The mistake to avoid:</strong> scoring seniority. A station head can be low-criticality and very high-tacit; a scarce specialist can be high-criticality and easy to hand over. Keeping the two axes independent is the entire point — collapsing them back into “important people” hides the knowledge-drain risk this section exists to find.</div>
  </div>
</details>`;

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
      <td><div class="lv-name"><span class="ref-chip">${esc(l.ref || "")}</span><input type="text" class="vc-in" data-lv="name|${i}" value="${esc(l.name)}" placeholder="P&L lever"></div></td>
      <td><input type="text" class="vc-in narrow" data-lv="figure|${i}" value="${esc(l.figure || "")}" placeholder="figure"></td>
      <td><div class="lv-stake"><input type="number" class="vc-in tiny" data-lv="value_at_stake|${i}" value="${typeof l.value_at_stake === "number" ? l.value_at_stake : ""}" min="0" step="any" placeholder="—">
        <label title="Tick once finance has validated this figure"><input type="checkbox" data-lv="validated|${i}" ${l.validated ? "checked" : ""}> validated</label></div></td>
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
    ${HOWTO_VALUE_CHAIN}
    <section class="print-section">
      <div class="vc-band">
        <div class="vc-head">
          <div><label>Currency</label><input type="text" id="vc-currency" value="${esc(vc.currency || "")}" style="width:70px"></div>
          <div><label>Revenue</label><input type="text" id="vc-revenue" value="${esc(vc.revenue || "")}" placeholder="e.g. 6.35B"></div>
          <div><label>As of</label><input type="text" id="vc-asof" value="${esc(vc.as_of || "")}" placeholder="e.g. FY2026"></div>
          <div><label title="The unit your amounts at stake are in, e.g. m or bn">Amounts in</label><input type="text" id="vc-unit" value="${esc(vc.value_unit || "")}" placeholder="e.g. m" style="width:60px"></div>
        </div>
        <div class="vc-flow">${stages}</div>
      </div>

      <div class="vc-tablewrap">
        <div class="sig-brief-head">
          <h2>From P&amp;L lever to critical capability</h2>
          <span class="sig-meta">${vc.levers.length} levers · ${mapped}% of weight mapped to clusters${total !== 100 && total > 0 ? ` · weights total ${total}% (they need not sum to 100)` : ""}</span>
          <button class="mini-btn" id="vc-add">＋ Add lever</button>
          ${vc.levers.some(l => l.value_at_stake > 0) ? `<button class="mini-btn ghost" id="vc-derive" title="Set each weight to the lever's share of the total amount at stake">Weights from amounts</button>` : ""}
        </div>
        ${(() => {
          const valued = vc.levers.filter(l => l.value_at_stake > 0);
          if (!valued.length) return `<p class="money-line">Optional: put an estimated amount at stake on each lever and the app shows money at risk in currency. Weights alone are enough to rank.</p>`;
          const atRisk = state.clusters.reduce((a, c) => a + clusterMoney(state, c).atRisk, 0);
          const stake = valued.reduce((a, l) => a + l.value_at_stake, 0);
          const ok = valued.filter(l => l.validated).length;
          return `<p class="money-line"><strong>${fmtMoney(state, atRisk)} at risk</strong> of ${fmtMoney(state, stake)} at stake — amount at stake × capability gap. <span class="est-tag">${ok === valued.length ? "Finance-validated" : "Estimate — " + ok + " of " + valued.length + " figures validated"}</span></p>`;
        })()}
        <table class="vc-table">
          <thead><tr><th>P&amp;L lever</th><th>Figure</th><th title="Optional: your estimate of the amount this lever puts at stake, in ${esc((vc.currency || "") + (vc.value_unit || ""))}. An estimate until finance validates it.">At stake (est.)</th><th title="Share of economic weight">Weight %</th><th>Capability that moves it</th><th>Cluster that owns it</th><th title="Economic weight × capability gap">Exposure</th><th></th></tr></thead>
          <tbody>${rows || '<tr><td colspan="8" style="text-align:center;color:var(--muted)">No levers yet — add the handful of drivers that actually move your P&L.</td></tr>'}</tbody>
        </table>
        ${unmapped.length ? `<p class="sig-meta" style="margin-top:8px">⚑ ${unmapped.length} lever${unmapped.length > 1 ? "s" : ""} not yet mapped to a cluster — that money has no capability owner in this diagnostic.</p>` : ""}
      </div>

      ${viewCalibration()}
    </section>`;
}

/* ---------- Cluster calibration (the value chain tunes the matrix) ----------
   Deterministic findings first (checkable arithmetic on this
   organisation's own numbers), then an optional Claude harvest for the
   thing arithmetic cannot know: how this industry actually organises
   the same capability. Every structural change needs a click. */
const CALIB_SEV = {
  high: { label: "Material", cls: "hot" },
  medium: { label: "Review", cls: "" },
  low: { label: "Tidy", cls: "muted" }
};

function calibProposalCard(cal, p, i) {
  const cl = p.cluster_id ? state.clusters.find(c => c.id === p.cluster_id) : null;
  const into = p.merge_into_id ? state.clusters.find(c => c.id === p.merge_into_id) : null;
  const verb = {
    add: "Add cluster “" + (p.name || "") + "”",
    merge: "Merge “" + (cl ? cl.name : "?") + "” into “" + (into ? into.name : "?") + "”",
    rename: "Rename “" + (cl ? cl.name : "?") + "”" + (p.name ? " → “" + p.name + "”" : ""),
    split: "Split “" + (p.name || "") + "” out of “" + (cl ? cl.name : "?") + "”",
    keep: "Keep “" + (cl ? cl.name : "?") + "” as it is"
  }[p.action];
  const done = p.applied || p.dismissed;
  return `<div class="calib-card ${p.action === "keep" ? "keep" : ""}">
    <div class="calib-card-head">
      <span class="calib-action act-${esc(p.action)}">${esc(p.action)}</span>
      <strong>${esc(verb)}</strong>
      <span class="conf-pill conf-${esc(p.confidence)}">${esc(p.confidence)} confidence</span>
    </div>
    <p class="calib-why">${esc(p.rationale)}</p>
    ${p.evidence ? `<p class="calib-src">Source: ${esc(p.evidence)}</p>`
      : '<p class="calib-src">Rests on the money map only — no external source cited.</p>'}
    ${p.lever_ids.length ? `<p class="calib-src">Levers: ${esc(p.lever_ids.map(id => {
        const lv = state.valueChain.levers.find(l => l.id === id); return lv ? lv.name : id;
      }).join(", "))}</p>` : ""}
    <div class="calib-actions">
      ${p.action === "keep" || done
        ? `<span class="applied-note">${p.applied ? "✓ Applied" : p.dismissed ? "Dismissed" : "No action needed"}</span>`
        : `<button class="mini-btn" data-cal-apply="${esc(cal.id)}|${i}">Apply this change</button>
           <button class="mini-btn ghost" data-cal-skip="${esc(cal.id)}|${i}">Dismiss</button>`}
    </div>
  </div>`;
}

function viewCalibration() {
  const cal = calibrationSummary(state);
  const cfg = getApiConfig();
  const latest = (state.calibrations || [])[state.calibrations.length - 1];

  const findings = cal.findings.length
    ? cal.findings.map(f => {
      const sev = CALIB_SEV[f.severity];
      const btn = f.action === "add-cluster"
        ? `<button class="mini-btn" data-calib-add="${esc(f.leverId)}">＋ Add a cluster for this lever</button>`
        : f.action === "review-cluster"
          ? `<button class="mini-btn" data-calib-open="${esc(f.clusterId)}">Edit or remove this cluster</button>`
          : f.action === "split-cluster"
            ? `<button class="mini-btn" data-calib-split="${esc(f.clusterId)}">Split into two clusters</button>`
            : "";
      return `<div class="calib-find">
        <div class="calib-card-head">
          <span class="calib-sev ${sev.cls}">${sev.label}</span>
          <strong>${esc(f.title)}</strong>
        </div>
        <p class="calib-why">${esc(f.body)}</p>
        ${btn ? `<div class="calib-actions">${btn}</div>` : ""}
      </div>`;
    }).join("")
    : `<div class="alert-empty">Nothing to calibrate — every material lever has an owner and every cluster carries weight.</div>`;

  return `<div class="vc-tablewrap calib-wrap">
    <div class="sig-brief-head">
      <h2>Cluster calibration</h2>
      <span class="sig-meta">does the cluster set fit where the money actually is?</span>
      ${cfg.apiKey
        ? `<button class="mini-btn" id="calib-scan">⟳ Tune clusters with Claude</button>`
        : `<button class="mini-btn ghost" id="calib-settings">Add an API key to research industry norms</button>`}
    </div>
    <div class="calib-verdict fit-${esc(cal.fit)}">
      <span class="calib-fit">${esc({ aligned: "Fits", tuning: "Nearly", misaligned: "Misaligned", unmapped: "Not mapped", unweighted: "No weights" }[cal.fit] || cal.fit)}</span>
      <p>${esc(cal.verdict)}</p>
    </div>
    <p class="view-note inner">The value chain is not only context for the ratings — it is the test of whether these are the <em>right</em> clusters for this organisation. Findings below are arithmetic on your own numbers; the Claude pass adds how this industry organises the same capability. Nothing changes without your click.</p>
    ${findings}
    ${latest ? `<div class="calib-proposals">
      <h4 class="xlens-title">Claude calibration <span class="sig-meta">— ${esc(latest.model)} · ${new Date(latest.generated_at).toLocaleString()} · proposals only</span></h4>
      ${latest.proposals.map((p, i) => calibProposalCard(latest, p, i)).join("")}
    </div>` : ""}
  </div>`;
}

/* ---------- Structural changes (always user-approved) ---------- */
function blankCells() {
  const cells = {};
  state.lenses.forEach(l => {
    cells[l.key] = {
      level: 1, status: "Not yet assessed", rationale: "", intervention: "",
      items: [], evidence: [], leading: [], watch: [], history: [],
      last_updated: nowIso(), updated_by: state.actor || "You"
    };
  });
  return cells;
}

function renumberClusters() { state.clusters.forEach((c, i) => { c.no = i + 1; }); }

function addCluster(name, desc, priorityMove, leverIds) {
  const id = "cl_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  state.clusters.push({
    id, no: state.clusters.length + 1,
    name: (name || "New capability cluster").slice(0, 60),
    desc: desc || "",
    priority_move: priorityMove || "Score this cluster from evidence, then name the one move that matters.",
    cells: blankCells(), roles: []
  });
  (leverIds || []).forEach(lid => {
    const lv = state.valueChain.levers.find(l => l.id === lid);
    if (lv) lv.cluster_id = id;
  });
  renumberClusters();
  return id;
}

/* Merging is destructive to the source cluster's cells, so it asks first
   and moves everything transferable (levers, roles) rather than dropping it. */
function mergeCluster(fromId, intoId) {
  const from = state.clusters.find(c => c.id === fromId);
  const into = state.clusters.find(c => c.id === intoId);
  if (!from || !into || from === into) return false;
  if (!confirm(`Merge “${from.name}” into “${into.name}”?\n\nIts P&L levers and roles move across. Its ${state.lenses.length} maturity ratings and their evidence are discarded — saved version snapshots keep the history.`)) return false;
  state.valueChain.levers.forEach(l => { if (l.cluster_id === fromId) l.cluster_id = intoId; });
  into.roles = (into.roles || []).concat(from.roles || []);
  state.clusters = state.clusters.filter(c => c.id !== fromId);
  if (state.pilots) delete state.pilots[fromId];
  renumberClusters();
  return true;
}

function removeCluster(id) {
  const cl = state.clusters.find(c => c.id === id);
  if (!cl) return false;
  if (state.clusters.length <= 1) { toast("A diagnostic needs at least one cluster."); return false; }
  if (!confirm(`Remove “${cl.name}” from the diagnostic?\n\nIts ratings, evidence and roles go with it. Any P&L lever mapped to it becomes unmapped, and saved version snapshots keep the history.`)) return false;
  state.valueChain.levers.forEach(l => { if (l.cluster_id === id) l.cluster_id = ""; });
  state.clusters = state.clusters.filter(c => c.id !== id);
  if (state.pilots) delete state.pilots[id];
  renumberClusters();
  return true;
}

function applyCalibrationProposal(calId, idx) {
  const cal = (state.calibrations || []).find(c => c.id === calId);
  if (!cal) return;
  const p = cal.proposals[idx];
  if (!p || p.applied || p.dismissed) return;
  let msg = "";
  if (p.action === "add" || p.action === "split") {
    const newId = addCluster(p.name, p.desc, p.priority_move, p.lever_ids);
    if (p.action === "split") {
      // the split-out levers move from the parent to the new cluster
      p.lever_ids.forEach(lid => {
        const lv = state.valueChain.levers.find(l => l.id === lid);
        if (lv) lv.cluster_id = newId;
      });
    }
    msg = `Cluster “${p.name}” added — score it from evidence before it goes to a board.`;
  } else if (p.action === "merge") {
    if (!mergeCluster(p.cluster_id, p.merge_into_id)) return;
    msg = "Clusters merged.";
  } else if (p.action === "rename") {
    const cl = state.clusters.find(c => c.id === p.cluster_id);
    if (!cl) return;
    if (p.name) cl.name = p.name;
    if (p.desc) cl.desc = p.desc;
    if (p.priority_move) cl.priority_move = p.priority_move;
    p.lever_ids.forEach(lid => {
      const lv = state.valueChain.levers.find(l => l.id === lid);
      if (lv) lv.cluster_id = cl.id;
    });
    msg = `Cluster renamed to “${cl.name}”.`;
  }
  p.applied = true;
  (state.changeLog = state.changeLog || []).push({
    at: nowIso(), by: state.actor || "You",
    what: "Cluster calibration applied: " + p.action + " — " + p.rationale
  });
  renderAll();
  toast(msg || "Calibration applied.");
}

let calibBusy = false;
async function runClusterCalibration() {
  if (calibBusy) return;
  calibBusy = true;
  const btn = $("calib-scan");
  if (btn) { btn.disabled = true; btn.textContent = "Researching industry practice…"; }
  try {
    const cal = await proposeClusterCalibration(state);
    state.calibrations = (state.calibrations || []).concat([cal]);
    renderAll();
    toast(cal.proposals.length + " calibration proposal" + (cal.proposals.length > 1 ? "s" : "") + " — nothing applied until you approve it.");
  } catch (e) {
    toast("Calibration failed: " + e.message);
    if (btn) { btn.disabled = false; btn.textContent = "⟳ Tune clusters with Claude"; }
  } finally {
    calibBusy = false;
  }
}

function bindValueChainEvents() {
  const cur = $("vc-currency");
  if (!cur) return;
  const save = () => { saveState(); renderKpis(); };
  cur.addEventListener("change", () => { state.valueChain.currency = cur.value.trim(); save(); });
  $("vc-revenue").addEventListener("change", () => { state.valueChain.revenue = $("vc-revenue").value.trim(); save(); });
  $("vc-asof").addEventListener("change", () => { state.valueChain.as_of = $("vc-asof").value.trim(); save(); });
  $("vc-unit").addEventListener("change", () => { state.valueChain.value_unit = $("vc-unit").value.trim(); renderAll(); });
  const derive = $("vc-derive");
  if (derive) derive.addEventListener("click", () => {
    const tot = state.valueChain.levers.reduce((a, l) => a + (l.value_at_stake > 0 ? l.value_at_stake : 0), 0);
    if (!tot) return;
    if (state.valueChain.levers.some(l => l.share_pct > 0) && !confirm("Replace the current weights with each lever's share of the total amount at stake?")) return;
    state.valueChain.levers.forEach(l => { l.share_pct = l.value_at_stake > 0 ? Math.round((l.value_at_stake / tot) * 100) : 0; });
    renderAll(); toast("Weights set from the amounts at stake.");
  });
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
    if (field === "share_pct") lever[field] = Math.max(0, Math.min(100, parseFloat(el.value) || 0));
    else if (field === "validated") lever.validated = el.checked;
    else if (field === "value_at_stake") {
      const v = parseFloat(el.value);
      if (isNaN(v) || v <= 0) { delete lever.value_at_stake; lever.validated = false; } else lever.value_at_stake = v;
    } else lever[field] = el.value.trim();
    renderAll();
  }));
  document.querySelectorAll("[data-lv-del]").forEach(b => b.addEventListener("click", () => {
    state.valueChain.levers.splice(parseInt(b.dataset.lvDel, 10), 1);
    renderAll();
  }));
  bindCalibrationEvents();
}

function bindCalibrationEvents() {
  const scan = $("calib-scan");
  if (scan) scan.addEventListener("click", runClusterCalibration);
  const setBtn = $("calib-settings");
  if (setBtn) setBtn.addEventListener("click", openSettings);

  /* Deterministic finding → one-click structural fix. */
  document.querySelectorAll("[data-calib-add]").forEach(b => b.addEventListener("click", () => {
    const lv = state.valueChain.levers.find(l => l.id === b.dataset.calibAdd);
    if (!lv) return;
    const seed = (lv.capability || lv.name || "New capability cluster").split(",")[0].trim().slice(0, 60);
    const name = prompt("Name the capability cluster that will own “" + lv.name + "”:", seed);
    if (name === null || !name.trim()) return;
    addCluster(name.trim(),
      "Owns the capability behind “" + lv.name + "” (" + lv.share_pct + "% of economic weight).",
      "Score this cluster from evidence, then name the one move that matters.", [lv.id]);
    renderAll();
    toast("Cluster added and mapped to “" + lv.name + "”. It starts unassessed — score it from evidence.");
  }));

  document.querySelectorAll("[data-calib-open]").forEach(b => b.addEventListener("click", () => {
    openClusterModal(b.dataset.calibOpen);
  }));

  document.querySelectorAll("[data-calib-split]").forEach(b => b.addEventListener("click", () => {
    const cl = state.clusters.find(c => c.id === b.dataset.calibSplit);
    if (!cl) return;
    const own = clusterLevers(state, cl.id).filter(l => (l.share_pct || 0) > 0);
    if (own.length < 2) return;
    const move = own[own.length - 1];
    const name = prompt(
      "Split “" + cl.name + "”.\n\nA new cluster will take over “" + move.name + "” (" + move.share_pct + "%).\nName the new cluster:",
      (move.capability || move.name).split(",")[0].trim().slice(0, 60));
    if (name === null || !name.trim()) return;
    addCluster(name.trim(),
      "Split out of “" + cl.name + "” to carry “" + move.name + "” on its own rating.",
      "Assign a distinct owner and re-score this cluster from evidence.", [move.id]);
    renderAll();
    toast("Split applied — “" + move.name + "” now has its own cluster and its own rating.");
  }));

  /* Claude proposals — apply or dismiss, never automatic. */
  document.querySelectorAll("[data-cal-apply]").forEach(b => b.addEventListener("click", () => {
    const [id, i] = b.dataset.calApply.split("|");
    applyCalibrationProposal(id, parseInt(i, 10));
  }));
  document.querySelectorAll("[data-cal-skip]").forEach(b => b.addEventListener("click", () => {
    const [id, i] = b.dataset.calSkip.split("|");
    const cal = (state.calibrations || []).find(c => c.id === id);
    if (!cal) return;
    cal.proposals[parseInt(i, 10)].dismissed = true;
    renderAll();
  }));
}

/* ============================================================
   Scoring guide — the definition of every criterion, one click from
   the cell you are scoring.

   Anchored scales are the single largest lever on rater agreement, so
   the anchors are not buried in a manual: every column header opens
   its own card with the question, what it covers, what it explicitly
   does NOT cover (the overlap that used to cause double counting),
   the 1/3/5 anchors, and the remedy the score points at.
   ============================================================ */
function criterionCard(c, axis) {
  return `<div class="crit-card">
    <div class="crit-head">
      <span class="crit-axis ${axis === "A" ? "a" : "b"}">Axis ${axis}</span>
      <strong>${esc(c.label)}</strong>
      ${c.wt ? `<span class="crit-wt">${Math.round(c.wt * 100)}% of the index</span>` : `<span class="crit-wt">equal weight</span>`}
    </div>
    <p class="crit-q">${esc(c.q)}</p>
    <p class="crit-what">${esc(c.what)}</p>
    <p class="crit-not">✕ ${esc(c.not)}</p>
    <div class="crit-anchors">
      ${[1, 3, 5].map(n => `<div class="crit-anchor">
        <span class="crit-n n${n}">${n}</span>
        <span>${esc(c.anchors[n])}</span>
      </div>`).join("")}
    </div>
    <p class="crit-fix"><strong>If this scores high →</strong> ${esc(c.fix)}</p>
  </div>`;
}

function openCriterionHelp(key) {
  const all = AXIS_A_WEIGHTS.map(c => ({ c, axis: "A" }))
    .concat(TKI_FACTORS.map(c => ({ c, axis: "B" })));
  const one = key ? all.find(x => x.c.key === key) : null;
  const cards = (one ? [one] : all).map(x => criterionCard(x.c, x.axis)).join("");
  openModal(`
    <button class="m-close" id="m-close">✕</button>
    <h2>${one ? esc(one.c.label) : "Scoring guide"}</h2>
    <p class="m-sub">${one
      ? "Score against the anchors, not against a feeling. Only which side of " + HIGH_TACIT + " the axis lands on changes what you do."
      : "Six criteria, six different remedies. Score against the anchors so two people would land in the same place — the decimal is not the point, the routing is."}</p>
    ${cards}
    ${one ? `<div class="m-row"><button class="btn-plain" id="crit-all">See all six criteria</button><span class="grow"></span><button class="btn-navy" id="crit-done">Back to scoring</button></div>`
          : `<div class="m-row"><span class="grow"></span><button class="btn-navy" id="crit-done">Back to scoring</button></div>`}`);
  $("m-close").addEventListener("click", closeModal);
  $("crit-done").addEventListener("click", closeModal);
  const allBtn = $("crit-all");
  if (allBtn) allBtn.addEventListener("click", () => openCriterionHelp(null));
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
      <td><div class="lv-name"><span class="ref-chip">${esc(r.ref || "")}</span><input type="text" class="vc-in" data-role="title|${esc(r.id)}" value="${esc(r.title)}"></div></td>
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

  return `<div class="view-note"><strong>Roles are the checkable half of the rubric.</strong> A capability nobody is accountable for is not a Level 3. Each role is scored on two independent axes — <em>Criticality</em> (strategic leverage &amp; market scarcity: hard to hire) and <em>Tacit-Knowledge Intensity</em> (hard to rebuild internally, regardless of hiring). They are different risks with different fixes, which is exactly what a seniority-only view misses. <strong>Three criteria per axis</strong>, each pointing at a different remedy — click any column heading for its definition and 1/3/5 anchors. Thresholds are explicit: ≥ ${HIGH_LEVERAGE} is high on either axis.</div>
    ${HOWTO_ROLES}
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

      ${(() => {
        const mat = clusterMateriality(state, cluster);
        if (!mat.mapped) return "";
        return `<div class="role-money">Grounding for the <em>Value-chain pivotalness</em> score: <strong>${esc(cluster.name)}</strong> carries <strong>${mat.weight}%</strong> of mapped economic weight${mat.levers.length ? ` via ${esc(mat.levers.map(l => l.name).join(", "))}` : " — no lever maps to it, so a high pivotalness score here needs a stated non-financial reason"}.</div>`;
      })()}

      <div class="sig-brief-head">
        <h2>Role register</h2>
        <select id="roles-cluster">${state.clusters.map(c => `<option value="${esc(c.id)}" ${c.id === cluster.id ? "selected" : ""}>${esc(c.name)} (${(c.roles || []).length})</option>`).join("")}</select>
        <span class="sig-meta">${(() => { const cov = roleCoverage(cluster); return cov.anchors ? `anchor seats filled: ${cov.exists}/${cov.anchors} (${cov.pct}%)` : "no anchor roles scored yet"; })()}</span>
        <button class="mini-btn" id="role-add">＋ Add role</button>
        <button class="mini-btn" id="role-import">Import roles CSV</button>
        <button class="mini-btn ghost" id="role-guide">ⓘ Scoring guide</button>
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
              ${AXIS_A_WEIGHTS.map(w => `<th class="rt-sub"><button class="crit-btn" data-crit="${esc(w.key)}" title="${esc(w.q)} — click for the 1/3/5 anchors">${esc(w.short)} <span class="crit-i">ⓘ</span><br><span>${Math.round(w.wt * 100)}%</span></button></th>`).join("")}
              ${TKI_FACTORS.map(f => `<th class="rt-sub"><button class="crit-btn" data-crit="${esc(f.key)}" title="${esc(f.q)} — click for the 1/3/5 anchors">${esc(f.short)} <span class="crit-i">ⓘ</span><br><span>1–5</span></button></th>`).join("")}
            </tr>
          </thead>
          <tbody>${roleRows || `<tr><td colspan="12" style="text-align:center;color:var(--muted)">No roles scored for this cluster yet. Add the anchor seats — the ones the capability genuinely depends on.</td></tr>`}</tbody>
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
      axisA: { consequence: 3, scarcity: 3, trend: 3 },
      tki: { time: 3, locked: 3, relationship: 3 },
      note: ""
    });
    renderAll();
  });
  document.querySelectorAll("[data-crit]").forEach(b => b.addEventListener("click", () => {
    openCriterionHelp(b.dataset.crit);
  }));
  const guide = $("role-guide");
  if (guide) guide.addEventListener("click", () => openCriterionHelp(null));
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
  document.querySelectorAll("[data-goto]").forEach(el => el.addEventListener("click", () => {
    activeView = el.dataset.goto; renderView();
  }));
  bindCharterEvents();
  bindHandoffEvents();
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
      "cluster_id,role_title,status,consequence,scarcity,trend,tki_time,tki_locked,tki_relationship,note",
      "# status = exists | thin | absent. All scores 1-5 (halves allowed). Delete these comment rows before importing.",
      "# consequence = what breaks if the seat is empty | scarcity = how hard to fill | trend = is the need growing",
      "# tki_time = how long to become effective | tki_locked = how much lives only in heads | tki_relationship = outside trust",
      "# cluster_id must match a cluster id in your diagnostic (see the Value Chain view's cluster dropdown).",
      "commercial,Head of Pricing / Revenue Management,absent,4.5,5,4,3,2.5,2,Scarce technical keystone; pricing fragments without it",
      "commercial,Bid & Solutions Architect,thin,3.5,5,4,4,3,3,Live bid economics",
      "gateway,Load Control / Weight & Balance Officer,exists,3.5,3,1,5,4,3,Safety-critical judgement; years to master"
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
          /* v4.4 headers, with the v4.2 five-column headers still accepted so
             a spreadsheet filled in last quarter still imports — the same
             migration the app applies to an older saved file. */
          ...(col("consequence") !== -1 || col("impact") === -1
            ? {
              axisA: { consequence: num(r, "consequence", 3), scarcity: num(r, "scarcity", 3), trend: num(r, "trend", 3) },
              tki: { time: num(r, "tki_time", 3), locked: num(r, "tki_locked", 3), relationship: num(r, "tki_relationship", 3) }
            }
            : migrateRoleScores({
              axisA: {
                impact: num(r, "impact", 3), scarcity: num(r, "scarcity", 3), vacancy: num(r, "vacancy", 3),
                pivotal: num(r, "pivotal", 3), futurefit: num(r, "futurefit", 3)
              },
              tki: {
                time: num(r, "tki_time", 3), codifiability: num(r, "tki_codifiability", 3),
                concentration: num(r, "tki_concentration", 3), consequence: num(r, "tki_consequence", 3),
                relationship: num(r, "tki_relationship", 3)
              }
            })),
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
      <input type="text" class="ev-ref" value="${esc(ev.ref || "")}" data-ev-ref="${i}" placeholder="ID" title="Optional: the ID of a finding from another app — a discrepancy (X5), a step (S-03), a hypothesis (H2)">
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
        ${cell.grade ? `<span class="grade-pill g-${esc(cell.grade)}">${gradeMeta(cell.grade).label}</span>` : ""}
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
        <div class="grade-row">
          <label for="d-grade">Evidence grade — your judgement</label>
          <select id="d-grade">
            <option value="">Not graded yet</option>
            ${EVIDENCE_GRADES.map(g => `<option value="${g.key}" ${cell.grade === g.key ? "selected" : ""}>${g.label} — ${esc(g.means)}</option>`).join("")}
          </select>
          <span class="grade-basis">Rests on ${(cell.evidence || []).length} source${(cell.evidence || []).length === 1 ? "" : "s"}, ${(cell.leading || []).length} leading indicator${(cell.leading || []).length === 1 ? "" : "s"}${(cell.evidence || []).some(e => e.ref) ? ", " + (cell.evidence || []).filter(e => e.ref).length + " cross-app finding(s)" : ""}. The app shows this; it does not decide the grade.</span>
        </div>
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
  document.querySelectorAll("[data-ev-ref]").forEach(inp => {
    const v = inp.value.trim();
    if (v) cell.evidence[parseInt(inp.dataset.evRef, 10)].ref = v; else delete cell.evidence[parseInt(inp.dataset.evRef, 10)].ref;
  });
  if ($("d-grade")) cell.grade = $("d-grade").value;
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
    adoptNewState(migrateState(buildDemoState()), "Meridian Group (demo)"); closeModal(); activeView = "journey"; renderAll();
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
    <div class="m-field"><label>Workspace name — what this diagnostic covers (for example “Group” or a segment)</label>
      <input type="text" id="wiz-ws" placeholder="Defaults to the organisation name"></div>
    <div class="m-field"><label>What are you scoring?</label>
      <label class="wiz-radio"><input type="radio" name="wiz-unit" value="capability" checked> <span><strong>Capability clusters</strong> — the ${p.clusters.length} listed below. Best for a whole-enterprise view.</span></label>
      <label class="wiz-radio"><input type="radio" name="wiz-unit" value="value-stream"> <span><strong>Value streams</strong> — one business segment, end to end. You name the streams; each becomes a row.</span></label>
      <textarea id="wiz-streams" style="display:none" placeholder="One value stream per line, for example:&#10;Export cargo handling&#10;Import cargo and delivery&#10;Ground turn operations"></textarea></div>
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
  document.querySelectorAll('[name="wiz-unit"]').forEach(r => r.addEventListener("change", () => {
    $("wiz-streams").style.display = r.value === "value-stream" && r.checked ? "block" : "none";
    document.querySelector(".wiz-preview").style.display = r.value === "value-stream" && r.checked ? "none" : "block";
  }));
  $("wiz-go").addEventListener("click", () => {
    const unit = document.querySelector('[name="wiz-unit"]:checked').value;
    let streams = null;
    if (unit === "value-stream") {
      streams = [...new Set($("wiz-streams").value.split("\n").map(x => x.trim()).filter(Boolean))].slice(0, 12);
      if (streams.length < 2) { toast("Name at least two value streams, one per line."); return; }
    }
    const org = $("wiz-org").value.trim();
    adoptNewState(migrateState(stateFromPreset(p, org, streams)), $("wiz-ws").value.trim() || org);
    closeModal(); activeView = "journey"; renderAll();
    toast("Workspace created. Start with the Charter, then ground and score.");
  });
}

function openClusterModal(clusterId) {
  const cl = state.clusters.find(c => c.id === clusterId);
  const mat = clusterMateriality(state, cl);
  const mergeTargets = state.clusters.filter(c => c.id !== cl.id);
  openModal(`
    <button class="m-close" id="m-close">✕</button>
    <h2>Edit cluster</h2><p class="m-sub">Changes apply immediately across all views.</p>
    <div class="m-field"><label>Name</label><input type="text" id="cm-name" value="${esc(cl.name)}"></div>
    <div class="m-field"><label>One-line description</label><input type="text" id="cm-desc" value="${esc(cl.desc)}"></div>
    <div class="m-field"><label>Priority move — the one sentence of what must be done next</label>
      <textarea id="cm-pm">${esc(cl.priority_move)}</textarea></div>
    <div class="cm-materiality">
      <strong>Economic weight: ${mat.weight}%${mat.mapped && mat.weight ? ` · ${mat.share}% of the mapped money · rank ${mat.rank} of ${mat.of}` : ""}</strong>
      <p>${mat.levers.length
        ? "Carries " + esc(mat.levers.map(l => l.name).join(", ")) + "."
        : "No P&L lever maps to this cluster. Either a lever is missing from the Value Chain, or this is a preset default that does not fit — in which case merge or remove it rather than scoring cells nobody will act on."}</p>
    </div>
    <div class="m-row">
      ${mergeTargets.length ? `<select id="cm-merge-into"><option value="">— merge into… —</option>
        ${mergeTargets.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("")}</select>
        <button class="btn-plain" id="cm-merge">Merge</button>` : ""}
      <button class="btn-plain danger" id="cm-remove">Remove cluster</button>
      <span class="grow"></span><button class="btn-navy" id="cm-save">Save cluster</button>
    </div>`);
  $("m-close").addEventListener("click", closeModal);
  $("cm-save").addEventListener("click", () => {
    cl.name = $("cm-name").value.trim() || cl.name;
    cl.desc = $("cm-desc").value.trim();
    cl.priority_move = $("cm-pm").value.trim();
    closeModal(); renderAll(); toast("Cluster updated.");
  });
  const mergeBtn = $("cm-merge");
  if (mergeBtn) mergeBtn.addEventListener("click", () => {
    const into = $("cm-merge-into").value;
    if (!into) { toast("Pick the cluster to merge into first."); return; }
    if (mergeCluster(cl.id, into)) { closeModal(); renderAll(); toast("Clusters merged — levers and roles moved across."); }
  });
  $("cm-remove").addEventListener("click", () => {
    if (removeCluster(cl.id)) { closeModal(); renderAll(); toast("Cluster removed. Any lever it owned is now unmapped."); }
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
      <button class="btn-plain" id="set-wizard">New workspace…</button>
      <button class="btn-plain" id="set-reset" style="color:var(--amber-deep)">Erase all workspaces</button>
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
    if (confirm("Erase ALL workspaces stored in this browser? Export a JSON backup of each one you want to keep first.")) {
      wsEraseAll(STORE_KEY);
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
      /* An imported file arrives as its own workspace, so it can never
         overwrite the diagnostic that happens to be on screen. */
      adoptNewState(parsed, parsed.workspaceName || parsed.orgName);
      activeView = "journey";
      renderAll();
      toast("Imported as a new workspace — the file passed contract validation.");
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
  $("ws-switch").addEventListener("change", e => {
    const v = e.target.value;
    if (v === "__new__") { renderWorkspaceSwitch(); openWizard(true); }
    else if (v === "__manage__") { renderWorkspaceSwitch(); openWorkspaceManager(); }
    else switchWorkspace(v);
  });
  $("drawer-backdrop").addEventListener("click", closeDrawer);
  document.addEventListener("keydown", e => { if (e.key === "Escape") { closeDrawer(); closeModal(); } });

  state = loadState();
  if (state) renderAll();
  else openWizard(false);
});
