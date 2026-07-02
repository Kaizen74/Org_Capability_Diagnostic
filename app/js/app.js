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
    if (raw) return JSON.parse(raw);
  } catch (e) { /* corrupted state — fall through to wizard */ }
  return null;
}

/* ---------- Blank diagnostic from a preset ---------- */
function stateFromPreset(preset, orgName) {
  const clusters = preset.clusters.map(c => {
    const cells = {};
    DEFAULT_LENSES.forEach(l => {
      cells[l.key] = {
        level: 1, status: "Not yet assessed",
        rationale: "", intervention: "",
        items: [], evidence: [], leading: [], history: [],
        last_updated: nowIso(), updated_by: "—"
      };
    });
    return { id: c.id, no: c.no, name: c.name, desc: c.desc, priority_move: c.priority_move, cells };
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
    clusters, versions: [], changeLog: [],
    currentVersion: "v0.1 (working)"
  };
}

/* ============================================================
   RENDERING
   ============================================================ */
function renderAll() {
  document.documentElement.style.setProperty("--lens-count", state.lenses.length);
  $("org-name").textContent = state.orgName + " · " + state.industry_name;
  $("print-org").textContent = state.orgName;
  $("print-meta").textContent = state.industry_name + " · " + state.currentVersion + " · printed " + new Date().toLocaleDateString();
  renderKpis();
  renderView();
  saveState();
}

function renderKpis() {
  const k = enterpriseKpis(state);
  const vel = momentumLabel(k.velocity);
  const risky = k.alerts.erosion.length + k.alerts.critical.length;
  $("kpis").innerHTML = `
    <div class="kpi"><div class="k-label">Average maturity</div>
      <div class="k-value">${fmt1(k.avg)}<span style="font-size:13px;color:var(--muted)"> / 4</span></div>
      <div class="k-note">${k.cells} cells across ${state.clusters.length} clusters</div></div>
    <div class="kpi ${k.weak ? "flag" : ""}"><div class="k-label">Cells needing action</div>
      <div class="k-value">${k.weak}</div><div class="k-note">rated Level 1–2 (amber flagged)</div></div>
    <div class="kpi"><div class="k-label">Capability velocity</div>
      <div class="k-value">${vel.sym} ${fmtSigned(k.velocity)}</div>
      <div class="k-note">${vel.word} — momentum across all cells</div></div>
    <div class="kpi ${risky ? "flag" : ""}"><div class="k-label">Trajectory alerts</div>
      <div class="k-value">${risky}</div><div class="k-note">erosion / weak-and-declining cells</div></div>
    <div class="kpi ${k.groundedPct < 100 ? "flag" : ""}"><div class="k-label">Evidence coverage</div>
      <div class="k-value">${k.groundedPct}%</div><div class="k-note">of ratings cite at least one source</div></div>`;
}

function renderView() {
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.view === activeView));
  const el = $("view");
  if (activeView === "matrix") el.innerHTML = viewMatrix();
  else if (activeView === "board") el.innerHTML = viewBoard();
  else if (activeView === "trajectory") el.innerHTML = viewTrajectory();
  else el.innerHTML = viewDelta();
  bindViewEvents();
}

/* ---------- Cell fragment (quadruple encoding + momentum) ---------- */
function cellHtml(cluster, lens) {
  const cell = cluster.cells[lens.key];
  if (!cell) return "<div></div>";
  const m = cellMomentum(state, cluster, lens.key);
  const ml = momentumLabel(m);
  const conf = cellConfidence(cell);
  const segs = [1, 2, 3, 4].map(i => `<span class="${i <= cell.level ? "on" : ""}"></span>`).join("");
  return `
  <button class="cell lv${cell.level}" data-cluster="${esc(cluster.id)}" data-lens="${esc(lens.key)}"
      aria-label="${esc(cluster.name)} — ${esc(lens.name)}: level ${cell.level} of 4, ${esc(cell.status)}">
    ${cell.level <= 2 ? '<span class="action-pill">Action</span>' : ""}
    <span class="status">${esc(cell.status)}</span>
    <span class="meta">
      <span class="segbar">${segs}</span>
      <span>L${cell.level} · ${["", "Absent", "Early", "Emerging", "Established"][cell.level]} · ${cell.level}/4</span>
    </span>
    <span class="meta">
      <span class="momo"><span class="sym">${ml.sym}</span>${ml.word}</span>
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
  const sorted = sortWeakestFirst(state.clusters, state.lenses);
  const cards = sorted.map((cl, i) => {
    const avg = clusterAvg(cl, state.lenses);
    const weak = clusterWeakCount(cl, state.lenses);
    const mom = clusterMomentum(state, cl, state.lenses);
    const ml = momentumLabel(mom);
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
        <span class="b-velocity">${ml.sym} ${ml.word} (${fmtSigned(mom)})</span>
      </div>
      <div class="pm-banner"><span class="arrow">➜</span><span>${esc(cl.priority_move)}</span></div>
      <div class="lens-chips">${chips}</div>
    </div>`;
  }).join("");
  return `<div class="view-note">Action read — hero patterns on top, clusters sorted weakest-first (average level ascending, tie-break by count of weak lenses). Edit hero patterns in Settings.</div>
    <section class="print-section"><div class="hero-row">${heroes}</div><div class="board">${cards}</div></section>`;
}

/* ---------- View 3: Trajectory (predictive) ---------- */
function viewTrajectory() {
  const k = enterpriseKpis(state);
  const alertList = (items, empty) => items.length
    ? `<ul>${items.map(a => `<li><button data-cluster="${esc(a.cluster.id)}" data-lens="${esc(a.lens.key)}">${esc(a.cluster.name)} · ${esc(a.lens.name)}</button> — ${esc(a.cell.status)} (L${a.cell.level}, ${fmtSigned(a.m)})</li>`).join("")}</ul>`
    : `<div class="alert-empty">${empty}</div>`;
  const alerts = `<div class="traj-alerts">
    <div class="alert-card warn"><h4>⚠ Weak &amp; declining</h4>${alertList(k.alerts.critical, "None — no weak cell is deteriorating.")}</div>
    <div class="alert-card warn"><h4>⚠ Erosion risk (strengths under threat)</h4>${alertList(k.alerts.erosion, "None — established capabilities are holding.")}</div>
    <div class="alert-card warn"><h4>⚑ Stalled weaknesses</h4>${alertList(k.alerts.stalled, "None — every weak cell has positive momentum.")}</div>
    <div class="alert-card good"><h4>↗ Breakouts underway</h4>${alertList(k.alerts.breakout, "None yet — add leading indicators to weak cells to track progress.")}</div>
  </div>`;

  const pos = v => (((v - 1) / 3) * 92 + 4) + "%";
  const rows = state.clusters.map(cl => {
    const cur = clusterAvg(cl, state.lenses);
    const proj = clusterProjectedAvg(state, cl, state.lenses);
    const mom = clusterMomentum(state, cl, state.lenses);
    const ml = momentumLabel(mom);
    const left = Math.min(cur, proj), right = Math.max(cur, proj);
    const chips = state.lenses.map(l => {
      const cell = cl.cells[l.key];
      if (!cell) return "";
      const m = cellMomentum(state, cl, l.key);
      const mm = momentumLabel(m);
      return `<button class="tl-chip lv${cell.level}" data-cluster="${esc(cl.id)}" data-lens="${esc(l.key)}" title="${esc(l.name)}: ${mm.word}">${esc(l.name)} L${cell.level} ${mm.sym}</button>`;
    }).join("");
    return `<div class="traj-row">
      <div class="traj-name">${esc(cl.name)}<span class="t-sub">${ml.sym} ${ml.word} · momentum ${fmtSigned(mom)}</span></div>
      <div class="scale">
        <div class="track"></div>
        ${[1, 2, 3, 4].map(t => `<span class="tick" style="left:${pos(t)}">L${t}</span>`).join("")}
        ${Math.abs(proj - cur) > 0.01 ? `<div class="link" style="left:${pos(left)};width:calc(${pos(right)} - ${pos(left)})"></div>` : ""}
        <span class="dot" style="left:${pos(cur)}" title="Current average"></span>
        <span class="dot-label" style="left:${pos(cur)}">now ${fmt1(cur)}</span>
        ${Math.abs(proj - cur) > 0.01 ? `<span class="dot proj" style="left:${pos(proj)}" title="Projected average"></span><span class="dot-label" style="left:${pos(proj)};top:38px">proj ${fmt1(proj)}</span>` : ""}
      </div>
      <div class="traj-lenses">${chips}</div>
    </div>`;
  }).join("");

  return `<div class="view-note">Predictive read — trajectory over the next two review cycles, derived from version-over-version movement blended 50/50 with the leading indicators you maintain on each cell. Solid dot = today; outlined dot = projection. The model is deliberately transparent: open any cell to see its indicators.</div>
    <section class="print-section">${alerts}<div class="traj-table">${rows}</div></section>`;
}

/* ---------- View 4: Delta ---------- */
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
  const m = cellMomentum(state, cluster, drawerCtx.lensKey);
  const ml = momentumLabel(m);
  const proj = projectedLevel(cell, m);
  const conf = cellConfidence(cell);
  const cls = CLASS_META[classifyCell(cell, m)].label;
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
        <span>${ml.sym} ${ml.word} (${fmtSigned(m)})</span>
        <span>Trajectory: ${esc(cls)}${proj !== cell.level ? " · projected L" + proj + " in 2 cycles" : ""}</span>
        ${conf.grounded ? "" : '<span class="unsupported">Unsupported — add evidence</span>'}
      </div>
    </div>
    <div class="drawer-body">
      <div class="d-section">
        <h4>Maturity level</h4>
        <div class="level-picker" id="lvl-picker">
          ${[1, 2, 3, 4].map(i => `<button class="lv${i} ${i === drawerCtx.pendingLevel ? "sel" : ""}" data-lvl="${i}">L${i} ${["", "Absent", "Early", "Emerging", "Established"][i]}</button>`).join("")}
        </div>
        <p style="font-size:11.5px;color:var(--muted);margin:6px 0 0 0"><strong>Rubric — ${esc(lens.name)} L${drawerCtx.pendingLevel}:</strong> ${esc(rubricText)}</p>
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
  cell.evidence = cell.evidence.filter(e => e.label || e.note);
  cell.leading = cell.leading.filter(l => l.name);
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
    state = buildDemoState(); closeModal(); activeView = "matrix"; renderAll();
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
    state = stateFromPreset(p, $("wiz-org").value.trim());
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
    <h2 style="font-size:15px;margin-top:18px">Priority Board hero patterns</h2>
    ${heroes}
    <div class="m-row">
      <button class="btn-plain" id="set-wizard">Change industry / start fresh…</button>
      <button class="btn-plain" id="set-reset" style="color:var(--amber-deep)">Erase all local data</button>
      <span class="grow"></span>
      <button class="btn-navy" id="set-save">Save settings</button>
    </div>`);
  $("m-close").addEventListener("click", closeModal);
  $("set-save").addEventListener("click", () => {
    state.orgName = $("set-org").value.trim() || state.orgName;
    state.actor = $("set-actor").value.trim() || "You";
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
      const parsed = JSON.parse(reader.result);
      if (!parsed.clusters || !parsed.lenses) throw new Error("Not a Capability Compass file");
      state = parsed;
      renderAll();
      toast("Import successful.");
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
  $("btn-report").addEventListener("click", () => window.print());
  $("btn-settings").addEventListener("click", openSettings);
  $("drawer-backdrop").addEventListener("click", closeDrawer);
  document.addEventListener("keydown", e => { if (e.key === "Escape") { closeDrawer(); closeModal(); } });

  state = loadState();
  if (state) renderAll();
  else openWizard(false);
});
