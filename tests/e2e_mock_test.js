/* ============================================================
   Capability Compass — End-to-end mock test (Playwright)

   Full regression of the original features PLUS the External
   Intelligence layer, run entirely in mock mode (key = "mock")
   so no real API is ever called and no network is needed.

   Run:  node tests/e2e_mock_test.js
   (Requires playwright + a Chromium; CHROMIUM_PATH overrides
   the executable location.)
   ============================================================ */

const { chromium } = require("playwright");
const path = require("path");

/* No hard-coded browser path: a pinned build number breaks the suite the
   moment the machine's Chromium is updated. Playwright finds its own
   browser; CHROMIUM_PATH overrides when a specific one is wanted. */
const CHROMIUM = process.env.CHROMIUM_PATH || undefined;
const APP_URL = "file://" + path.resolve(__dirname, "..", "app", "index.html");

/* Build a small but fully valid PDF with a real text layer (exact xref
   offsets), so the vendored pdf.js extractor is exercised end-to-end. */
function makeTextPdf(lines) {
  const streamBody = "BT /F1 12 Tf 40 760 Td " +
    lines.map((l, i) => (i ? "0 -16 Td " : "") + "(" + l.replace(/[\\()]/g, "") + ") Tj ").join("") + "ET";
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n",
    "4 0 obj\n<< /Length " + streamBody.length + " >>\nstream\n" + streamBody + "\nendstream\nendobj\n",
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [];
  for (const o of objects) { offsets.push(pdf.length); pdf += o; }
  const xrefPos = pdf.length;
  pdf += "xref\n0 6\n0000000000 65535 f \n" +
    offsets.map(o => String(o).padStart(10, "0") + " 00000 n \n").join("") +
    "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" + xrefPos + "\n%%EOF";
  return Buffer.from(pdf, "ascii");
}

let failures = 0;
function check(name, cond) {
  console.log(`${cond ? "✓" : "✗"} ${name}`);
  if (!cond) failures++;
}

(async () => {
  const browser = await chromium.launch(CHROMIUM ? { executablePath: CHROMIUM } : {});
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  const jsErrors = [];
  page.on("pageerror", e => jsErrors.push(e.message));

  await page.goto(APP_URL);
  await page.waitForTimeout(700);

  // ---------- Regression: original flows ----------
  check("wizard opens on first run", await page.locator(".modal-backdrop.open").count() === 1);
  await page.click("[data-demo]");
  await page.waitForTimeout(500);
  check("a new workspace lands on the Journey, not in the middle of the detail",
    await page.locator(".jr-card").count() === 6 && await page.locator(".tab.active").getAttribute("data-view") === "journey");
  await page.click('.tab[data-view="matrix"]');
  await page.waitForTimeout(300);
  check("matrix renders 24 cells", await page.locator(".cell").count() === 24);
  check("amber action pills on weak cells", await page.locator(".action-pill").count() === 3);
  check("5 KPI chips", await page.locator(".kpi").count() === 5);

  await page.click('.cell[data-cluster="gateway"][data-lens="Culture"]');
  await page.waitForTimeout(400);
  check("drawer opens with cell detail", await page.locator(".drawer.open").count() === 1);
  await page.click('#lvl-picker button[data-lvl="3"]');
  await page.waitForTimeout(250);
  await page.click("#d-save");
  await page.waitForTimeout(250);
  check("level change blocked without rationale", await page.locator(".drawer.open").count() === 1);
  await page.fill("#d-change-rationale", "Safety pulse improved after embedded-culture programme.");
  await page.click("#d-save");
  await page.waitForTimeout(400);
  check("level change saves with rationale", await page.locator(".drawer.open").count() === 0);

  await page.click('.tab[data-view="board"]');
  await page.waitForTimeout(300);
  check("priority board: 3 hero patterns + 6 cards",
    await page.locator(".hero").count() === 3 && await page.locator(".bcard").count() === 6);
  check("board defaults to money-at-risk order (biggest P&L lever leads)",
    (await page.locator(".bcard h3").first().textContent()) === "Technology, Data & AI");
  await page.selectOption("#board-sort", "weakest");
  await page.waitForTimeout(400);
  check("weakest-first sort puts Commercial Leadership on top",
    (await page.locator(".bcard h3").first().textContent()) === "Commercial Leadership");
  check("every cluster card names its binding constraint",
    await page.locator(".b-binding").count() === 6);
  check("commercial binding constraint targets People",
    (await page.locator(".bcard").first().locator(".b-bind-link").textContent()).includes("People"));
  await page.selectOption("#board-sort", "auto");
  await page.waitForTimeout(300);

  await page.click('.tab[data-view="trajectory"]');
  await page.waitForTimeout(300);
  check("trajectory renders 6 cluster rows + 5 alert groups (incl. direction-unknown)",
    await page.locator(".traj-row").count() === 6 && await page.locator(".alert-card").count() === 5);
  check("cross-lens risk patterns detected and shown",
    await page.locator(".pattern-card").count() >= 3);
  check("trajectory alerts carry the economic weight riding on each cluster",
    await page.locator(".alert-wt").count() >= 1);
  check("every trajectory alert group leads with the biggest money at risk",
    await page.evaluate(() => {
      const groups = enterpriseKpis(state).alerts;
      return Object.keys(groups).every(k => {
        const w = groups[k].map(a => clusterEconomicWeight(state, a.cluster.id));
        return w.every((v, i) => i === 0 || w[i - 1] >= v);
      });
    }));
  check("adoption red flag pattern present",
    (await page.locator(".pattern-card h5").allTextContents()).some(t => t.includes("Adoption red flag")));

  await page.click('.tab[data-view="delta"]');
  await page.waitForTimeout(300);
  check("delta renders rows against demo baseline", await page.locator(".delta-table tbody tr").count() > 0);

  // ---------- Value Chain: follow the money ----------
  await page.click('.tab[data-view="valuechain"]');
  await page.waitForTimeout(400);
  check("value chain renders the 5-stage money flow", await page.locator(".vc-stage").count() === 5);
  check("value chain lists P&L levers with exposure", await page.locator(".vc-table tbody tr").count() === 7);
  check("levers show a computed exposure score", await page.locator(".exposure-pill").count() >= 5);
  const weightBefore = await page.evaluate(() => clusterEconomicWeight(state, "commercial"));
  await page.locator('[data-lv^="share_pct|0"]').fill("40");
  await page.locator('[data-lv^="share_pct|0"]').dispatchEvent("change");
  await page.waitForTimeout(400);
  const weightAfter = await page.evaluate(() => clusterEconomicWeight(state, "commercial"));
  check("editing a lever's weight updates the cluster's economic weight", weightBefore === 22 && weightAfter === 40);

  // Board must re-rank on money at risk
  await page.click('.tab[data-view="board"]');
  await page.waitForTimeout(400);
  check("board offers an ordering control", await page.locator("#board-sort").count() === 1);
  check("board auto-ranks by value exposure when levers are mapped",
    (await page.locator(".view-note").textContent()).includes("value exposure"));
  const topValue = await page.locator(".bcard h3").first().textContent();
  const expectedTop = await page.evaluate(() =>
    state.clusters.map(c => ({ n: c.name, e: clusterValueExposure(state, c, state.lenses).exposure }))
      .sort((a, b) => b.e - a.e)[0].n);
  check("highest money-at-risk cluster leads the board", topValue === expectedTop);
  check("cards show economic exposure", await page.locator(".b-exposure").count() >= 5);
  check("cards flag clusters whose anchor seats are missing", await page.locator(".b-stats .b-flagpill").count() >= 1);
  await page.selectOption("#board-sort", "weakest");
  await page.waitForTimeout(400);
  check("switching to weakest-first changes the stated basis",
    (await page.locator(".view-note").textContent()).includes("weakest-first"));
  await page.selectOption("#board-sort", "auto");
  await page.waitForTimeout(300);

  // ---------- Method blueprint: the workflow picture + self-assessment ----------
  await page.click('.tab[data-view="blueprint"]');
  await page.waitForTimeout(500);
  check("blueprint view renders the workflow diagram", await page.locator(".bp-svg").count() === 1);
  check("diagram draws all five workflow bands", await page.locator(".bp-band").count() === 5);
  check("diagram draws a box for every stage of the pipeline",
    await page.locator(".bp-box").count() === 17);
  check("diagram shows both feedback loops, not just the forward flow",
    await page.locator(".bp-loop").count() === 2);
  check("assessment lists both strengths and watch-outs",
    await page.locator(".bp-list").nth(0).locator(".bp-item").count() >= 8 &&
    await page.locator(".bp-list").nth(1).locator(".bp-item").count() >= 8);
  check("every assessment badge on the diagram matches one in the lists",
    await page.evaluate(() => {
      const drawn = [...document.querySelectorAll(".bp-svg .bp-badge text")].map(t => t.textContent.trim());
      const listed = [...document.querySelectorAll(".bp-assess .bp-chip")].map(t => t.textContent.trim());
      return drawn.length > 0 && drawn.every(d => listed.includes(d)) && listed.every(l => drawn.includes(l));
    }));
  const bpText = await page.locator(".bp-assess").textContent();
  check("HONESTY: the single-rater limit is stated in the product, not hidden in a doc",
    bpText.includes("Single-rater scoring") && bpText.includes("largest methodological limit"));
  check("every watch-out offers a concrete mitigation",
    await page.evaluate(() => [...document.querySelectorAll(".bp-list")][1]
      .querySelectorAll(".bp-item").length ===
      [...document.querySelectorAll(".bp-list")][1]
        .querySelectorAll(".bp-item p").length &&
      [...[...document.querySelectorAll(".bp-list")][1].querySelectorAll(".bp-item p")]
        .every(p => p.textContent.includes("Mitigation:"))));
  check("the verdict distinguishes structured judgement from measurement",
    (await page.locator(".bp-verdict").textContent()).includes("not a measurement instrument"));
  const liveCounts = await page.evaluate(() => {
    const svg = document.querySelector(".bp-svg").textContent;
    return {
      cellsShown: svg.includes(state.clusters.length + " × " + state.lenses.length),
      rolesShown: svg.includes(state.clusters.reduce((a, c) => a + (c.roles || []).length, 0) + " roles scored"),
      leversShown: svg.includes(state.valueChain.levers.length + " levers")
    };
  });
  check("the diagram reports THIS diagnostic's live numbers, not a static picture",
    liveCounts.cellsShown && liveCounts.rolesShown && liveCounts.leversShown);

  // ---------- Population guidance on the two judgement-heavy sections ----------
  await page.click('.tab[data-view="valuechain"]');
  await page.waitForTimeout(400);
  check("value chain offers 'How to fill this in', collapsed by default",
    await page.locator("details.howto").count() === 1 &&
    await page.locator("details.howto[open]").count() === 0);
  await page.click("details.howto > summary");
  await page.waitForTimeout(300);
  const vcHow = await page.locator("details.howto").textContent();
  check("value-chain guidance opens with ordered steps, a worked line and the trap",
    await page.locator("details.howto[open]").count() === 1 &&
    await page.locator("details.howto li").count() >= 5 &&
    vcHow.includes("One good line") && vcHow.includes("false precision"));

  await page.click('.tab[data-view="roles"]');
  await page.waitForTimeout(400);
  await page.click("details.howto > summary");
  await page.waitForTimeout(300);
  const rlHow = await page.locator("details.howto").textContent();
  check("roles guidance anchors the 1–5 scales and warns against scoring seniority",
    await page.locator("details.howto li").count() >= 5 &&
    rlHow.includes("Score against anchors, not feelings") && rlHow.includes("scoring seniority"));
  check("roles guidance names the three criteria per axis with their weights",
    ["Consequence", "Scarcity", "Trend", "Time to competence", "Locked in heads", "Relationship capital"]
      .every(t => rlHow.includes(t)) && rlHow.includes("(45%)"));
  check("roles guidance points at the CSV and org-chart bulk paths",
    rlHow.includes("Role inventory") && rlHow.includes("org chart"));

  // ---------- Calibration: the value chain tunes the cluster set ----------
  await page.click('.tab[data-view="matrix"]');
  await page.waitForTimeout(400);
  check("every matrix row carries its share of the P&L", await page.locator(".mat-chip").count() === 6);
  check("matrix rows follow the same money order as the Priority Board",
    (await page.locator(".matrix-row .c-name").first().textContent()) ===
    (await page.evaluate(() => orderClustersForBoard(state, state.boardSort || "auto").clusters[0].name)));
  check("a fully-mapped cluster set shows no calibration banner",
    await page.locator(".calib-banner").count() === 0);

  await page.click('.tab[data-view="valuechain"]');
  await page.waitForTimeout(400);
  check("value chain view carries a cluster-calibration verdict", await page.locator(".calib-verdict").count() === 1);
  check("aligned cluster set is reported as fitting the economics",
    (await page.locator(".calib-fit").textContent()).includes("Fits"));

  // Orphan the biggest lever: 40% of the P&L now has no capability owner.
  await page.locator('[data-lv^="cluster_id|0"]').selectOption("");
  await page.waitForTimeout(500);
  const orphanFind = await page.locator(".calib-find").allTextContents();
  check("unmapping a lever raises a material accountability-gap finding",
    orphanFind.some(t => t.includes("No cluster owns") && t.includes("40%")));
  check("the cluster left with no money is flagged for merge or removal",
    orphanFind.some(t => t.includes("carries no economic weight")));
  check("calibration verdict flips to misaligned",
    (await page.locator(".calib-fit").textContent()).includes("Misaligned"));

  await page.click('.tab[data-view="matrix"]');
  await page.waitForTimeout(400);
  check("misalignment surfaces as a banner on the Signal Matrix",
    await page.locator(".calib-banner.hot").count() === 1);
  check("the banner routes the user to the calibration panel",
    await page.locator('.calib-banner [data-goto="valuechain"]').count() === 1);
  await page.click('.calib-banner [data-goto="valuechain"]');
  await page.waitForTimeout(400);
  check("banner click-through lands on the Value Chain view",
    await page.locator(".calib-verdict").count() === 1);

  // One-click structural fix: add the missing cluster from the orphan lever.
  const clustersBefore = await page.evaluate(() => state.clusters.length);
  page.once("dialog", d => d.accept("Revenue Management"));
  await page.locator("[data-calib-add]").first().click();
  await page.waitForTimeout(600);
  const afterAdd = await page.evaluate(() => ({
    n: state.clusters.length,
    added: state.clusters.find(c => c.name === "Revenue Management"),
    leverOwned: state.valueChain.levers[0].cluster_id
  }));
  check("adding a cluster from an orphan lever grows the Signal Matrix",
    afterAdd.n === clustersBefore + 1 && !!afterAdd.added);
  check("the new cluster takes ownership of the orphan lever",
    afterAdd.leverOwned === afterAdd.added.id);
  check("the new cluster starts unassessed — never a fabricated rating",
    Object.values(afterAdd.added.cells).every(c => c.level === 1 && c.status === "Not yet assessed"));
  check("the orphan finding clears once the money has an owner",
    !(await page.locator(".calib-find").allTextContents()).some(t => t.includes("No cluster owns")));

  await page.click('.tab[data-view="matrix"]');
  await page.waitForTimeout(400);
  check("the added cluster appears in the matrix with its own row of cells",
    await page.locator(".matrix-row").count() === clustersBefore + 1 &&
    await page.locator(".cell").count() === (clustersBefore + 1) * 4);

  // Undo the structural change through the UI: merge it back via the
  // cluster editor, restoring the demo shape for the rest of the run.
  await page.click('.tab[data-view="matrix"]');
  await page.waitForTimeout(400);
  const addedId = afterAdd.added.id;
  await page.click(`[data-editcluster="${addedId}"]`);
  await page.waitForTimeout(300);
  check("cluster editor states the cluster's economic weight",
    (await page.locator(".cm-materiality").textContent()).includes("Economic weight: 40%"));
  await page.selectOption("#cm-merge-into", "commercial");
  page.once("dialog", d => d.accept());
  await page.click("#cm-merge");
  await page.waitForTimeout(600);
  const merged = await page.evaluate(() => ({
    n: state.clusters.length,
    leverOwner: state.valueChain.levers[0].cluster_id,
    numbering: state.clusters.map(c => c.no).join(",")
  }));
  check("merging a cluster removes it and moves its levers to the target",
    merged.n === clustersBefore && merged.leverOwner === "commercial");
  check("cluster numbering stays contiguous after a structural change",
    merged.numbering === Array.from({ length: clustersBefore }, (_, i) => i + 1).join(","));
  check("state stays contract-valid after add + merge",
    await page.evaluate(() => validateState(JSON.parse(localStorage.getItem("capability_compass_state_v1"))).length === 0));

  // ---------- Roles: two-axis critical-role rubric ----------
  await page.click('.tab[data-view="roles"]');
  await page.waitForTimeout(400);
  check("roles view renders the four-route matrix", await page.locator(".rm-quadrant").count() === 4);
  const quadTexts = await page.locator(".rm-quadrant").allTextContents();
  check("Critical quadrant holds the scarce-but-codifiable seats",
    quadTexts.some(t => t.includes("Critical role") && t.includes("Head of Pricing")));
  check("Dual-critical quadrant holds high-leverage + high-tacit seats",
    quadTexts.some(t => t.includes("Dual-critical") && t.includes("Cargo & Pharma")));
  check("Specialist quadrant surfaces the quiet experts (load control, super-user)",
    quadTexts.some(t => t.includes("Specialist") && t.includes("Load Control")));
  check("highest-succession-risk card names an absent anchor seat",
    (await page.locator(".pattern-card").allTextContents()).some(t => t.includes("Head of Pricing")));
  check("key-person register is rendered separately from the critical-role list",
    (await page.locator(".xlens-title").allTextContents()).some(t => t.includes("Key-person risk register")));

  // Scoring a role live must re-route it
  await page.selectOption("#roles-cluster", "commercial");
  await page.waitForTimeout(400);
  check("role register table renders scored rows", await page.locator(".rt-table tbody tr").count() === 4);
  const firstRoute = await page.locator(".rt-table tbody tr").first().locator(".route-pill").textContent();
  await page.locator('.rt-table tbody tr').first().locator('[data-role^="tki.time"]').fill("5");
  await page.locator('.rt-table tbody tr').first().locator('[data-role^="tki.time"]').dispatchEvent("change");
  await page.waitForTimeout(400);
  await page.locator('.rt-table tbody tr').first().locator('[data-role^="tki.locked"]').fill("5");
  await page.locator('.rt-table tbody tr').first().locator('[data-role^="tki.locked"]').dispatchEvent("change");
  await page.waitForTimeout(400);
  const newRoute = await page.locator(".rt-table tbody tr").first().locator(".route-pill").textContent();
  check("raising tacit-knowledge scores re-routes Critical → Dual-critical",
    firstRoute.includes("Critical role") && newRoute.includes("Dual-critical"));

  // ---------- v4.4 scoring guide: definitions where the scoring happens ----------
  check("each criterion column opens its own definition", await page.locator("[data-crit]").count() === 6);
  await page.locator('[data-crit="locked"]').click();
  await page.waitForTimeout(400);
  const critText = await page.locator(".crit-card").textContent();
  check("criterion card gives the question, the boundary and 1/3/5 anchors",
    await page.locator(".crit-card").count() === 1 &&
    critText.includes("only inside individuals") &&
    critText.includes("Not how complicated") &&
    await page.locator(".crit-anchor").count() === 3);
  check("criterion card names the remedy a high score points at",
    (await page.locator(".crit-fix").textContent()).includes("cross-train"));
  await page.click("#crit-all");
  await page.waitForTimeout(400);
  check("scoring guide shows all six criteria at once",
    await page.locator(".crit-card").count() === 6 && await page.locator(".crit-anchor").count() === 18);
  check("guide separates the two axes visually",
    await page.locator(".crit-axis.a").count() === 3 && await page.locator(".crit-axis.b").count() === 3);
  await page.click("#crit-done");
  await page.waitForTimeout(300);
  check("closing the guide returns to the role register",
    await page.locator(".modal-backdrop.open").count() === 0 && await page.locator(".rt-table").count() === 1);
  await page.click("#role-guide");
  await page.waitForTimeout(400);
  check("the standalone Scoring guide button opens the full set",
    await page.locator(".crit-card").count() === 6);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  // Roles CSV import — current v4.4 headers
  const rolesCsv = [
    "cluster_id,role_title,status,consequence,scarcity,trend,tki_time,tki_locked,tki_relationship,note",
    "# comment row should be ignored",
    'food,"Head of Food Safety, Group",thin,4,4,3,4,3,3,Licence to operate',
    "not-a-cluster,Ghost Role,exists,3,3,3,3,3,3,should be skipped"
  ].join("\n");
  await page.setInputFiles("#file-roles", { name: "roles.csv", mimeType: "text/csv", buffer: Buffer.from(rolesCsv) });
  await page.waitForTimeout(600);
  const imported = await page.evaluate(() => {
    const food = state.clusters.find(c => c.id === "food");
    const r = food.roles.find(x => x.title === "Head of Food Safety, Group");
    return {
      hasRole: !!r,
      scored: r && r.axisA.consequence === 4 && r.tki.locked === 3,
      ghost: state.clusters.some(c => (c.roles || []).some(r2 => r2.title === "Ghost Role"))
    };
  });
  check("roles CSV import handles quoted commas and skips comment rows", imported.hasRole);
  check("roles CSV import lands the six scores on the right keys", imported.scored);
  check("roles CSV import rejects rows with an unknown cluster_id", imported.ghost === false);

  // BACK-COMPAT: a spreadsheet filled in against the v4.2 template still imports
  const legacyCsv = [
    "cluster_id,role_title,status,impact,scarcity,vacancy,pivotal,futurefit,tki_time,tki_codifiability,tki_concentration,tki_consequence,tki_relationship,note",
    "food,Legacy Scored Role,exists,5,5,4,5,4,3,2,3,4,2,Filled in on the old template"
  ].join("\n");
  await page.setInputFiles("#file-roles", { name: "legacy.csv", mimeType: "text/csv", buffer: Buffer.from(legacyCsv) });
  await page.waitForTimeout(600);
  const legacyImport = await page.evaluate(() => {
    const r = state.clusters.find(c => c.id === "food").roles.find(x => x.title === "Legacy Scored Role");
    return r ? { a: r.axisA, t: r.tki, route: routeRole(r) } : null;
  });
  check("a v4.2 role spreadsheet still imports and is migrated, not defaulted",
    !!legacyImport && legacyImport.a.consequence === 4.5 && legacyImport.a.scarcity === 5 &&
    legacyImport.t.locked === 2.5 && legacyImport.a.impact === undefined &&
    legacyImport.route === "critical");

  // ---------- Money at risk in currency (optional, an estimate until validated) ----------
  await page.click('.tab[data-view="valuechain"]');
  await page.waitForTimeout(400);
  check("every lever shows its stable ID", await page.locator(".vc-table .ref-chip").count() === 7 &&
    (await page.locator(".vc-table .ref-chip").first().textContent()) === "LV-01");
  const moneyLine = await page.locator(".money-line").textContent();
  check("money at risk is stated in currency and labelled an estimate",
    /\$[\d.,]+m at risk/.test(moneyLine) && moneyLine.includes("Estimate — 0 of 7 figures validated"));
  await page.locator('[data-lv="validated|0"]').check();
  await page.waitForTimeout(400);
  check("ticking a lever as finance-validated updates the label",
    (await page.locator(".money-line").textContent()).includes("1 of 7 figures validated"));
  const weightsBefore = await page.evaluate(() => state.valueChain.levers.map(l => l.share_pct));
  page.once("dialog", d => d.accept());
  await page.click("#vc-derive");
  await page.waitForTimeout(400);
  const derived = await page.evaluate(() => {
    const ls = state.valueChain.levers, tot = ls.reduce((a, l) => a + l.value_at_stake, 0);
    return ls.every(l => l.share_pct === Math.round(l.value_at_stake / tot * 100));
  });
  check("weights can be derived from the amounts at stake in one click", derived);
  await page.evaluate(w => { state.valueChain.levers.forEach((l, i) => { l.share_pct = w[i]; }); renderAll(); }, weightsBefore);
  await page.click('.tab[data-view="board"]');
  await page.waitForTimeout(300);
  const moneyChips = await page.locator(".b-money").allTextContents();
  check("board cards show money at risk, marked as an estimate until validated",
    moneyChips.length === 6 && moneyChips.filter(t => t.includes("(est.)")).length === 5);
  check("the cluster whose only lever is validated drops the estimate label",
    moneyChips.filter(t => !t.includes("(est.)")).length === 1);
  await page.click('.tab[data-view="matrix"]');
  await page.waitForTimeout(300);
  check("matrix rows carry the same money figure", (await page.locator(".mat-chip").first().textContent()).includes("at risk"));
  await page.click('.tab[data-view="valuechain"]');
  await page.waitForTimeout(300);
  await page.locator('[data-lv="value_at_stake|6"]').fill("");
  await page.locator('[data-lv="value_at_stake|6"]').dispatchEvent("change");
  await page.waitForTimeout(300);
  check("clearing an amount removes the money figure for that cluster rather than showing zero",
    await page.evaluate(() => clusterMoney(state, state.clusters.find(c => c.id === "enabling")).hasValue === false));
  await page.evaluate(() => { state.valueChain.levers[6].value_at_stake = 25; renderAll(); });

  // ---------- Evidence grade: the assessor's judgement, with the evidence in view ----------
  await page.click('.tab[data-view="matrix"]');
  await page.waitForTimeout(300);
  await page.click('.cell[data-cluster="tdx"][data-lens="Culture"]');
  await page.waitForTimeout(400);
  check("the drawer offers the three grades and says what the grade rests on",
    await page.locator("#d-grade option").count() === 4 &&
    (await page.locator(".grade-basis").textContent()).includes("it does not decide the grade"));
  check("the demo's own grade is shown, not recomputed", (await page.locator("#d-grade").inputValue()) === "hypothesis");
  await page.selectOption("#d-grade", "indicated");
  await page.click("#ev-add");
  await page.waitForTimeout(200);
  await page.locator("[data-ev-label]").last().fill("Process Map Studio reality view");
  await page.locator("[data-ev-note]").last().fill("Decision made by a different role in 22% of cases");
  await page.locator("[data-ev-ref]").last().fill("X5");
  await page.click("#d-save");
  await page.waitForTimeout(400);
  const graded = await page.evaluate(() => {
    const c = state.clusters.find(x => x.id === "tdx").cells.Culture;
    return { grade: c.grade, ref: c.evidence[c.evidence.length - 1].ref, n: c.evidence.length };
  });
  check("the chosen grade is saved exactly as chosen", graded.grade === "indicated");
  check("an evidence item can cite another app's finding by its ID", graded.ref === "X5");
  check("the matrix cell shows the grade beside the source count",
    (await page.locator('.cell[data-cluster="tdx"][data-lens="Culture"] .conf-dot').textContent()).includes("Indicated"));
  check("OWNER DECISION: adding sources never changes a grade by itself",
    await page.evaluate(() => {
      const c = state.clusters.find(x => x.id === "tdx").cells.Culture;
      c.evidence.push({ label: "A", note: "" }, { label: "B", note: "" }); renderAll();
      return state.clusters.find(x => x.id === "tdx").cells.Culture.grade === "indicated";
    }));

  // ---------- v4 rubric: drawer confidence, evidence mix, watch signals ----------
  await page.click('.tab[data-view="matrix"]');
  await page.waitForTimeout(300);
  await page.click('.cell[data-cluster="commercial"][data-lens="Process"]');
  await page.waitForTimeout(400);
  const dMeta = await page.locator(".drawer-head").textContent();
  check("drawer shows trajectory confidence", /High confidence|Medium confidence/.test(dMeta));
  check("drawer shows evidence-mix badge", await page.locator(".mix-badge").count() === 1);
  check("drawer shows conditional outlook wording (IF indicators hold)",
    dMeta.includes("IF indicators hold") || !dMeta.includes("projected"));
  check("demo watch signal rendered as falsifier", (await page.locator("[data-w]").count()) >= 1);
  await page.click("#w-add");
  await page.waitForTimeout(200);
  const wInputs = page.locator("[data-w]");
  await wInputs.last().fill("CPQ usage below 40% at next refresh → re-score Process");
  await page.click("#d-save");
  await page.waitForTimeout(400);
  await page.click('.cell[data-cluster="commercial"][data-lens="Process"]');
  await page.waitForTimeout(400);
  const watchVals = await page.locator("[data-w]").evaluateAll(els => els.map(e => e.value));
  check("added watch signal persists after save/reopen", watchVals.some(v => v.includes("CPQ usage below 40%")));
  check("scoring-discipline hint visible at level picker",
    (await page.locator(".drawer-body").textContent()).includes("between two levels, take the lower"));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);

  // ---------- New: Signals view gating ----------
  await page.click('.tab[data-view="signals"]');
  await page.waitForTimeout(300);
  check("signals view gated when no API key", await page.locator("#sig-open-settings").count() === 1);

  // ---------- New: Settings API config + test connection (mock) ----------
  await page.click("#sig-open-settings");
  await page.waitForTimeout(300);
  check("settings shows API key field", await page.locator("#set-api-key").count() === 1);
  check("settings shows model picker with Opus 4.8 default",
    (await page.locator("#set-model").inputValue()) === "claude-opus-4-8");
  await page.fill("#set-api-key", "mock");
  await page.click("#btn-test-conn");
  await page.waitForTimeout(600);
  const connText = await page.locator("#conn-status").textContent();
  check("test connection succeeds in mock mode", connText.includes("✓") && connText.includes("Mock mode"));
  await page.click("#set-save");
  await page.waitForTimeout(300);

  // ---------- New: scan → briefing → apply signal ----------
  await page.click('.tab[data-view="signals"]');
  await page.waitForTimeout(300);
  check("signals view unlocked with key", await page.locator("#sig-scan").count() === 1);
  check("watch keywords prefilled from preset",
    (await page.locator("#sig-keywords").inputValue()).includes("cargo tonnage"));
  await page.click("#sig-scan");
  await page.waitForTimeout(1200);
  check("scan produces a briefing with 3 signals", await page.locator(".sig-card").count() === 3);
  check("each signal gets a stable ID", (await page.locator(".sig-card .ref-chip").allTextContents()).join() === "SG-001,SG-002,SG-003");
  await page.locator(".sig-grade").first().selectOption("hypothesis");
  await page.waitForTimeout(200);
  check("a signal is graded by hand as Metric, Trace or Claim",
    (await page.locator(".sig-grade option").nth(3).textContent()).includes("Claim") &&
    await page.evaluate(() => state.briefings[state.briefings.length - 1].signals[0].grade === "hypothesis"));
  check("direction badges are text-labelled (no colour-only)",
    (await page.locator(".sig-dir").allTextContents()).every(t => /Tailwind|Headwind|Neutral/.test(t)));

  const applyBtn = page.locator("[data-apply-sig]").first();
  const applyTarget = (await applyBtn.getAttribute("data-apply-sig")).split("|");
  await applyBtn.click();
  await page.waitForTimeout(400);
  check("apply button marks as applied", (await page.locator("[data-apply-sig]").first().textContent()).includes("Applied"));

  // The applied signal must now appear as a leading indicator in the drawer
  const [, , clusterId] = applyTarget;
  await page.click('.tab[data-view="matrix"]');
  await page.waitForTimeout(300);
  const sigLensKey = await page.evaluate((cid) => {
    const s = JSON.parse(localStorage.getItem("capability_compass_state_v1"));
    const b = s.briefings[s.briefings.length - 1];
    return b.signals.find(x => x.applied && x.applied[cid]).lens_key;
  }, clusterId);
  await page.click(`.cell[data-cluster="${clusterId}"][data-lens="${sigLensKey}"]`);
  await page.waitForTimeout(400);
  const liNames = await page.locator("[data-li-name]").evaluateAll(els => els.map(e => e.value));
  check("applied signal appears as a leading indicator in the cell", liNames.some(n => n.length > 10));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);

  // ---------- New: Claude-assisted cluster tuning (mock, proposals only) ----------
  await page.click('.tab[data-view="valuechain"]');
  await page.waitForTimeout(400);
  check("cluster tuning unlocks once an API key is present",
    await page.locator("#calib-scan").count() === 1 && await page.locator("#calib-settings").count() === 0);
  const clustersPreTune = await page.evaluate(() => state.clusters.length);
  await page.click("#calib-scan");
  await page.waitForTimeout(1200);
  check("cluster tuning returns calibration proposals", await page.locator(".calib-card").count() >= 2);
  check("proposals state an action, a rationale and a confidence level",
    (await page.locator(".calib-action").allTextContents()).length >= 2 &&
    await page.locator(".calib-why").count() >= 2 && await page.locator(".conf-pill").count() >= 2);
  check("a proposal resting only on the money map says so rather than citing a source",
    (await page.locator(".calib-src").allTextContents()).some(t => t.includes("no external source cited")));
  check("PROPOSALS ONLY: nothing is applied to the cluster set automatically",
    await page.evaluate(() => state.clusters.length) === clustersPreTune &&
    await page.evaluate(() => state.calibrations[0].proposals.every(p => !p.applied)));
  check("a 'keep' proposal offers no apply button — it is not a change",
    (await page.locator(".calib-card.keep .applied-note").textContent()).includes("No action needed"));

  const dismissBefore = await page.locator("[data-cal-skip]").count();
  await page.locator("[data-cal-skip]").first().click();
  await page.waitForTimeout(400);
  check("dismissing a proposal records the decision and removes its buttons",
    await page.locator("[data-cal-skip]").count() === dismissBefore - 1 &&
    (await page.locator(".applied-note").allTextContents()).some(t => t.includes("Dismissed")));
  check("calibration record persists in state and stays contract-valid",
    await page.evaluate(() => validateState(JSON.parse(localStorage.getItem("capability_compass_state_v1"))).length === 0 &&
      JSON.parse(localStorage.getItem("capability_compass_state_v1")).calibrations.length === 1));

  // ---------- New: Evidence view — upload, ingest, synthesize, apply ----------
  await page.click('.tab[data-view="evidence"]');
  await page.waitForTimeout(300);
  check("evidence view renders dropzone + picker + paste option",
    await page.locator("#ev-drop").count() === 1 && await page.locator("#ev-paste").count() === 1);

  const surveyText = [
    "Engagement Survey 2026 — divisional summary",
    "Safety engagement fell 5 points below the high-performance norm.",
    "Attrition in critical commercial roles: 14% (up from 9%).",
    "CRM deployed to 8 of 12 sites; active usage 55%."
  ].join("\n");
  await page.setInputFiles("#file-evidence", [
    { name: "survey2026.txt", mimeType: "text/plain", buffer: Buffer.from(surveyText) },
    { name: "scan-only.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 fake scanned pdf with no text layer") },
    { name: "legacy-plan.doc", mimeType: "application/msword", buffer: Buffer.from("old binary word file") }
  ]);
  await page.waitForTimeout(800);
  check("three documents ingested into the list", await page.locator(".doc-row").count() === 3);
  const statuses = await page.locator(".doc-status").allTextContents();
  check("txt parsed locally, scanned pdf routed to Claude, legacy .doc flagged",
    statuses.some(s => s.includes("parsed locally")) &&
    statuses.some(s => s.includes("scanned PDF")) &&
    statuses.some(s => s.toLowerCase().includes("unsupported") || s.toLowerCase().includes("could not parse")));

  // ---------- Broader formats: real .xlsx/.docx/.pptx built by the vendored libs, real text-layer PDF ----------
  const office = await page.evaluate(async () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ["Role", "Status"], ["Pricing architect", "Vacant"], ["RevOps lead", "Vacant"], ["Attrition critical roles", "14%"]
    ]), "Workforce");
    const xlsxB64 = XLSX.write(wb, { bookType: "xlsx", type: "base64" });
    const z1 = new JSZip();
    z1.file("word/document.xml", "<w:document><w:body><w:p><w:r><w:t>Strategy 2026: scale hub-of-the-future globally.</w:t></w:r></w:p><w:p><w:r><w:t>Safety engagement sits 5 points below the norm.</w:t></w:r></w:p></w:body></w:document>");
    const docxB64 = await z1.generateAsync({ type: "base64" });
    const z2 = new JSZip();
    z2.file("ppt/slides/slide1.xml", "<p:sld><p:txBody><a:p><a:r><a:t>Transform to Win offsite</a:t></a:r></a:p><a:p><a:r><a:t>CRM adoption at 55 percent of deployed sites</a:t></a:r></a:p></p:txBody></p:sld>");
    const pptxB64 = await z2.generateAsync({ type: "base64" });
    return { xlsxB64, docxB64, pptxB64 };
  });
  const pdfLines = [
    "Annual report extract for capability diagnostic evidence.",
    "Cargo tonnage grew 8 percent year on year across the network.",
    "Ground handling productivity improved 12 percent after automation rollout.",
    "Safety incident severity remains above tolerance in two regions.",
    "Successor coverage for critical leadership roles reached 90 percent."
  ];
  await page.setInputFiles("#file-evidence", [
    { name: "workforce.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: Buffer.from(office.xlsxB64, "base64") },
    { name: "strategy.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: Buffer.from(office.docxB64, "base64") },
    { name: "offsite.pptx", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", buffer: Buffer.from(office.pptxB64, "base64") },
    { name: "annual-report.pdf", mimeType: "application/pdf", buffer: makeTextPdf(pdfLines) }
  ]);
  await page.waitForTimeout(1500);
  check("office + PDF batch ingests (7 documents total)", await page.locator(".doc-row").count() === 7);
  const statuses2 = await page.locator(".doc-status").allTextContents();
  check("Excel, Word, PowerPoint and text-layer PDF all parsed locally",
    statuses2.some(s => s.includes("Excel parsed locally")) &&
    statuses2.some(s => s.includes("Word parsed locally")) &&
    statuses2.some(s => s.includes("PowerPoint parsed locally")) &&
    statuses2.some(s => s.includes("PDF parsed locally")));
  const parsedTexts = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("capability_compass_state_v1"));
    return s.documents.map(d => d.text || "").join("\n");
  });
  check("Excel content extracted (roles + figures survive as a table)",
    parsedTexts.includes("Pricing architect,Vacant") && parsedTexts.includes("Attrition critical roles,14%"));
  check("Word content extracted verbatim", parsedTexts.includes("scale hub-of-the-future globally"));
  check("PowerPoint content extracted per slide", parsedTexts.includes("CRM adoption at 55 percent"));
  check("PDF text layer extracted by pdf.js (page-marked)",
    parsedTexts.includes("Cargo tonnage grew 8 percent") && parsedTexts.includes("--- Page 1 ---"));

  await page.locator("[data-doc-label]").first().fill("Engagement Survey 2026");
  await page.locator("[data-doc-label]").first().press("Enter");
  await page.locator("[data-doc-type]").first().selectOption("survey-report");
  await page.waitForTimeout(200);

  // Paste-text path (Word/Excel escape hatch)
  await page.click("#ev-paste");
  await page.waitForTimeout(300);
  await page.fill("#paste-label", "Org chart extract");
  await page.selectOption("#paste-type", "org-chart");
  await page.fill("#paste-text", "CCO in place. Pricing architect: vacant. RevOps lead: vacant. Bid manager: interim.");
  await page.click("#paste-save");
  await page.waitForTimeout(400);
  check("pasted text becomes an eighth (text) document", await page.locator(".doc-row").count() === 8);

  await page.click("#ev-analyze");
  await page.waitForTimeout(1200);
  check("analysis produces findings mapped to cluster × lens", await page.locator(".finding-card:not(.role-card)").count() === 3);
  check("findings quote the uploaded document's own content (proof of ingestion)",
    (await page.locator(".finding-quote").allTextContents()).some(t => t.includes("Engagement Survey 2026") || t.includes("Safety engagement")));
  check("findings carry leading/lagging classification badges",
    (await page.locator(".finding-card .sig-dir").allTextContents()).some(t => t.includes("Leading")) &&
    (await page.locator(".finding-card .sig-dir").allTextContents()).some(t => t.includes("Lagging")));

  // Role extraction from the same documents
  check("analysis also extracts roles from the documents", await page.locator("[data-apply-role]").count() === 2);
  check("extracted roles carry a route and status",
    (await page.locator(".finding-card .route-pill").allTextContents()).length >= 2 &&
    (await page.locator(".finding-card .rm-status").allTextContents()).some(t => t.includes("Absent")));
  const rolesBefore = await page.evaluate(() => state.clusters.reduce((a, c) => a + (c.roles || []).length, 0));
  await page.locator("[data-apply-role]").first().click();
  await page.waitForTimeout(400);
  const rolesAfter = await page.evaluate(() => state.clusters.reduce((a, c) => a + (c.roles || []).length, 0));
  check("applying an extracted role adds it to the cluster's role register", rolesAfter === rolesBefore + 1);
  check("applied role button marks as added",
    (await page.locator("[data-apply-role]").first().textContent()).includes("Added"));

  // Templates
  check("evidence view offers download templates", await page.locator("[data-tpl]").count() === 3);
  const dlPromise = page.waitForEvent("download", { timeout: 5000 });
  await page.locator('[data-tpl="role-inventory"]').click();
  const download = await dlPromise.catch(() => null);
  check("role-inventory template downloads with the right filename",
    !!download && download.suggestedFilename() === "role-inventory-template.csv");

  // Apply the leading finding (index 1: commercial × People, improving)
  await page.locator("[data-apply-find]").nth(1).click();
  await page.waitForTimeout(400);
  check("applied finding marks as applied",
    (await page.locator("[data-apply-find]").nth(1).textContent()).includes("Applied"));
  const applied = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("capability_compass_state_v1"));
    const f = s.analyses[s.analyses.length - 1].findings[1];
    const cell = s.clusters.find(c => c.id === f.cluster_id).cells[f.lens_key];
    return {
      evidenceHit: cell.evidence.some(e => e.note && e.note.length > 5),
      leadingHit: f.classification !== "leading" || cell.leading.some(l => l.signal === f.direction),
      watchHit: !f.watch || cell.watch.includes(f.watch)
    };
  });
  check("applied finding lands in the cell as evidence + leading indicator + watch",
    applied.evidenceHit && applied.leadingHit && applied.watchHit);

  // "Open cell" click-through from a finding
  await page.locator("[data-open-cell]").first().click();
  await page.waitForTimeout(400);
  check("finding click-through opens the target cell drawer", await page.locator(".drawer.open").count() === 1);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);

  // ---------- New: persistence + key isolation ----------
  await page.reload();
  await page.waitForTimeout(600);
  check("state persists after reload (no wizard)", await page.locator(".modal-backdrop.open").count() === 0);
  await page.click('.tab[data-view="signals"]');
  await page.waitForTimeout(300);
  check("briefing persists after reload", await page.locator(".sig-card").count() === 3);

  await page.click('.tab[data-view="evidence"]');
  await page.waitForTimeout(300);
  check("document list persists after reload", await page.locator(".doc-row").count() === 8);
  check("analysis + applied flag persist after reload",
    await page.locator(".finding-card:not(.role-card)").count() === 3 &&
    (await page.locator("[data-apply-find]").nth(1).textContent()).includes("Applied"));
  const statusesAfter = await page.locator(".doc-status").allTextContents();
  check("all locally-parsed docs stay ready; scanned PDF honestly asks for re-attach (binary never persisted)",
    statusesAfter.filter(s => s.includes("parsed locally")).length === 6 &&
    statusesAfter.some(s => s.includes("Re-attach")));

  const isolation = await page.evaluate(() => {
    const stateRaw = localStorage.getItem("capability_compass_state_v1");
    const apiRaw = localStorage.getItem("capability_compass_api_v1");
    return {
      stateHasKey: stateRaw.includes("mock") && stateRaw.includes("apiKey"),
      apiStored: apiRaw !== null && JSON.parse(apiRaw).apiKey === "mock"
    };
  });
  check("API key stored separately from diagnostic state", isolation.apiStored && !isolation.stateHasKey);

  // Export must never contain the API key; import must round-trip.
  const exported = await page.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem("capability_compass_state_v1"))));
  check("exported state contains no API key material", !exported.includes('"apiKey"') && !exported.includes("sk-ant"));
  check("exported state contains no binary document payloads", !exported.includes("JVBERi") && !exported.includes('"data":'));
  const importOk = await page.evaluate((raw) => {
    const parsed = JSON.parse(raw);
    return validateState(parsed).length === 0;
  }, exported);
  check("export → import round-trip passes contract validation", importOk);

  // Trajectory reflects the applied signal (regression: engine still in range)
  await page.click('.tab[data-view="trajectory"]');
  await page.waitForTimeout(300);
  check("trajectory still renders after signal application", await page.locator(".traj-row").count() === 6);

  // ---------- Remove key → view gates again ----------
  await page.click("#btn-settings");
  await page.waitForTimeout(300);
  await page.click("#btn-clear-key");
  await page.waitForTimeout(200);
  await page.keyboard.press("Escape");
  await page.click('.tab[data-view="signals"]');
  await page.waitForTimeout(300);
  check("signals view gates again after key removal", await page.locator("#sig-open-settings").count() === 1);

  // ---------- Prediction honesty: a fresh diagnostic shows UNKNOWN, not "Stable" ----------
  await page.click("#btn-settings");
  await page.waitForTimeout(300);
  await page.click("#set-wizard");
  await page.waitForTimeout(300);
  await page.click('[data-preset="generic"]');
  await page.waitForTimeout(300);
  await page.click("#wiz-go");
  await page.waitForTimeout(500);
  await page.click('.tab[data-view="matrix"]');
  await page.waitForTimeout(300);
  check("fresh diagnostic renders 24 cells", await page.locator(".cell").count() === 24);
  check("fresh cells show '? Unknown' trajectory — never a guessed arrow",
    await page.locator(".momo-unknown").count() === 24);
  const velKpi = await page.locator(".kpi").nth(2).textContent();
  check("velocity KPI honestly reports no trajectory evidence", velKpi.includes("? n/a"));
  const evKpi = await page.locator(".kpi").nth(4).textContent();
  check("evidence-gap finding surfaces when unknown > 25%", evKpi.includes("evidence gap"));

  // A fresh diagnostic ships the industry's money map STRUCTURE, no numbers.
  await page.click('.tab[data-view="valuechain"]');
  await page.waitForTimeout(400);
  check("a fresh diagnostic seeds the industry's typical P&L levers",
    await page.locator(".vc-table tbody tr").count() === 6);
  check("HONESTY: seeded levers carry no invented weights",
    await page.evaluate(() => state.valueChain.levers.every(l => l.share_pct === 0 && l.seeded)));
  check("every seeded lever already points at a real cluster",
    await page.evaluate(() => state.valueChain.levers.every(l =>
      state.clusters.some(c => c.id === l.cluster_id))));
  check("the calibration verdict asks for weights rather than claiming a fit",
    (await page.locator(".calib-fit").textContent()).includes("No weights"));
  await page.click('.tab[data-view="board"]');
  await page.waitForTimeout(400);
  check("unweighted starter levers do NOT switch the board to value ordering",
    (await page.locator(".view-note").textContent()).includes("weakest-first"));
  await page.click('.tab[data-view="matrix"]');
  await page.waitForTimeout(300);
  await page.click('.tab[data-view="trajectory"]');
  await page.waitForTimeout(300);
  const unknownCard = await page.locator(".alert-card").nth(4).textContent();
  check("direction-unknown alert lists unassessed cells", unknownCard.includes("Direction unknown"));
  check("evidence-infrastructure-gap message shown", unknownCard.includes("evidence-infrastructure gap"));

  // Regression for the fresh-state crash: uploading evidence on a
  // wizard-created diagnostic must work (state.documents backfilled).
  await page.click('.tab[data-view="evidence"]');
  await page.waitForTimeout(300);
  await page.setInputFiles("#file-evidence", [
    { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("Fresh diagnostic evidence upload should not crash.") }
  ]);
  await page.waitForTimeout(500);
  check("REGRESSION FIX: upload works on a fresh wizard-created diagnostic (no 'push of undefined')",
    await page.locator(".doc-row").count() === 1);

  // ---------- Stage 0: the Charter (on the fresh workspace) ----------
  await page.click('.tab[data-view="journey"]');
  await page.waitForTimeout(300);
  check("a fresh workspace's journey starts at Stage 0 with nothing marked done",
    (await page.locator(".jr-next strong").textContent()).includes("Stage 0") && await page.locator(".jr-card.st-done").count() === 0);
  await page.click(".jr-next [data-goto]");
  await page.waitForTimeout(400);
  check("'Continue' on the journey opens the Charter", await page.locator("#ch-gate").count() === 1);
  check("Stage 0 gate lists six checks; the defaults already satisfy three",
    await page.locator("#ch-gate .gate-list li").count() === 6 && await page.locator("#ch-gate .gate-list li.ok").count() === 3);
  check("only the sections that need the owner's words start open",
    (await page.locator(".ch-sec[open]").evaluateAll(els => els.map(e => e.dataset.sec).join())) === "thesis,principles,decisions");
  for (const k of ["serve", "outcome", "profit", "moat", "scale"]) {
    await page.fill(`[data-ch="thesis.${k}"]`, "Test " + k + " statement.");
    await page.locator(`[data-ch="thesis.${k}"]`).dispatchEvent("change");
  }
  await page.waitForTimeout(200);
  check("the gate updates as the thesis is written, without redrawing the page",
    (await page.locator("#ch-gate .gate-list li").first().getAttribute("class")).includes("ok") &&
    (await page.locator('[data-ch="thesis.scale"]').inputValue()) === "Test scale statement.");
  for (let i = 0; i < 3; i++) {
    await page.click('[data-ch-add="principles"]');
    await page.waitForTimeout(150);
    await page.fill(`[data-ch="principles.${i}.text"]`, "Principle " + (i + 1));
    await page.locator(`[data-ch="principles.${i}.text"]`).dispatchEvent("change");
    await page.fill(`[data-ch="principles.${i}.refute"]`, "Refuted by evidence " + (i + 1));
    await page.locator(`[data-ch="principles.${i}.refute"]`).dispatchEvent("change");
  }
  check("principles are numbered P1 to P3 and each carries what would refute it",
    await page.evaluate(() => state.charter.principles.map(p => p.ref).join() === "P1,P2,P3" && state.charter.principles.every(p => p.refute)));
  await page.fill('[data-ch="sponsor"]', "Group sponsor");
  await page.locator('[data-ch="sponsor"]').dispatchEvent("change");
  for (let i = 0; i < 6; i++) {
    await page.fill(`[data-ch="decisions.${i}.owner"]`, "Owner " + i);
    await page.locator(`[data-ch="decisions.${i}.owner"]`).dispatchEvent("change");
  }
  await page.waitForTimeout(200);
  check("with thesis, principles and owners in, every Stage 0 check is met",
    await page.locator("#ch-gate .gate-list li.ok").count() === 6);

  await page.locator('.ch-sec[data-sec="criteria"] > summary').click();
  await page.fill('[data-ch="criteria.0.weight"]', "30");
  await page.locator('[data-ch="criteria.0.weight"]').dispatchEvent("change");
  await page.waitForTimeout(200);
  check("criteria that no longer total 100 fail the gate and say so",
    (await page.locator("#ch-total").textContent()) === "105" && await page.locator("#ch-gate .gate-list li.ok").count() === 5);
  await page.fill('[data-ch="criteria.0.weight"]', "25");
  await page.locator('[data-ch="criteria.0.weight"]').dispatchEvent("change");
  await page.waitForTimeout(200);

  await page.click("#ch-lock");
  await page.waitForTimeout(400);
  const locked = await page.evaluate(() => ({
    at: !!state.charter.lockedAt, dec0: state.charter.decisions[0].status,
    disabled: document.querySelector('[data-ch="thesis.serve"]').disabled,
    ownerEditable: !document.querySelector('[data-ch="decisions.1.owner"]').disabled
  }));
  check("locking the charter freezes the rules and records the Stage 0 decision",
    locked.at && locked.dec0 === "decided" && locked.disabled && await page.locator(".gate-panel.locked").count() === 1);
  check("the decision log stays writable after the lock", locked.ownerEditable);
  page.once("dialog", d => d.accept("Sponsor changed the weighting after the offsite"));
  await page.click("#ch-amend");
  await page.waitForTimeout(400);
  const amended = await page.evaluate(() => ({
    open: state.charter.lockedAt === null, n: state.charter.amendments.length,
    logged: state.charter.decisions.some(d => /Charter reopened: Sponsor changed/.test(d.decision) && /^DEC-\d+$/.test(d.ref))
  }));
  check("reopening a locked charter needs a reason, and the reason lands in the decision log",
    amended.open && amended.n === 1 && amended.logged);
  await page.fill('[data-ch="sponsor"]', "");
  await page.locator('[data-ch="sponsor"]').dispatchEvent("change");
  let lockDialog = "";
  page.once("dialog", d => { lockDialog = d.message(); d.accept(); });
  await page.click("#ch-lock");
  await page.waitForTimeout(400);
  check("FLEXIBLE BUT VISIBLE: locking with an item open is allowed, warned, and recorded",
    lockDialog.includes("still open") &&
    await page.evaluate(() => !!state.charter.lockedAt && state.charter.decisions.some(d => /locked with 1 item\(s\) open/.test(d.decision))));
  check("the charter passes the data contract",
    await page.evaluate(() => validateState(JSON.parse(localStorage.getItem("capability_compass_state_v1"))).length === 0));
  await page.click('.tab[data-view="journey"]');
  await page.waitForTimeout(300);
  check("the journey now shows Stage 0 done and moves the next step to Stage 1",
    (await page.locator(".jr-card").first().getAttribute("class")).includes("st-done") &&
    (await page.locator(".jr-next strong").textContent()).includes("Stage 1"));

  // ---------- Workspaces: several named diagnostics, never overwriting each other ----------
  const wsCount = async () => page.evaluate(() => [...document.querySelectorAll("#ws-switch option")].filter(o => !o.disabled && !o.value.startsWith("__")).length);
  check("starting a new diagnostic kept the demo as its own workspace", await wsCount() === 2);
  const demoWsId = await page.evaluate(() => wsReadIndex().list.find(w => /demo/i.test(w.name)).id);
  await page.selectOption("#ws-switch", demoWsId);
  await page.waitForTimeout(500);
  const backInDemo = await page.evaluate(() => ({
    org: state.orgName, docs: state.documents.length, roles: state.clusters.reduce((a, c) => a + c.roles.length, 0),
    parkedSelf: localStorage.getItem("capability_compass_ws_" + state.workspaceId)
  }));
  check("switching workspace restores the other diagnostic intact (documents, roles, scores)",
    backInDemo.org.includes("Meridian") && backInDemo.docs === 8 && backInDemo.roles >= 19);
  check("the active workspace is stored once, not duplicated", backInDemo.parkedSelf === null);

  await page.selectOption("#ws-switch", "__new__");
  await page.waitForTimeout(400);
  await page.click('[data-preset="aviation-logistics"]');
  await page.waitForTimeout(300);
  await page.fill("#wiz-org", "Meridian Group");
  await page.fill("#wiz-ws", "Gateway segment");
  await page.check('[name="wiz-unit"][value="value-stream"]');
  await page.fill("#wiz-streams", "Export cargo handling\nImport cargo and delivery\nGround turn operations");
  await page.click("#wiz-go");
  await page.waitForTimeout(600);
  await page.click('.tab[data-view="matrix"]');
  await page.waitForTimeout(300);
  const vsWs = await page.evaluate(() => ({
    unit: state.unit, n: state.clusters.length, refs: state.clusters.map(c => c.ref).join(), levers: state.valueChain.levers.length,
    name: state.workspaceName, head: document.querySelector(".mh.corner").textContent
  }));
  check("a value-stream workspace scores the streams the owner named", vsWs.unit === "value-stream" && vsWs.n === 3 && await page.locator(".cell").count() === 12);
  check("its rows carry value-stream IDs and the matrix says 'Value stream'", vsWs.refs === "VS-01,VS-02,VS-03" && vsWs.head.includes("Value stream"));
  check("it starts with no orphan levers pointing at clusters it does not have", vsWs.levers === 0);
  // Regression: typing in a field and clicking a button straight away must not lose the click
  await page.click('.tab[data-view="valuechain"]');
  await page.waitForTimeout(300);
  await page.click("#vc-add");
  await page.waitForTimeout(300);
  await page.fill('[data-lv="name|0"]', "Yield per tonne");      // no blur, no change event yet
  await page.click("#vc-add");                                   // the blur and the click arrive together
  await page.waitForTimeout(400);
  check("REGRESSION FIX: a button clicked straight after typing still works (redraw waits for the click)",
    await page.evaluate(() => state.valueChain.levers.length === 2 && state.valueChain.levers[0].name === "Yield per tonne"));
  check("levers added by hand get stable IDs too",
    await page.evaluate(() => state.valueChain.levers.map(l => l.ref).join() === "LV-01,LV-02"));
  await page.evaluate(() => { state.valueChain.levers[1].name = "Cost per tonne"; renderAll(); });

  check("three workspaces now listed, the new one active", await wsCount() === 3 && vsWs.name === "Gateway segment");
  check("every workspace passes the contract",
    await page.evaluate(() => wsReadIndex().list.every(w => {
      const raw = w.id === state.workspaceId ? localStorage.getItem("capability_compass_state_v1") : localStorage.getItem("capability_compass_ws_" + w.id);
      return raw && validateState(migrateState(JSON.parse(raw))).length === 0;
    })));
  check("no workspace store contains the API key",
    await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith("capability_compass_ws_") || k === "capability_compass_workspaces_v1" || k === "capability_compass_state_v1")
      .every(k => !/apiKey|sk-ant/.test(localStorage.getItem(k)))));

  await page.selectOption("#ws-switch", "__manage__");
  await page.waitForTimeout(300);
  await page.fill("#wsm-name", "Gateway Services");
  await page.click("#wsm-save");
  await page.waitForTimeout(300);
  check("a workspace can be renamed", (await page.locator("#ws-switch option:checked").textContent()) === "Gateway Services");
  await page.reload();
  await page.waitForTimeout(600);
  check("the active workspace survives a reload", await page.evaluate(() => state.workspaceName === "Gateway Services" && state.unit === "value-stream"));

  // An imported file becomes its own workspace — it never overwrites the one on screen
  const exportedWs = await page.evaluate(() => JSON.stringify(Object.assign(JSON.parse(localStorage.getItem("capability_compass_state_v1")), { workspaceName: "Imported copy" })));
  await page.setInputFiles("#file-import", { name: "backup.json", mimeType: "application/json", buffer: Buffer.from(exportedWs) });
  await page.waitForTimeout(600);
  check("importing a backup adds a workspace instead of replacing the current one",
    await wsCount() === 4 && await page.evaluate(() => state.workspaceName === "Imported copy"));

  await page.selectOption("#ws-switch", "__manage__");
  await page.waitForTimeout(300);
  page.once("dialog", d => d.accept());
  await page.click("#wsm-delete");
  await page.waitForTimeout(600);
  check("deleting a workspace removes only that one and lands in another",
    await wsCount() === 3 && await page.evaluate(() => !!state && state.workspaceName !== "Imported copy"));

  const realErrors = jsErrors.filter(e => !e.includes("ERR_TUNNEL") && !e.includes("Failed to load resource"));
  check("no JavaScript errors during the whole run", realErrors.length === 0);
  if (realErrors.length) console.log("  JS errors:", realErrors);

  await browser.close();
  console.log(failures ? `\n${failures} E2E FAILURE(S)` : "\nAll end-to-end checks passed.");
  process.exit(failures ? 1 : 0);
})();
