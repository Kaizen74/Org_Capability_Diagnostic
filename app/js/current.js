/* ============================================================
   Capability Compass — Current State

   One screen, three parts, in the order the work happens:
     Compare   where the countries differ, and why
     Findings  what the other three apps sent back
     Readout   six pages for EXCO, assembled from the two above

   The logic is in compare.js; this file only draws and binds.
   ============================================================ */

let currentTab = "compare";

const CS_TABS = [
  { key: "compare", label: "Compare countries" },
  { key: "findings", label: "Findings from the other apps" },
  { key: "readout", label: "EXCO readout" }
];

/* The workspaces in the comparison: this one, every other built from
   the same frame, plus any added by hand — less any left out by hand.
   Shown in workspace-list order, so the columns do not move when a
   different country is opened. */
function currentFrames() {
  const cmp = state.comparison || defaultComparison();
  const list = wsReadIndex().list;
  const others = list.filter(w => w.id !== state.workspaceId);
  const family = w => !!state.frameId && w.frameId === state.frameId;
  const inSet = w => cmp.skip.indexOf(w.id) === -1 && (family(w) || cmp.with.indexOf(w.id) !== -1);
  const frames = [];
  (list.length ? list : [{ id: state.workspaceId }]).forEach(w => {
    if (w.id === state.workspaceId) { frames.push({ id: w.id, label: state.country || state.workspaceName, state }); return; }
    if (!inSet(w)) return;
    const st = wsPeek(w.id);
    if (st && Array.isArray(st.clusters)) frames.push({ id: w.id, label: st.country || w.name, state: migrateState(st) });
  });
  if (!frames.some(f => f.id === state.workspaceId)) frames.unshift({ id: state.workspaceId, label: state.country || state.workspaceName, state });
  return { frames, others, inSet };
}

function lvClass(v) { return "lv" + Math.max(1, Math.min(4, Math.round(v))); }

/* ---------- The variation map: countries × capabilities ---------- */
function csMap(cmp, forPrint) {
  const head = cmp.frames.map(f => `<th>${esc(f.label)}</th>`).join("");
  const maxSpread = Math.max(0, ...cmp.rows.map(r => r.spread || 0));
  const rows = cmp.rows.map(r => {
    const cells = cmp.frames.map(f => {
      const c = r.cells[f.id];
      if (!c) return `<td><span class="cs-none">Not in this country</span></td>`;
      if (c.avg === null) return `<td><span class="cs-unscored">Not scored</span></td>`;
      const dots = cmp.lensKeys.map(lk => c.levels[lk] === null || c.levels[lk] === undefined
        ? `<i class="cs-dot none" title="${esc(lk)}: not scored">·</i>`
        : `<i class="cs-dot ${lvClass(c.levels[lk])}" title="${esc(lk)}: level ${c.levels[lk]}">${c.levels[lk]}</i>`).join("");
      return `<td><div class="cs-cell"><span class="lvl-pill ${lvClass(c.avg)}">${fmt1(c.avg)}</span>
        <span class="cs-dots" aria-label="Level by lens: ${esc(cmp.lensKeys.map(lk => lk + " " + (c.levels[lk] || "not scored")).join(", "))}">${dots}</span>
        ${c.trajectory ? `<span class="cs-traj" title="Direction">${c.trajectory.sym} ${esc(c.trajectory.word)}</span>` : ""}</div></td>`;
    }).join("");
    const sp = r.spread;
    const wide = sp !== null && sp >= 1;
    return `<tr class="${wide ? "is-wide" : ""}">
      <td><span class="ref-chip">${esc(r.ref)}</span> <strong>${esc(r.name)}</strong></td>${cells}
      <td>${sp === null ? `<span class="cs-none">needs two scored</span>`
        : `<div class="cs-spread"><span class="cs-bar"><i style="width:${maxSpread ? Math.round((sp / 3) * 100) : 0}%"></i></span><strong>${fmt1(sp)}</strong>${wide ? ` <span class="cs-flag">⚑ wide</span>` : ""}</div>`}</td></tr>`;
  }).join("");
  return `<table class="delta-table cs-map"><thead><tr><th>${state.unit === "value-stream" ? "Value stream" : "Capability"}</th>${head}<th>Gap between countries</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <p class="ch-note cs-key">The large number is the average level (1 Absent to 4 Established) across the lenses scored in that country. The four small squares are ${esc(cmp.lensKeys.join(", "))}, in that order. “Not scored” means nobody has assessed it yet; it is never counted as weak. ${forPrint ? "" : "A gap of one level or more is flagged ⚑ wide."}</p>`;
}

const ROLE_WORD = {
  exists: { sym: "●", word: "Exists" }, thin: { sym: "◐", word: "Thin bench" }, absent: { sym: "○", word: "Absent" },
  unconfirmed: { sym: "?", word: "To confirm" }, none: { sym: "—", word: "Not listed" }
};
function csRoleTable(frames, rows) {
  if (!rows.length) return "";
  return `<table class="delta-table cs-roles"><thead><tr><th>Role</th><th>Kind</th>${frames.map(f => `<th>${esc(f.label)}</th>`).join("")}</tr></thead><tbody>
    ${rows.map(r => `<tr class="${r.differs ? "is-wide" : ""}"><td><span class="ref-chip">${esc(r.ref)}</span> <strong>${esc(r.title)}</strong><span class="cs-sub">${esc(r.cluster)}</span></td>
      <td><span class="route-pill rt-${r.route}">${esc(ROUTE_META[r.route].label)}</span></td>
      ${frames.map(f => { const w = ROLE_WORD[r.cells[f.id] || "none"]; return `<td><span class="cs-role rs-${r.cells[f.id] || "none"}">${w.sym} ${w.word}</span></td>`; }).join("")}</tr>`).join("")}
    </tbody></table>`;
}

/* ---------- Tab 1: compare ---------- */
function csCompare(ctx) {
  const { frames, others, inSet } = ctx;
  const picker = `<div class="cs-pick">
      <span class="cs-pick-k">In this comparison</span>
      <span class="cs-chip on">${esc(state.country || state.workspaceName)} <em>open now</em></span>
      ${others.map(w => `<label class="cs-chip ${inSet(w) ? "on" : ""}"><input type="checkbox" data-cs-with="${esc(w.id)}" ${inSet(w) ? "checked" : ""}> ${esc(w.country || w.name)}</label>`).join("")}
      <button class="mini-btn" id="cs-add">＋ Add another country…</button>
    </div>`;
  if (frames.length < 2) {
    return picker + `<div class="cs-start">
      <h2>Compare the same organisation, country by country</h2>
      <p>To see how roles, decisions and ways of working differ from one country to the next, each country needs its own workspace built from the <strong>same frame</strong>, so the same ID means the same thing everywhere.</p>
      <ol>
        <li><strong>Finish the frame here first.</strong> Settle the ${esc(unitWord(state, true))}, the money levers and the anchor roles. They are copied to every country.</li>
        <li><strong>Add each country.</strong> Use “Add another country” above. It copies the frame and every ID, and leaves all scores, evidence and amounts blank.</li>
        <li><strong>Score each country from its own evidence.</strong> Someone in that country can do it: open the country, press <em>Export</em>, send them the file, and <em>Import</em> what they send back.</li>
        <li><strong>Come back here.</strong> The differences appear as soon as two countries are scored.</li>
      </ol>
      ${state.country ? "" : `<p class="ch-note">This workspace does not say which country it covers yet. “Add another country” will ask.</p>`}
      ${isDemoState(state) ? `<div class="cs-demo"><button class="btn-navy" id="cs-demo">▶ Show me with the demo's three countries</button>
        <span>Adds two fictional countries, Belmar and Caldera, beside this one (named Arden), with fictional findings from the other three apps.</span></div>` : ""}
    </div>`;
  }
  const cmp = compareFrames(frames);
  const diffs = compareDifferences(cmp);
  const classes = state.comparison.classes || {};
  const roles = compareRoles(frames);
  const roleDiff = roles.filter(r => r.differs), roleSame = roles.filter(r => !r.differs);
  const classed = diffs.filter(d => (classes[d.key] || {}).cls).length;
  const unscored = frames.filter(f => !f.state.clusters.some(cl => Object.values(cl.cells).some(cellAssessed))).map(f => f.label);

  const diffRow = d => {
    const c = classes[d.key] || {};
    const meta = diffClassMeta(c.cls);
    return `<tr class="${d.material ? "is-wide" : ""}">
      <td><span class="ref-chip">${esc(d.ref)}</span> <strong>${esc(d.cluster)}</strong> · ${esc(d.lens)}</td>
      <td>${d.values.map(v => `<span class="cs-lv"><span class="lvl-pill ${lvClass(v.level)}">L${v.level}</span> ${esc(v.label)}</span>`).join("")}</td>
      <td><strong>${d.gap}</strong> level${d.gap > 1 ? "s" : ""}${d.material ? ` <span class="cs-flag">⚑ material</span>` : ""}</td>
      <td><select data-cs-class="${esc(d.key)}">
        <option value="">Not yet classed</option>
        ${DIFF_CLASSES.map(k => `<option value="${k.key}" ${c.cls === k.key ? "selected" : ""}>${k.label}</option>`).join("")}</select>
        ${meta ? `<span class="cs-ask ask-${meta.key}">→ ${esc(meta.ask)}</span>` : ""}</td>
      <td><input type="text" class="vc-in" data-cs-note="${esc(d.key)}" value="${esc(c.note || "")}" title="${esc(c.note || "")}" placeholder="The reason, in a line"></td></tr>`;
  };
  /* Material gaps and anything already classed stay in view; the
     one-level differences nobody has classed are one click away. */
  const front = diffs.filter(d => d.material || (classes[d.key] || {}).cls);
  const back = diffs.filter(d => !(d.material || (classes[d.key] || {}).cls));
  const diffHead = `<thead><tr><th>Cell</th><th>Level in each country</th><th>Gap</th><th>Why it differs</th><th>Reason</th></tr></thead>`;

  return picker + `
    ${unscored.length ? `<div class="cs-warn">⚑ <strong>${esc(unscored.join(", "))}</strong> ${unscored.length > 1 ? "have" : "has"} no scores yet, so ${unscored.length > 1 ? "they appear" : "it appears"} as “Not scored” below and ${unscored.length > 1 ? "are" : "is"} left out of every gap.</div>` : ""}
    <div class="vc-tablewrap">
      <div class="sig-brief-head"><h2>Where the countries differ</h2>
        <span class="sig-meta">${cmp.rows.length} ${esc(unitWord(state, true))} × ${frames.length} countries, matched by ID</span></div>
      ${csMap(cmp)}
      <p class="ch-note cs-key"><strong>Read a small gap with care.</strong> Different people score different countries, and one may simply be stricter. Before treating a gap as real, have the country leads look at each other's evidence for the widest ones.</p>
    </div>

    <div class="vc-tablewrap" style="margin-top:18px">
      <div class="sig-brief-head"><h2>Why each difference exists</h2>
        <span class="sig-meta">${diffs.length} difference${diffs.length === 1 ? "" : "s"} between scored countries · ${diffs.filter(d => d.material).length} material · ${classed} classed</span></div>
      <div class="cs-classkey">${DIFF_CLASSES.map(k => `<div class="cs-classcard ask-${k.key}"><strong>${k.label}</strong><span>${esc(k.means)}</span><em>→ ${esc(k.ask)}</em></div>`).join("")}</div>
      ${diffs.length ? `${front.length ? `<table class="delta-table cs-diffs">${diffHead}<tbody>${front.map(diffRow).join("")}</tbody></table>` : ""}
        ${back.length ? `<details class="ho-preview cs-minor" ${front.length ? "" : "open"}><summary>${back.length} smaller difference${back.length > 1 ? "s" : ""}, one level apart, not yet classed</summary>
          <table class="delta-table cs-diffs">${diffHead}<tbody>${back.map(diffRow).join("")}</tbody></table></details>` : ""}
        <p class="ch-note">This is your judgement, made with the evidence in view. A difference left unclassed goes to EXCO as “still to classify”, not as a recommendation.</p>`
        : `<div class="alert-empty">No cell is scored at a different level in two countries yet.</div>`}
    </div>

    <div class="vc-tablewrap" style="margin-top:18px">
      <div class="sig-brief-head"><h2>Which roles exist where</h2>
        <span class="sig-meta">${roles.length} role${roles.length === 1 ? "" : "s"}, matched by ID · ${roleDiff.length} differ between countries</span></div>
      ${roleDiff.length ? csRoleTable(frames, roleDiff) : `<div class="alert-empty">${roles.length ? "No role has a different status in two countries." : "No roles are listed yet. Add them under Roles."}</div>`}
      ${roleSame.length ? `<details class="ho-preview" style="margin-top:10px"><summary>${roleSame.length} more — the same in every country, or still to confirm</summary>${csRoleTable(frames, roleSame)}</details>` : ""}
      <p class="ch-note">Why a role exists in one country and not another is recorded in Org Modeling and comes back here as a finding.</p>
    </div>`;
}

/* ---------- Tab 2: findings ---------- */
const RETURN_SOURCES = [
  { app: "Process Map Studio", gives: "How work really runs: steps, who decides, where practice departs from the documents, and how this country's way differs from another's.", where: "Open the published map → Export → “Findings for the Compass”." },
  { app: "Org Modeling", gives: "Which roles and layers exist in each country, the reason each role is there, and the hypotheses about why.", where: "Export → “Findings for the Compass”, one file per country." },
  { app: "Workbench", gives: "What each role's tasks become with AI, and the capacity that frees.", where: "Engagement → Export → “Findings for the Compass”." }
];

/* Why it is so, and against which country — when the sending app says. */
function whyChip(f) {
  const r = REASON_CLASSES[f.reason_class];
  return (r ? `<span class="cs-why why-${f.reason_class}">${esc(r.label)}</span>` : "") +
    (f.compared_with ? `<span class="cs-vs">vs ${esc(f.compared_with)}</span>` : "");
}

function csFindingRow(f) {
  const kind = FINDING_KINDS[f.kind] || { label: f.kind || "Finding" };
  const cells = findingCells(state, f);
  const cite = cells.map(c => (f.cited || {})[c.ref]
    ? `<span class="applied-note">✓ cited on ${esc(c.ref)}</span>`
    : `<button class="mini-btn" data-cs-cite="${esc(f.return_id)}|${f._i}|${esc(c.ref)}">Cite on ${esc(c.ref)}</button>`).join(" ");
  return `<tr><td><span class="ref-chip">${esc(f.ref || "—")}</span><span class="cs-sub">${esc(kind.label)}</span></td>
    <td><strong>${esc(f.title)}</strong> ${whyChip(f)}${f.detail ? `<div class="cs-detail">${esc(f.detail)}</div>` : ""}${f.source_note ? `<div class="cs-src">${esc(f.source_note)}</div>` : ""}</td>
    <td>${f.grade ? `<span class="grade-pill g-${f.grade}">${esc(gradeMeta(f.grade).label)}</span>` : `<span class="cs-none">No grade</span>`}${f.figure ? `<div class="cs-fig">${esc(f.figure)}</div>` : ""}</td>
    <td>${cite || `<span class="cs-none">${(f.relates_to || []).length ? esc(f.relates_to.join(", ")) : "Not tied to a cell"}</span>`}</td></tr>`;
}

function csFindings() {
  const rets = state.returns || [];
  const key = state.charter.engagementKey;
  const files = rets.map(r => {
    const offCountry = r.country && state.country && r.country.toLowerCase() !== state.country.toLowerCase();
    const off = (r.engagement_key && r.engagement_key !== key) || offCountry;
    return `<div class="cs-file ${off ? "off" : ""}">
      <div><strong>${esc(sourceAppName(r.source_app))}</strong> · ${r.findings.length} finding${r.findings.length === 1 ? "" : "s"} · imported ${new Date(r.imported_at).toLocaleDateString()}
        ${off ? `<div class="cs-fileflag">⚑ This file is for ${offCountry ? esc(r.country) + " " : ""}<span class="ref-chip">${esc(r.engagement_key)}</span>; this workspace is ${state.country ? esc(state.country) + " " : ""}<span class="ref-chip">${esc(key)}</span>. Check it was imported into the right country.</div>` : ""}</div>
      <button class="mini-btn danger" data-cs-drop="${esc(r.id)}">Remove</button></div>`;
  }).join("");
  const groups = rets.map(r => {
    const rows = r.findings.map((f, i) => Object.assign({}, f, { return_id: r.id, _i: i }));
    const strong = strongestFirst(rows);
    return `<div class="vc-tablewrap" style="margin-top:14px">
      <div class="sig-brief-head"><h2>${esc(sourceAppName(r.source_app))}</h2><span class="sig-meta">strongest evidence first</span></div>
      <table class="delta-table cs-find"><thead><tr><th>ID · kind</th><th>Finding</th><th>Grade · figure</th><th>Use it</th></tr></thead>
      <tbody>${strong.slice(0, 12).map(csFindingRow).join("")}</tbody></table>
      ${strong.length > 12 ? `<details class="ho-preview" style="margin-top:8px"><summary>${strong.length - 12} more</summary>
        <table class="delta-table cs-find"><tbody>${strong.slice(12).map(csFindingRow).join("")}</tbody></table></details>` : ""}</div>`;
  }).join("");
  return `<div class="vc-tablewrap">
      <div class="sig-brief-head"><h2>Findings for ${esc(state.country || state.workspaceName)}</h2>
        <span class="sig-meta">engagement key <span class="ref-chip">${esc(key)}</span></span>
        <button class="btn-navy" id="cs-import">Import a findings file (.json)</button></div>
      <p class="ho-note">Each of the other three apps can send back what it found as a small file. Importing one never changes a score: it lists the findings here, and you decide which to cite on a cell. Import each file into the workspace of the country it describes.</p>
      <div class="cs-sources">${RETURN_SOURCES.map(s => `<div class="cs-source"><strong>${s.app}</strong><span>${s.gives}</span><em>${s.where}</em></div>`).join("")}</div>
      ${files ? `<div class="cs-files">${files}</div>` : `<div class="alert-empty" style="margin-top:12px">No findings file imported into this workspace yet.</div>`}
    </div>${groups}`;
}

/* ---------- Tab 3: the EXCO readout ---------- */
function roFindingList(list, n, empty) {
  if (!list.length) return `<p class="ro-empty">${empty}</p>`;
  const top = strongestFirst(list).slice(0, n);
  return `<ul class="ro-finds">${top.map(f => `<li>${f.grade ? `<span class="grade-pill g-${f.grade}">${esc(gradeMeta(f.grade).label)}</span>` : ""}
      <strong>${esc(f.title)}</strong>${f.figure ? ` <span class="ro-fig">${esc(f.figure)}</span>` : ""} ${whyChip(f)}
      ${f.detail ? `<span class="ro-detail">${esc(f.detail)}</span>` : ""}<span class="ref-chip">${esc(f.ref || "")}</span></li>`).join("")}</ul>
    ${list.length > n ? `<p class="ro-more">and ${list.length - n} more in the findings register</p>` : ""}`;
}

function roPerCountry(m, pick, n, emptyFor) {
  return `<div class="ro-cols">${m.finds.per.map(p => `<div class="ro-col"><h4>${esc(p.label)}</h4>${roFindingList(pick(p), n, emptyFor)}</div>`).join("")}</div>`;
}

function csReadout(ctx) {
  const { frames } = ctx;
  const m = readoutModel(state, frames);
  const cmp = state.comparison;
  const page = (n, title, lede, body) => `<section class="ro-page print-section">
      <header class="ro-head"><span class="ro-n">${n}</span><div><h2>${title}</h2><p>${lede}</p></div></header>${body}</section>`;
  const single = frames.length < 2;

  /* What would weaken the paper, said before it is printed. */
  const gaps = [];
  if (single) gaps.push("Only one country is in the comparison, so pages 2 and 6 have nothing to compare.");
  if (m.unscored.length) gaps.push(m.unscored.join(", ") + " not scored yet.");
  if (m.partScored.length) gaps.push("Only partly scored: " + m.partScored.join(", ") + ". The unscored cells are left out, not counted as weak.");
  const unclassedMaterial = m.byClass.unclassified.filter(d => d.material).length;
  if (unclassedMaterial) gaps.push(unclassedMaterial + " material difference(s) not yet classed as Required, Chosen or Inherited.");
  const noFinds = m.finds.per.filter(p => !p.total).map(p => p.label);
  if (noFinds.length) gaps.push("No findings imported for " + noFinds.join(", ") + ", so pages 3 to 5 are thin there.");
  if (!(cmp.verdict || "").trim()) gaps.push("The one-line verdict on page 1 is not written.");

  const tiles = m.countries.map(c => `<div class="ro-tile">
      <h4>${esc(c.label)} <span class="ref-chip">${esc(c.key)}</span></h4>
      ${c.assessed ? `<div class="ro-big"><span class="lvl-pill ${lvClass(c.avg)}">${fmt1(c.avg)}</span><span>average level of 4</span></div>
        <div class="ro-line"><strong>${c.weak}</strong> of ${c.assessed} scored cells need action</div>
        <div class="ro-line">${c.money ? `<strong>≈ ${esc(c.money.text)}</strong> at risk (estimate)` : "Money at risk: not estimated"}</div>`
        : `<div class="ro-big"><span class="cs-unscored">Not scored</span></div>`}
      <div class="ro-line muted">${c.scoredPct}% of cells scored · ${c.grounded}% cite a source</div></div>`).join("");
  const total = m.moneyComparable ? m.countries.reduce((a, c) => a + c.money.atRisk, 0) : null;

  const p1 = page(1, "Where we stand", "One line, then each country on the same scale.",
    `<div class="ro-own"><label for="ro-verdict">The verdict, in one or two sentences <span class="no-print">— yours to write; nothing here is generated</span></label>
      <textarea id="ro-verdict" class="no-print" placeholder="For example: The three countries run the same business on three different operating models. Two of the differences are required by regulation; the rest are inherited and cost us speed.">${esc(cmp.verdict || "")}</textarea>
      <p class="ro-quote">${(cmp.verdict || "").trim() ? esc(cmp.verdict) : "<em>Not written yet.</em>"}</p></div>
    <div class="ro-tiles">${tiles}</div>
    <p class="ro-foot">${total !== null ? `Across the countries: ≈ ${esc(fmtMoney(frames[0].state, total))} at risk (estimate, same currency and unit).` : (m.countries.filter(c => c.money).length > 1 ? "Money at risk is shown per country and not added up: the countries use different currencies or units." : "")}
      Money at risk is an estimate until finance validates the amount on each lever.</p>`);

  const classCount = k => m.byClass[k].length;
  const p2 = page(2, "Where the countries differ", "Same capabilities, same scale. Wide gaps are flagged.",
    single ? `<p class="ro-empty">Add a second country to see the variation.</p>` :
    csMap(m.cmp, true) + `<div class="ro-counts">
      <div class="ro-count"><strong>${m.diffs.length}</strong><span>cells scored differently</span></div>
      <div class="ro-count"><strong>${m.material}</strong><span>material (two levels or more)</span></div>
      ${DIFF_CLASSES.map(k => `<div class="ro-count ask-${k.key}"><strong>${classCount(k.key)}</strong><span>${k.label}</span></div>`).join("")}
      <div class="ro-count"><strong>${classCount("unclassified")}</strong><span>still to classify</span></div></div>`);

  const p3 = page(3, "Who really decides", "Where decisions are made in practice, against where the documents say they are made.",
    roPerCountry(m, p => p.decisions, 4, "No decision-rights findings imported. They come from Process Map Studio, where a step is decided by a different role from the one on paper.") +
    `<p class="ro-foot">Source: Process Map Studio and Org Modeling findings that concern who decides, owns or approves. Strongest evidence first.</p>`);

  const roleRows = m.roles.filter(r => r.differs || (r.anchor && r.gapIn.length));
  const p4 = page(4, "Which roles exist where, and why", "The anchor roles the model depends on, country by country.",
    (roleRows.length ? csRoleTable(frames, roleRows.slice(0, 5)) + (roleRows.length > 5 ? `<p class="ro-more">and ${roleRows.length - 5} more roles that differ or are missing, on the Compare tab</p>` : "") : `<p class="ro-empty">${m.roles.length ? "Every listed role has the same status in every country." : "No roles are listed yet."}</p>`) +
    (m.roleGaps.length ? `<p class="ro-call">⚑ ${m.roleGaps.length} anchor role${m.roleGaps.length > 1 ? "s are" : " is"} absent or thin somewhere: ${esc(m.roleGaps.slice(0, 3).map(r => r.title + " (" + r.gapIn.join(", ") + ")").join("; "))}${m.roleGaps.length > 3 ? "; and " + (m.roleGaps.length - 3) + " more" : ""}</p>` : "") +
    `<h3 class="ro-sub">Why the roles are there</h3>` +
    roPerCountry(m, p => p.people, 2, "No structure or role findings imported. They come from Org Modeling and the Workbench.") );

  const p5 = page(5, "How work really runs", "Where practice departs from the documents, and what it costs.",
    roPerCountry(m, p => p.work.filter(f => f.kind !== "step"), 4, "No process findings imported. They come from Process Map Studio.") +
    `<p class="ro-foot">Each line keeps the ID and grade it was given in the app that found it. Confirmed means verified at source; Indicated means supported but not verified; Hypothesis means still to test.</p>`);

  const askCol = k => {
    const meta = diffClassMeta(k), list = m.byClass[k];
    return `<div class="ro-ask ask-${k}"><h4>${esc(meta.ask)}</h4><p class="ro-askwhy">${esc(meta.label)}: ${esc(meta.means)}</p>
      ${list.length ? `<ul>${list.slice(0, 8).map(d => `<li><span class="ref-chip">${esc(d.ref)}</span> <strong>${esc(d.cluster)}</strong> · ${esc(d.lens)} <span class="ro-detail">${esc(d.high.join(", "))} L${d.hi} · ${esc(d.low.join(", "))} L${d.lo}${d.note ? " — " + esc(d.note) : ""}</span></li>`).join("")}</ul>${list.length > 8 ? `<p class="ro-more">and ${list.length - 8} more</p>` : ""}`
        : `<p class="ro-empty">Nothing classed here yet.</p>`}</div>`;
  };
  const pilots = m.countries.filter(c => c.pilots.length).map(c => `<li><strong>${esc(c.label)}</strong>: ${c.pilots.map(p => `<span class="ref-chip">${esc(p.ref)}</span> ${esc(p.name || "pilot not named")}${p.kpi ? " (" + esc(p.kpi) + ")" : ""}`).join("; ")}</li>`).join("");
  const p6 = page(6, "What we ask you to decide", "Every difference lands in one of three places.",
    `<div class="ro-asks">${["inherited", "chosen", "required"].map(askCol).join("")}</div>
    ${unclassedMaterial ? `<p class="ro-call">⚑ ${unclassedMaterial} material difference${unclassedMaterial > 1 ? "s are" : " is"} still to classify and ${unclassedMaterial > 1 ? "are" : "is"} not part of this ask.</p>` : ""}
    ${m.byClass.unclassified.length - unclassedMaterial ? `<p class="ro-foot">${m.byClass.unclassified.length - unclassedMaterial} smaller difference${m.byClass.unclassified.length - unclassedMaterial > 1 ? "s" : ""} (one level apart) ${m.byClass.unclassified.length - unclassedMaterial > 1 ? "are" : "is"} not classed and not part of this ask.</p>` : ""}
    ${pilots ? `<h3 class="ro-sub">Where we would pilot the design</h3><ul class="ro-pilots">${pilots}</ul>` : ""}
    <div class="ro-own"><label for="ro-asks">The ask <span class="no-print">— what you need EXCO to agree to move to design</span></label>
      <textarea id="ro-asks" class="no-print" placeholder="For example: Agree to harmonise the three inherited differences; confirm the two chosen ones stay local for now; approve the export cargo pilot in Thailand.">${esc(cmp.asks || "")}</textarea>
      <p class="ro-quote">${(cmp.asks || "").trim() ? esc(cmp.asks) : "<em>Not written yet.</em>"}</p></div>`);

  return `<div class="ro-bar no-print">
      <div><strong>Six pages for EXCO.</strong> Everything is counted or quoted from the workspaces; the only words you write are the verdict and the ask.</div>
      <button class="btn-navy" id="ro-print">Print or save as PDF</button></div>
    ${gaps.length ? `<div class="cs-warn no-print"><strong>Before you present:</strong><ul>${gaps.map(g => `<li>${esc(g)}</li>`).join("")}</ul></div>` : `<div class="cs-ok no-print">✓ Every country is fully scored, every material difference is classed, and findings are in for each country.</div>`}
    <div class="ro-doc"><div class="ro-title"><h1>${esc(state.orgName)}: current state across ${frames.length} countr${frames.length === 1 ? "y" : "ies"}</h1>
      <p>${esc(frames.map(f => f.label).join(" · "))} · ${new Date().toLocaleDateString()}</p></div>
    ${p1}${p2}${p3}${p4}${p5}${p6}</div>`;
}

/* ---------- The view ---------- */
function viewCurrent() {
  const ctx = currentFrames();
  const body = currentTab === "findings" ? csFindings() : currentTab === "readout" ? csReadout(ctx) : csCompare(ctx);
  return `<div class="view-note no-print"><strong>Current state, before any design.</strong> What roles exist, who really decides, how work really runs, and how that differs from one country to the next. Compare the countries, bring in what the other apps found, then take six pages to EXCO.</div>
    <div class="cs-tabs no-print" role="tablist">${CS_TABS.map((t, i) => `<button class="cs-tab ${currentTab === t.key ? "active" : ""}" data-cs-tab="${t.key}" role="tab" aria-selected="${currentTab === t.key}"><b>${i + 1}</b> ${t.label}</button>`).join("")}</div>
    <div class="cs-body">${body}</div>
    <input type="file" id="file-return" accept="application/json,.json" multiple hidden>`;
}

function importReturnFiles(fileList) {
  const files = Array.from(fileList || []);
  let done = 0, added = 0; const problems = [];
  const finish = () => {
    if (++done < files.length) return;
    renderAll();
    toast(problems.length ? "Not imported: " + problems[0] : added + " finding" + (added === 1 ? "" : "s") + " imported. No score was changed.");
  };
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const ret = normaliseReturn(JSON.parse(reader.result));
        const errs = validateReturn(ret);
        if (errs.length) throw new Error(errs[0]);
        /* The same file imported twice replaces the first copy. */
        state.returns = (state.returns || []).filter(r => !(r.source_app === ret.source_app && r.generated_at && r.generated_at === ret.generated_at));
        state.returns.push(ret); added += ret.findings.length;
        state.changeLog.push({ at: nowIso(), cluster: "Findings", lens: "—", from: 0, to: 0, rationale: "Imported " + ret.findings.length + " finding(s) from " + sourceAppName(ret.source_app) + ". No score changed.", by: state.actor || "You" });
      } catch (e) { problems.push(file.name + " — " + (e instanceof SyntaxError ? "it is not a JSON file." : e.message)); }
      finish();
    };
    reader.onerror = () => { problems.push(file.name + " could not be read."); finish(); };
    reader.readAsText(file);
  });
}

/* The demo, as three countries. Fictional throughout. */
function loadDemoCountries() {
  try {
    state.country = DEMO_HOME_COUNTRY;
    if (!state.frameId) state.frameId = wsNewFrameId();
    /* Keep whatever has been added to, or left out of, the comparison by hand. */
    state.comparison = Object.assign(demoComparison(), { with: state.comparison.with || [], skip: state.comparison.skip || [] });
    state.returns = demoReturns(DEMO_HOME_COUNTRY);
    DEMO_COUNTRIES.forEach(spec => {
      const st = migrateState(buildDemoCountry(state, spec));
      st.workspaceId = wsNewId();
      wsPark(st); wsRegister(st);
    });
    renderAll();   // saves, and marks the workspace on screen as the active one again
    toast("Belmar and Caldera added. All three countries are fictional.");
  } catch (e) { toast(e.message); }
}

function bindCurrentEvents() {
  document.querySelectorAll("[data-cs-tab]").forEach(b => b.addEventListener("click", () => { currentTab = b.dataset.csTab; renderView(); }));
  const add = $("cs-add");
  if (add) add.addEventListener("click", openWorkspaceManager);
  const demo = $("cs-demo");
  if (demo) demo.addEventListener("click", loadDemoCountries);
  document.querySelectorAll("[data-cs-with]").forEach(cb => cb.addEventListener("change", () => {
    const id = cb.dataset.csWith, c = state.comparison;
    c.with = c.with.filter(x => x !== id); c.skip = c.skip.filter(x => x !== id);
    (cb.checked ? c.with : c.skip).push(id);
    renderAll();
  }));
  document.querySelectorAll("[data-cs-class]").forEach(sel => sel.addEventListener("change", () => {
    const k = sel.dataset.csClass, c = state.comparison.classes;
    c[k] = Object.assign({ note: "" }, c[k], { cls: sel.value });
    renderAll();
  }));
  document.querySelectorAll("[data-cs-note]").forEach(inp => inp.addEventListener("change", () => {
    const k = inp.dataset.csNote, c = state.comparison.classes;
    c[k] = Object.assign({ cls: "" }, c[k], { note: inp.value.trim() });
    saveState();
  }));
  const imp = $("cs-import"), file = $("file-return");
  if (imp && file) {
    imp.addEventListener("click", () => file.click());
    file.addEventListener("change", e => { importReturnFiles(e.target.files); e.target.value = ""; });
  }
  document.querySelectorAll("[data-cs-drop]").forEach(b => b.addEventListener("click", () => {
    const r = (state.returns || []).find(x => x.id === b.dataset.csDrop);
    if (!r || !confirm("Remove the " + r.findings.length + " finding(s) from " + sourceAppName(r.source_app) + "?\n\nEvidence already cited on a cell stays on that cell.")) return;
    state.returns = state.returns.filter(x => x.id !== r.id);
    renderAll();
  }));
  document.querySelectorAll("[data-cs-cite]").forEach(b => b.addEventListener("click", () => {
    const [rid, i, ref] = b.dataset.csCite.split("|");
    const ret = (state.returns || []).find(x => x.id === rid);
    const f = ret && ret.findings[+i];
    const at = f && findingCells(state, f).find(c => c.ref === ref);
    if (!at) return;
    const cl = state.clusters.find(c => c.id === at.clusterId), cell = cl.cells[at.lensKey];
    /* Citing adds evidence. The level and the grade stay the assessor's. */
    cell.evidence.push({ label: sourceAppName(ret.source_app) + ": " + f.title, note: [f.detail, f.figure, f.grade ? "Graded " + gradeMeta(f.grade).label + " at source" : ""].filter(Boolean).join(" · "), ref: f.ref || "" });
    cell.last_updated = nowIso();
    f.cited = Object.assign({}, f.cited, { [ref]: true });
    state.changeLog.push({ at: nowIso(), cluster: cl.name, lens: at.lensKey, from: cell.level, to: cell.level, rationale: "Evidence cited from " + sourceAppName(ret.source_app) + (f.ref ? " (" + f.ref + ")" : "") + ": " + f.title, by: state.actor || "You" });
    renderAll();
    toast("Cited on " + ref + ". The score is unchanged; open the cell to re-score if it warrants.");
  }));
  ["verdict", "asks"].forEach(k => {
    const el = $("ro-" + k);
    if (el) el.addEventListener("change", () => { state.comparison[k] = el.value.trim(); renderAll(); });
  });
  const pr = $("ro-print");
  if (pr) pr.addEventListener("click", () => afterPointer(() => window.print()));
}
