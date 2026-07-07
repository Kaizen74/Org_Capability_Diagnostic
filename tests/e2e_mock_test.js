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

const CHROMIUM = process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
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
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  const jsErrors = [];
  page.on("pageerror", e => jsErrors.push(e.message));

  await page.goto(APP_URL);
  await page.waitForTimeout(700);

  // ---------- Regression: original flows ----------
  check("wizard opens on first run", await page.locator(".modal-backdrop.open").count() === 1);
  await page.click("[data-demo]");
  await page.waitForTimeout(500);
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
  check("weakest-first sort puts Commercial Leadership on top",
    (await page.locator(".bcard h3").first().textContent()) === "Commercial Leadership");
  check("every cluster card names its binding constraint",
    await page.locator(".b-binding").count() === 6);
  check("commercial binding constraint targets People",
    (await page.locator(".bcard").first().locator(".b-bind-link").textContent()).includes("People"));

  await page.click('.tab[data-view="trajectory"]');
  await page.waitForTimeout(300);
  check("trajectory renders 6 cluster rows + 5 alert groups (incl. direction-unknown)",
    await page.locator(".traj-row").count() === 6 && await page.locator(".alert-card").count() === 5);
  check("cross-lens risk patterns detected and shown",
    await page.locator(".pattern-card").count() >= 3);
  check("adoption red flag pattern present",
    (await page.locator(".pattern-card h5").allTextContents()).some(t => t.includes("Adoption red flag")));

  await page.click('.tab[data-view="delta"]');
  await page.waitForTimeout(300);
  check("delta renders rows against demo baseline", await page.locator(".delta-table tbody tr").count() > 0);

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
  check("analysis produces findings mapped to cluster × lens", await page.locator(".finding-card").count() === 3);
  check("findings quote the uploaded document's own content (proof of ingestion)",
    (await page.locator(".finding-quote").allTextContents()).some(t => t.includes("Engagement Survey 2026") || t.includes("Safety engagement")));
  check("findings carry leading/lagging classification badges",
    (await page.locator(".finding-card .sig-dir").allTextContents()).some(t => t.includes("Leading")) &&
    (await page.locator(".finding-card .sig-dir").allTextContents()).some(t => t.includes("Lagging")));

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
    await page.locator(".finding-card").count() === 3 &&
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
  check("fresh diagnostic renders 24 cells", await page.locator(".cell").count() === 24);
  check("fresh cells show '? Unknown' trajectory — never a guessed arrow",
    await page.locator(".momo-unknown").count() === 24);
  const velKpi = await page.locator(".kpi").nth(2).textContent();
  check("velocity KPI honestly reports no trajectory evidence", velKpi.includes("? n/a"));
  const evKpi = await page.locator(".kpi").nth(4).textContent();
  check("evidence-gap finding surfaces when unknown > 25%", evKpi.includes("evidence gap"));
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

  const realErrors = jsErrors.filter(e => !e.includes("ERR_TUNNEL") && !e.includes("Failed to load resource"));
  check("no JavaScript errors during the whole run", realErrors.length === 0);
  if (realErrors.length) console.log("  JS errors:", realErrors);

  await browser.close();
  console.log(failures ? `\n${failures} E2E FAILURE(S)` : "\nAll end-to-end checks passed.");
  process.exit(failures ? 1 : 0);
})();
