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

  await page.click('.tab[data-view="trajectory"]');
  await page.waitForTimeout(300);
  check("trajectory renders 6 cluster rows + 4 alert groups",
    await page.locator(".traj-row").count() === 6 && await page.locator(".alert-card").count() === 4);

  await page.click('.tab[data-view="delta"]');
  await page.waitForTimeout(300);
  check("delta renders rows against demo baseline", await page.locator(".delta-table tbody tr").count() > 0);

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

  // ---------- New: persistence + key isolation ----------
  await page.reload();
  await page.waitForTimeout(600);
  check("state persists after reload (no wizard)", await page.locator(".modal-backdrop.open").count() === 0);
  await page.click('.tab[data-view="signals"]');
  await page.waitForTimeout(300);
  check("briefing persists after reload", await page.locator(".sig-card").count() === 3);

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

  const realErrors = jsErrors.filter(e => !e.includes("ERR_TUNNEL") && !e.includes("Failed to load resource"));
  check("no JavaScript errors during the whole run", realErrors.length === 0);
  if (realErrors.length) console.log("  JS errors:", realErrors);

  await browser.close();
  console.log(failures ? `\n${failures} E2E FAILURE(S)` : "\nAll end-to-end checks passed.");
  process.exit(failures ? 1 : 0);
})();
