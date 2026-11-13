/* ============================================================
   Capability Compass — Workflow views
   Journey (where am I?), Charter (Stage 0), Hand-off (Stage 1
   gate, pilots, packet) and the Scoreboard additions (Stage 5).
   All logic lives in handoff.js; this file only draws and binds.
   ============================================================ */

const STATUS_WORD = { done: "Done", doing: "In progress", todo: "Not started", elsewhere: "In another app" };

/* ---------- Journey: the six stages on one screen ---------- */
function viewJourney() {
  const stages = journeyStages(state);
  const next = stages.find(s => s.here && s.status !== "done") || stages[5];
  const ch = state.charter;
  const cards = stages.map(s => `
    <div class="jr-card ${s.here ? "here" : "away"} st-${s.status}">
      <div class="jr-top"><span class="jr-n">${s.n}</span><span class="jr-name">${esc(s.name)}</span>
        <span class="jr-status">${STATUS_WORD[s.status]}</span></div>
      <p class="jr-q">${esc(s.q)}</p>
      <p class="jr-app">${esc(s.app)}</p>
      <p class="jr-detail">${esc(s.detail)}</p>
      <button class="mini-btn" data-goto="${esc(s.view)}">${s.here ? "Open" : (s.n === 3 ? "Open Current State" : "Get the brief")} →</button>
    </div>`).join("");
  return `<div class="view-note"><strong>Six stages, four apps, one thread.</strong> This app does Stage 0, Stage 1 and Stage 5, and writes the hand-off the other three apps start from. Everything keeps the same ID from here to the board paper.</div>
    <section class="print-section">
      <div class="jr-next">
        <div><span class="jr-next-k">Next step</span>
          <strong>Stage ${next.n} · ${esc(next.name)}</strong>
          <p>${esc(next.detail)}</p></div>
        <button class="btn-navy" data-goto="${esc(next.view)}">Continue →</button>
      </div>
      <div class="jr-grid">${cards}</div>
      <div class="jr-foot">
        <span><strong>Engagement key</strong> <span class="ref-chip">${esc(ch.engagementKey)}</span> — IDs leave this workspace as <code>${esc(ch.engagementKey)}:${esc(state.clusters[0].ref || "CAP-01")}</code></span>
        <span><strong>Scoring</strong> ${state.clusters.length} ${esc(unitWord(state, true))} × ${state.lenses.length} lenses</span>
        <button class="mini-btn ghost" data-goto="blueprint">How the method works →</button>
      </div>
    </section>`;
}

/* ---------- Charter: Stage 0 ---------- */
function chGate() {
  const r = stage0Readiness(state);
  const ch = state.charter;
  return `<div class="gate-panel ${r.locked ? "locked" : ""}">
    <div class="gate-head">
      <div><h2>Stage 0 gate</h2>
        <p>${r.locked
          ? "Locked " + new Date(r.lockedAt).toLocaleDateString() + " by " + esc(ch.lockedBy || "—") + ". The rules were set before the data was seen; changing them now needs a logged reason."
          : "Settle these before any scoring, so the criteria cannot be bent toward a favoured answer later."}</p></div>
      ${r.locked
        ? `<button class="btn-plain" id="ch-amend">Amend (logged)…</button>`
        : `<button class="btn-navy" id="ch-lock">Lock the charter</button>`}
    </div>
    <ul class="gate-list">${r.checks.map(c => `<li class="${c.ok ? "ok" : "open"}"><span class="gate-mark">${c.ok ? "✓" : "○"}</span>
      <span><strong>${esc(c.label)}</strong> <span class="gate-detail">${esc(c.detail)}</span></span></li>`).join("")}</ul>
  </div>`;
}

function chRows(list, cols, key, dis) {
  return list.map((row, i) => `<tr>
    <td class="ch-ref"><span class="ref-chip">${esc(row.ref || "")}</span></td>
    ${cols.map(c => `<td>${c.render ? c.render(row, i) : `<input type="text" class="vc-in" data-ch="${key}.${i}.${c.k}" value="${esc(row[c.k] || "")}" placeholder="${esc(c.ph || "")}" ${dis}>`}</td>`).join("")}
    <td>${dis ? "" : `<button class="mini-btn danger" data-ch-del="${key}|${i}">✕</button>`}</td>
  </tr>`).join("");
}

function viewCharter() {
  const ch = state.charter;
  const dis = ch.lockedAt ? "disabled" : "";
  const total = criteriaWeightTotal(ch);
  const section = (id, n, title, sub, body, open) => `<details class="ch-sec" ${open ? "open" : ""} data-sec="${id}">
    <summary><span class="ch-n">${n}</span><span class="ch-t">${title}</span><span class="ch-sub">${sub}</span></summary>
    <div class="ch-body">${body}</div></details>`;
  const add = (key, label) => dis ? "" : `<button class="mini-btn" data-ch-add="${key}">＋ ${label}</button>`;
  const table = (heads, rows, empty) => `<table class="vc-table ch-table"><thead><tr><th>ID</th>${heads.map(h => `<th>${h}</th>`).join("")}<th></th></tr></thead>
    <tbody>${rows || `<tr><td colspan="${heads.length + 2}" class="ch-empty">${empty}</td></tr>`}</tbody></table>`;

  const thesis = THESIS_FIELDS.map(f => `<div class="m-field"><label>${esc(f.label)} <span class="ch-hint">${esc(f.hint)}</span></label>
    <textarea data-ch="thesis.${f.key}" ${dis}>${esc(ch.thesis[f.key] || "")}</textarea></div>`).join("");

  const criteriaRows = chRows(ch.criteria, [
    { k: "name", ph: "Criterion" },
    { render: (r, i) => `<select data-ch="criteria.${i}.kind" ${dis}>
        <option value="judged" ${r.kind === "judged" ? "selected" : ""}>Judged 1 to 5, reason recorded</option>
        <option value="measured" ${r.kind === "measured" ? "selected" : ""}>Measured by Org Modeling</option></select>` },
    { render: (r, i) => r.kind === "measured"
      ? `<select data-ch="criteria.${i}.metric" ${dis}>${[["layers", "Layers"], ["total_cost", "Total cost"], ["spans_within_benchmark", "Spans within benchmark"], ["people_affected_pct", "People affected %"]]
        .map(m => `<option value="${m[0]}" ${r.metric === m[0] ? "selected" : ""}>${m[1]}</option>`).join("")}</select>` : `<span class="ch-hint">—</span>` },
    { render: (r, i) => `<input type="number" class="vc-in tiny" data-ch="criteria.${i}.weight" value="${r.weight}" min="0" max="100" step="5" ${dis}>` }
  ], "criteria", dis);

  const decisionRows = chRows(ch.decisions, [
    { k: "stage", ph: "Stage" }, { k: "decision", ph: "The decision" }, { k: "owner", ph: "Owner role" }, { k: "evidence", ph: "Evidence required" },
    { render: (r, i) => `<select data-ch="decisions.${i}.status">
        ${["open", "decided"].map(v => `<option value="${v}" ${(r.status || "open") === v ? "selected" : ""}>${v === "open" ? "Open" : "Decided" + (r.date ? " " + new Date(r.date).toLocaleDateString() : "")}</option>`).join("")}</select>` }
  ], "decisions", "");

  const grammar = `<table class="delta-table ch-grammar"><thead><tr><th>Grade</th><th>On a signal</th><th>What it means</th><th>Org Modeling says</th><th>Process Map Studio says</th></tr></thead><tbody>
    ${EVIDENCE_GRADES.map(g => `<tr><td><span class="grade-pill g-${g.key}">${g.label}</span></td><td>${g.signal}</td><td>${esc(g.means)}</td><td>${g.orgModeling}</td><td>${g.processMap}</td></tr>`).join("")}</tbody></table>`;

  return `<div class="view-note"><strong>Stage 0 — Frame.</strong> What business are we building, and how will we judge the design? Answer it here, before any data is seen. The sections that need your words are open; the rest come with working defaults to review and adjust.</div>
    <section class="print-section">
      <div id="ch-gate">${chGate()}</div>
      <div class="ch-id">
        <div class="m-field"><label>Engagement key <span class="ch-hint">prefixes every ID</span></label>
          <input type="text" data-ch="engagementKey" value="${esc(ch.engagementKey)}" maxlength="10" ${dis}></div>
        <div class="m-field"><label>Sponsor</label><input type="text" data-ch="sponsor" value="${esc(ch.sponsor || "")}" placeholder="Role that signs this off" ${dis}></div>
        <div class="m-field"><label>Scope</label><input type="text" data-ch="scope" value="${esc(ch.scope || "")}" placeholder="What is in, what is out" ${dis}></div>
      </div>
      ${section("thesis", 1, "Business-model thesis", "five sentences — who, what, how it pays, why it lasts, why it scales", thesis, true)}
      ${section("principles", 2, "Operating-model design principles", "each with the evidence that would prove it wrong",
        table(["Principle", "What would prove it wrong"], chRows(ch.principles, [{ k: "text", ph: "A choice the design must honour" }, { k: "refute", ph: "The evidence that would refute it" }], "principles", dis),
          "No principles yet. Write three to six — each a real choice, with what would refute it.") + add("principles", "Add a principle"), true)}
      ${section("refmodel", 3, "Operating-system reference model", "the components a good system has, each with a test a sceptic could check",
        table(["Component", "Observable test of maturity"], chRows(ch.refModel, [{ k: "name", ph: "Component" }, { k: "test", ph: "What you could go and check" }], "refModel", dis), "No components.") + add("refModel", "Add a component"), false)}
      ${section("criteria", 4, "Design criteria", `weights total <strong id="ch-total" class="${Math.abs(total - 100) < 0.01 ? "" : "bad"}">${total}</strong> of 100 — the same list Org Modeling scores options against`,
        table(["Criterion", "How it is scored", "Org Modeling metric", "Weight"], criteriaRows, "No criteria.") + add("criteria", "Add a criterion") +
        `<p class="ch-note">Locked before any option exists. Changing a weight afterwards needs a logged reason — use Amend.</p>`, false)}
      ${section("gate", 5, "Leapfrog gate", "pass or fail tests applied to the final design in Stage 4",
        table(["Test"], chRows(ch.gate, [{ k: "text", ph: "A pass-or-fail test" }], "gate", dis), "No tests.") + add("gate", "Add a test"), false)}
      ${section("rules", 6, "Evidence rules", "one grammar across all four apps",
        grammar + `<p class="ch-note">The grade is the assessor's judgement, made with the evidence in view. The app shows what a grade rests on; it never calculates one.</p>` +
        table(["Rule", "Applies to"], chRows(ch.rules.map((r, i) => Object.assign({ ref: "R" + (i + 1) }, r)), [{ k: "text", ph: "Rule" }, { k: "applies", ph: "Which app" }], "rules", dis), "No rules.") + add("rules", "Add a rule"), false)}
      ${section("decisions", 7, "Decision log", "each stage exists to make one decision — name who makes it",
        table(["Stage", "Decision", "Owner", "Evidence required", "Status"], decisionRows, "No decisions.") +
        `<button class="mini-btn" data-ch-add="decisions">＋ Log a decision</button>` +
        ((ch.amendments || []).length ? `<p class="ch-note"><strong>Amendments after lock:</strong> ${ch.amendments.map(a => esc(new Date(a.at).toLocaleDateString() + " — " + a.reason + " (" + a.by + ")")).join(" · ")}</p>` : ""), true)}
    </section>`;
}

function chSet(path, raw) {
  const parts = path.split(".");
  let o = state.charter;
  for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
  const last = parts[parts.length - 1];
  if (last === "weight") o[last] = Math.max(0, Math.min(100, parseFloat(raw) || 0));
  else if (last === "engagementKey") o[last] = String(raw).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10) || o[last];
  else o[last] = String(raw).trim();
  if (last === "kind" && raw === "measured" && !o.metric) { o.metric = "layers"; o.better = "lower"; }
  if (last === "status") o.date = raw === "decided" ? nowIso() : null;
}

const CH_BLANK = {
  principles: () => ({ text: "", refute: "" }),
  refModel: () => ({ name: "", test: "" }),
  criteria: () => ({ name: "", kind: "judged", weight: 0, description: "" }),
  gate: () => ({ text: "" }),
  rules: () => ({ text: "", applies: "" }),
  decisions: () => ({ stage: "", decision: "", owner: "", evidence: "", status: "open" })
};

function bindCharterEvents() {
  if (!$("ch-gate")) return;
  const openSecs = () => [...document.querySelectorAll(".ch-sec[open]")].map(d => d.dataset.sec);
  const rerender = () => {
    const keep = openSecs();
    renderAll();
    document.querySelectorAll(".ch-sec").forEach(d => { d.open = keep.indexOf(d.dataset.sec) !== -1; });
  };
  document.querySelectorAll("[data-ch]").forEach(el => el.addEventListener("change", () => {
    chSet(el.dataset.ch, el.value);
    // A structural choice redraws; plain typing only refreshes the gate,
    // so the cursor never jumps while writing.
    if (/\.(kind|status)$/.test(el.dataset.ch) || el.dataset.ch === "engagementKey") { rerender(); return; }
    ensureRefs(state); saveState();
    /* Refresh only the checklist. The Lock button stays the same element,
       so a click that started while this field was losing focus still lands. */
    const fresh = document.createElement("div"); fresh.innerHTML = chGate();
    $("ch-gate").querySelector(".gate-list").innerHTML = fresh.querySelector(".gate-list").innerHTML;
    const t = $("ch-total");
    if (t) { const tot = criteriaWeightTotal(state.charter); t.textContent = tot; t.classList.toggle("bad", Math.abs(tot - 100) >= 0.01); }
  }));
  document.querySelectorAll("[data-ch-add]").forEach(b => b.addEventListener("click", () => {
    state.charter[b.dataset.chAdd].push(CH_BLANK[b.dataset.chAdd]());
    rerender();
  }));
  document.querySelectorAll("[data-ch-del]").forEach(b => b.addEventListener("click", () => {
    const [key, i] = b.dataset.chDel.split("|");
    state.charter[key].splice(parseInt(i, 10), 1);
    rerender();
  }));
  bindCharterGate();
}

function bindCharterGate() {
  const lock = $("ch-lock"), amend = $("ch-amend");
  if (lock) lock.addEventListener("click", () => {
    const r = stage0Readiness(state);
    if (r.open && !confirm(`${r.open} charter item(s) are still open:\n\n${r.checks.filter(c => !c.ok).map(c => "• " + c.label).join("\n")}\n\nLock anyway? The open items will be recorded in the decision log.`)) return;
    const ch = state.charter;
    ch.lockedAt = nowIso(); ch.lockedBy = state.actor || "You";
    const d0 = ch.decisions.find(d => /^0/.test(d.stage || ""));
    if (d0) { d0.status = "decided"; d0.date = ch.lockedAt; }
    if (r.open) ch.decisions.push({ stage: "0 Frame", decision: "Charter locked with " + r.open + " item(s) open: " + r.checks.filter(c => !c.ok).map(c => c.label).join("; "), owner: ch.sponsor || "", evidence: "Recorded at lock", status: "decided", date: ch.lockedAt });
    renderAll(); toast("Charter locked. Design criteria now travel to Org Modeling unchanged.");
  });
  if (amend) amend.addEventListener("click", () => {
    const reason = prompt("Why does the charter need to change after it was locked?\nThe reason is written into the decision log.");
    if (reason === null || !reason.trim()) return;
    const ch = state.charter;
    ch.amendments = ch.amendments || [];
    ch.amendments.push({ at: nowIso(), by: state.actor || "You", reason: reason.trim() });
    ch.decisions.push({ stage: "0 Frame", decision: "Charter reopened: " + reason.trim(), owner: ch.sponsor || "", evidence: "Logged reason", status: "decided", date: nowIso() });
    ch.lockedAt = null;
    renderAll(); toast("Charter reopened — the reason is in the decision log. Lock it again when done.");
  });
}

/* ---------- Hand-off: Stage 1 gate, pilot shortlist, packet ---------- */
const HO_APPS = [
  { key: "org_modeling", name: "Org Modeling", stage: "Stages 1 and 4", gets: "Your strategy text and the design criteria locked in Stage 0, to score structural options against." },
  { key: "process_map_studio", name: "Process Map Studio", stage: "Stage 2", gets: "One engagement per pilot, with its process KPI, the roles in scope and the weak cells as interview prompts." },
  { key: "workbench", name: "AI Org Advisory Workbench", stage: "Stage 3", gets: "The roles to start Task Intelligence with: the pilots' roles and every critical seat." }
];

function hoGate() {
  const r = stage1Readiness(state);
  return `<div class="gate-panel ${r.ready ? "ready" : ""}">
    <div class="gate-head">
      <div><h2>Stage 1 gate — <span id="ho-verdict">${esc(r.verdict)}</span></h2>
        <p>Everything scored, nothing silently dropped, a pilot chosen. <span class="gate-tag must">Must</span> items are the gate; the rest make the hand-off stronger and are your call.</p></div>
    </div>
    <ul class="gate-list">${r.checks.map(c => `<li class="${c.ok ? "ok" : "open"}"><span class="gate-mark">${c.ok ? "✓" : "○"}</span>
      <span><strong>${esc(c.label)}</strong>${c.level === "must" ? '<span class="gate-tag must">Must</span>' : ""} <span class="gate-detail">${esc(c.detail)}</span>
      ${c.ok || c.view === "handoff" ? "" : `<button class="link-btn" data-goto="${esc(c.view)}">Fix →</button>`}</span></li>`).join("")}</ul>
  </div>`;
}

function hoBriefs() {
  const packet = buildHandoffPacket(state);
  return HO_APPS.map(a => `<div class="ho-card">
    <div class="ho-card-head"><h3>${esc(a.name)}</h3><span class="sig-meta">${esc(a.stage)}</span></div>
    <p class="ho-gets">${esc(a.gets)}</p>
    <div class="calib-actions">
      <button class="mini-btn" data-ho-copy="${a.key}">Copy the brief</button>
      <button class="mini-btn ghost" data-ho-dl="${a.key}">Download as text</button>
    </div>
    <details class="ho-preview"><summary>Preview</summary><pre id="ho-pre-${a.key}">${esc(handoffBrief(packet, a.key))}</pre></details>
  </div>`).join("");
}

function viewHandoff() {
  const cands = pilotCandidates(state);
  const U = unitWord(state);
  const rows = cands.map(c => {
    const cl = c.cluster, p = c.pilot;
    return `<tr class="${p.decision === "pilot" ? "is-pilot" : ""}">
      <td><span class="ref-chip">${esc(cl.ref)}</span> <strong>${esc(cl.name)}</strong></td>
      <td>${c.money.hasValue ? "≈ " + fmtMoney(state, c.money.atRisk) + (c.money.validated ? "" : " (est.)") : (c.weight ? "Exposure " + Math.round(c.exposure) : "—")}</td>
      <td>${c.weak ? c.weak + " weak" + (c.binding ? " · " + esc(c.binding) : "") : "none weak"}</td>
      <td>${c.seatGaps ? c.seatGaps + " at risk" : "—"}</td>
      <td><select data-pl-decision="${esc(cl.id)}">
        <option value="" ${!p.decision ? "selected" : ""}>Decide…</option>
        <option value="pilot" ${p.decision === "pilot" ? "selected" : ""}>Pilot now</option>
        <option value="later" ${p.decision === "later" ? "selected" : ""}>Later</option>
        <option value="out" ${p.decision === "out" ? "selected" : ""}>Not this cycle</option></select></td>
      <td>${p.decision === "pilot"
        ? `<div class="pl-pilot"><span class="ref-chip">${esc(p.ref || "")}</span>
            <input type="text" class="vc-in" data-pl="${esc(cl.id)}|name" value="${esc(p.name || "")}" placeholder="Value stream to map, e.g. Bid to contract renewal">
            <input type="text" class="vc-in" data-pl="${esc(cl.id)}|kpi" value="${esc(p.kpi || "")}" placeholder="Its process KPI"></div>`
        : `<input type="text" class="vc-in" data-pl="${esc(cl.id)}|reason" value="${esc(p.reason || "")}" placeholder="${p.decision ? "Why — an exclusion needs a stated reason" : "—"}" ${p.decision ? "" : "disabled"}>`}</td>
    </tr>`;
  }).join("");

  return `<div class="view-note"><strong>Stage 1 ends with a decision.</strong> Check the diagnostic is complete, choose where to pilot — and say why each other ${esc(U)} is not chosen — then hand the next app exactly what it needs to start.</div>
    <section class="print-section">
      <div id="ho-gate">${hoGate()}</div>

      <div class="vc-tablewrap">
        <div class="sig-brief-head"><h2>Pilot shortlist</h2>
          <span class="sig-meta">ranked as on the Priority Board — pilot where money at risk, weak cells and seat gaps point the same way</span></div>
        <table class="vc-table ho-table">
          <thead><tr><th>${state.unit === "value-stream" ? "Value stream" : "Capability cluster"}</th><th>Money at risk</th><th>Weak lenses · binding</th><th>Anchor seats</th><th>Decision</th><th>Pilot value stream and KPI — or the reason</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>

      <div class="vc-tablewrap" style="margin-top:18px">
        <div class="sig-brief-head"><h2>Hand off to the next app</h2>
          <span class="sig-meta">one brief per app, shaped to the fields it already has</span>
          <button class="mini-btn" id="ho-packet">Download the full packet (.json)</button></div>
        <p class="ho-note">Each of the other three apps can import the packet file directly; the briefs below say the same thing in words, for pasting or for a reader. What each app finds comes back as a findings file, which you import under <em>Current State</em>. The packet is the complete machine-readable record: every ID, score, grade, pilot and exclusion. It never contains your API key or the text of an uploaded document.</p>
        <div class="ho-grid" id="ho-briefs">${hoBriefs()}</div>
        <details class="ho-preview" style="margin-top:12px"><summary>The shared language — IDs and grades used in all four apps</summary>
          <table class="delta-table"><thead><tr><th>Prefix</th><th>What it names</th><th>Minted by</th><th>Example</th></tr></thead><tbody>
            ${ID_PREFIXES.map(x => `<tr><td><span class="ref-chip">${x.prefix}</span></td><td>${esc(x.what)}</td><td>${esc(x.owner)}</td><td>${esc(state.charter.engagementKey)}:${x.example}</td></tr>`).join("")}</tbody></table>
        </details>
      </div>
    </section>`;
}

function downloadText(filename, text, mime) {
  const blob = new Blob([text], { type: mime || "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  URL.revokeObjectURL(a.href);
}

function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).catch(() => copyTextFallback(text));
  }
  return Promise.resolve(copyTextFallback(text));
}
function copyTextFallback(text) {
  const ta = document.createElement("textarea");
  ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
  document.body.appendChild(ta); ta.select();
  try { document.execCommand("copy"); } catch (e) { /* the preview is still there to copy by hand */ }
  document.body.removeChild(ta);
}

function bindHandoffEvents() {
  if (!$("ho-gate")) return;
  const slug = () => (state.charter.engagementKey || "compass").toLowerCase();
  document.querySelectorAll("[data-pl-decision]").forEach(sel => sel.addEventListener("change", () => {
    const cid = sel.dataset.plDecision;
    const known = (state.pilotRefs || {})[cid] || {};
    state.pilots[cid] = Object.assign({ reason: "", name: known.name || "", kpi: known.kpi || "" }, state.pilots[cid] || {}, { decision: sel.value });
    if (!sel.value) delete state.pilots[cid];
    renderAll();
  }));
  document.querySelectorAll("[data-pl]").forEach(inp => inp.addEventListener("change", () => {
    const [cid, field] = inp.dataset.pl.split("|");
    if (!state.pilots[cid]) return;
    state.pilots[cid][field] = inp.value.trim();
    saveState();
    // Refresh only what depends on it; the table (and the cursor) stay put.
    afterPointer(() => {
      if (!$("ho-gate")) return;
      $("ho-gate").innerHTML = hoGate();
      $("ho-gate").querySelectorAll("[data-goto]").forEach(el => el.addEventListener("click", () => { activeView = el.dataset.goto; renderView(); }));
      const packet = buildHandoffPacket(state);
      HO_APPS.forEach(a => { const pre = $("ho-pre-" + a.key); if (pre) pre.textContent = handoffBrief(packet, a.key); });
    });
  }));
  /* Briefs are built at the moment of the click, so they can never be stale. */
  document.querySelectorAll("[data-ho-copy]").forEach(b => b.addEventListener("click", () => {
    copyText(handoffBrief(buildHandoffPacket(state), b.dataset.hoCopy)).then(() => toast("Brief copied — paste it into " + HO_APPS.find(a => a.key === b.dataset.hoCopy).name + "."));
  }));
  document.querySelectorAll("[data-ho-dl]").forEach(b => b.addEventListener("click", () => {
    downloadText(slug() + "_brief_" + b.dataset.hoDl + ".txt", handoffBrief(buildHandoffPacket(state), b.dataset.hoDl));
  }));
  $("ho-packet").addEventListener("click", () => {
    const packet = buildHandoffPacket(state);
    const errs = validateHandoffPacket(packet);
    if (errs.length) { toast("Packet not written: " + errs[0]); return; }
    downloadText(slug() + "_compass_handoff.json", JSON.stringify(packet, null, 2), "application/json");
    saveState();
    toast(packet.readiness.ready ? "Hand-off packet downloaded." : "Packet downloaded — it records that Stage 1 is not yet complete.");
  });
}

/* ---------- Scoreboard: Stage 5 (drawn above the Delta table) ---------- */
function sparkline(series) {
  const pts = series.map((v, i) => ({ v, i })).filter(p => p.v !== null);
  if (pts.length < 2) return "";
  const W = 120, H = 26, pad = 4;
  const x = i => pad + (i / (series.length - 1)) * (W - pad * 2);
  const y = v => H - pad - ((v - 1) / 3) * (H - pad * 2);       // fixed 1–4 scale: rows are comparable
  const last = pts[pts.length - 1];
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Level over ${pts.length} points, from ${fmt1(pts[0].v)} to ${fmt1(last.v)}">
    <polyline points="${pts.map(p => x(p.i).toFixed(1) + "," + y(p.v).toFixed(1)).join(" ")}"></polyline>
    <circle cx="${x(last.i).toFixed(1)}" cy="${y(last.v).toFixed(1)}" r="3"></circle></svg>`;
}

function moveWord(d) {
  if (Math.abs(d) < 0.05) return `<span class="mv flat">→ no change</span>`;
  return d > 0 ? `<span class="mv up">▲ +${fmt1(d)}</span>` : `<span class="mv down">▼ ${fmt1(d)}</span>`;
}

const FC_WORD = {
  hit: { sym: "✓", word: "Right" }, miss: { sym: "✕", word: "Wrong" },
  pending: { sym: "…", word: "Not yet" }, nocall: { sym: "?", word: "No call made" }
};

function scoreboardHtml() {
  const tr = versionTrend(state), fc = forecastCheck(state);
  const pts = tr.points, first = pts[0], last = pts[pts.length - 1];
  const head = pts.map(p => `<th>${esc(p.label)}${p.when ? `<span>${new Date(p.when).toLocaleDateString()}</span>` : ""}</th>`).join("");
  const kpiRow = (label, get, fmt, betterDown) => `<tr><td><strong>${label}</strong></td>
    ${pts.map(p => `<td>${fmt(get(p))}</td>`).join("")}
    <td>${(() => { const d = get(last) - get(first); const shown = betterDown ? -d : d;
      return Math.abs(d) < 0.05 ? '<span class="mv flat">→ no change</span>' : `<span class="mv ${shown > 0 ? "up" : "down"}">${d > 0 ? "▲ +" : "▼ "}${fmt(Math.abs(d)) === fmt(d) ? fmt(d) : (d > 0 ? fmt(d) : "−" + fmt(Math.abs(d)))}</span>`; })()}</td></tr>`;
  const clusterRows = tr.rows.map(r => {
    const vals = r.series.filter(v => v !== null);
    return `<tr><td><span class="ref-chip">${esc(r.cluster.ref || "")}</span> <strong>${esc(r.cluster.name)}</strong></td>
      ${r.series.map(v => `<td>${v === null ? "—" : fmt1(v)}</td>`).join("")}
      <td>${sparkline(r.series)}</td><td>${vals.length > 1 ? moveWord(vals[vals.length - 1] - vals[0]) : "—"}</td></tr>`;
  }).join("");

  const fcBlock = fc ? `<div class="sb-fc">
      <div class="sig-brief-head"><h2>Were last cycle's calls right?</h2>
        <span class="sig-meta">each direction called at ${esc(fc.baseline)}, checked against what the level has done since</span></div>
      <div class="sb-tally">
        <div class="sb-rate"><span class="sb-big">${fc.rate === null ? "—" : fc.rate + "%"}</span><span>of calls that can be judged were right</span></div>
        ${["hit", "miss", "pending", "nocall"].map(k => `<div class="sb-count fc-${k}"><span class="sb-n">${fc[{ hit: "hits", miss: "misses", pending: "pending", nocall: "nocall" }[k]]}</span><span>${FC_WORD[k].sym} ${FC_WORD[k].word}</span></div>`).join("")}
      </div>
      <p class="ch-note">“Not yet” is an improving or at-risk call whose level has not moved: the forecast runs two cycles, so it is not wrong yet. A call that is wrong twice means the leading indicator behind it should be replaced.</p>
      ${(() => {
        const row = r => `<tr class="fc-${r.verdict}"><td><strong>${esc(r.cluster.name)}</strong> · ${esc(r.lensName)}</td>
          <td>${r.call.sym} ${r.call.word}</td><td>L${r.from} → L${r.to}</td>
          <td><span class="fc-pill fc-${r.verdict}">${FC_WORD[r.verdict].sym} ${FC_WORD[r.verdict].word}</span></td></tr>`;
        const tbl = rows => `<table class="delta-table fc-table"><thead><tr><th>Cell</th><th>Call at ${esc(fc.baseline)}</th><th>Level then → now</th><th>Verdict</th></tr></thead><tbody>${rows.map(row).join("")}</tbody></table>`;
        const look = fc.rows.filter(r => r.verdict === "miss" || r.verdict === "pending");
        const rest = fc.rows.filter(r => r.verdict === "hit" || r.verdict === "nocall");
        // What needs a second look is always on screen; the rest is one click away.
        return (look.length ? tbl(look) : `<div class="alert-empty">No call was wrong and none is still waiting.</div>`) +
          (rest.length ? `<details class="ho-preview fc-rest"><summary>${rest.length} more — right, or no call made</summary>${tbl(rest)}</details>` : "");
      })()}
    </div>` : "";

  return `<div class="vc-tablewrap sb-wrap">
      <div class="sig-brief-head"><h2>Scoreboard</h2>
        <span class="sig-meta">is the system lifting capability, cycle by cycle? ${pts.length - 1} saved version${pts.length === 2 ? "" : "s"} and now</span></div>
      <table class="delta-table sb-table"><thead><tr><th></th>${head}<th>Since ${esc(first.label)}</th></tr></thead><tbody>
        ${kpiRow("Average maturity (of 4)", p => p.avg, v => fmt1(v), false)}
        ${kpiRow("Cells needing action", p => p.weak, v => String(Math.round(v)), true)}
        ${kpiRow("Scores citing a source (%)", p => p.grounded, v => String(Math.round(v)), false)}
      </tbody></table>
      <table class="delta-table sb-table" style="margin-top:12px"><thead><tr><th>${state.unit === "value-stream" ? "Value stream" : "Capability cluster"}</th>${head}<th>Trend</th><th>Since ${esc(first.label)}</th></tr></thead>
        <tbody>${clusterRows}</tbody></table>
      ${pts.length < 3 ? `<p class="ch-note">One saved version gives a before and an after. Save a version at every recalibration and this becomes a trend.</p>` : ""}
    </div>${fcBlock}`;
}
