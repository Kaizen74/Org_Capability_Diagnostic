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
      <button class="mini-btn" data-goto="${esc(s.view)}">${s.here ? "Open" : (s.n === 3 ? "Open Evidence" : "Get the brief")} →</button>
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

/* ---------- Hand-off (filled in by the Stage 1 increment) ---------- */
function viewHandoff() { return `<div class="view-note">Hand-off is being built.</div>`; }
function bindHandoffEvents() {}
