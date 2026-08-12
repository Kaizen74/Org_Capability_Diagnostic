/* ============================================================
   Capability Compass — Contract test (no browser needed)

   Verifies that the data layer and the UI layer stay aligned by
   validating every data producer against the ONE shared schema
   (app/js/schema.js) that the app itself uses at runtime:
     1. the fictional demo dataset,
     2. a blank state generated from every industry preset,
     3. the mock Claude briefing (the shape real API responses
        are normalised into),
     4. the predictive engine's output ranges.

   Run:  node tests/contract_test.js
   ============================================================ */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const schema = require(path.join(__dirname, "..", "app", "js", "schema.js"));

// Load the browser-global scripts (presets, engine, llm) into one sandbox.
const sandbox = { module: undefined, console };
vm.createContext(sandbox);
for (const f of ["presets.js", "engine.js", "llm.js"]) {
  const code = fs.readFileSync(path.join(__dirname, "..", "app", "js", f), "utf8");
  vm.runInContext(code, sandbox, { filename: f });
}
// schema functions must be visible to llm.js's validateBriefing usage
Object.assign(sandbox, schema);

let failures = 0;
function check(name, errs) {
  if (Array.isArray(errs) ? errs.length : !errs) {
    failures++;
    console.log(`✗ ${name}` + (Array.isArray(errs) ? `\n    ${errs.slice(0, 5).join("\n    ")}` : ""));
  } else if (Array.isArray(errs)) {
    console.log(`✓ ${name}`);
  } else {
    console.log(`✓ ${name}`);
  }
}
function checkOk(name, cond) {
  if (cond) console.log(`✓ ${name}`);
  else { failures++; console.log(`✗ ${name}`); }
}

// ---- 1. Demo dataset conforms to the state contract ----
const demo = vm.runInContext("buildDemoState()", sandbox);
demo.briefings = [];
demo.signal_keywords = [];
check("demo state conforms to shared contract", schema.validateState(demo));

// ---- 2. Every preset produces a valid blank state ----
const presets = vm.runInContext("PRESETS", sandbox);
for (const p of presets) {
  const blank = {
    schema: 1, orgName: "Test Org", actor: "You",
    industry_id: p.industry_id, industry_name: p.display_name,
    lenses: vm.runInContext("JSON.parse(JSON.stringify(DEFAULT_LENSES))", sandbox),
    rubric: {}, patterns: [], versions: [], changeLog: [], briefings: [],
    signal_keywords: p.signal_keywords || [],
    currentVersion: "v0.1",
    clusters: p.clusters.map(c => ({
      id: c.id, no: c.no, name: c.name, desc: c.desc, priority_move: c.priority_move,
      cells: Object.fromEntries(["Structure", "People", "Process", "Culture"].map(k => [k, {
        level: 1, status: "Not yet assessed", rationale: "", intervention: "",
        items: [], evidence: [], leading: [], watch: [], history: [],
        last_updated: new Date().toISOString(), updated_by: "—"
      }]))
    }))
  };
  check(`preset '${p.industry_id}' produces a contract-valid state`, schema.validateState(blank));
}

// ---- 3. Mock briefing (normalised like the app does) passes the briefing contract ----
const rawMock = vm.runInContext("mockBriefing(buildDemoState(), ['cargo tonnage','IATA'])", sandbox);
const normalised = {
  id: "brf_test", generated_at: new Date().toISOString(), model: "mock",
  industry_id: demo.industry_id,
  signals: rawMock.signals.map(s => ({
    headline: s.headline, summary: s.summary, source: s.source,
    direction: s.direction, affected_cluster_ids: s.affected_cluster_ids,
    lens_key: s.lens_key, calibration_note: s.calibration_note, applied: {}
  }))
};
check("mock Claude briefing conforms to briefing contract", schema.validateBriefing(normalised));
checkOk("mock briefing cluster ids all exist in the diagnostic",
  normalised.signals.every(s => s.affected_cluster_ids.every(id => demo.clusters.some(c => c.id === id))));
checkOk("mock briefing lens keys all exist in the diagnostic",
  normalised.signals.every(s => demo.lenses.some(l => l.key === s.lens_key)));

// ---- 4. Applying a signal yields a contract-valid leading indicator ----
const sig = normalised.signals[0];
const targetCluster = demo.clusters.find(c => c.id === sig.affected_cluster_ids[0]);
targetCluster.cells[sig.lens_key].leading.push({ name: sig.headline.slice(0, 80), signal: schema.directionToLeading(sig.direction) });
check("state remains contract-valid after applying a signal", schema.validateState(demo));

// ---- 5. Engine outputs stay in range on the mutated state ----
vm.runInContext("globalThis.__state = " + JSON.stringify(demo), sandbox);
const kpis = vm.runInContext("enterpriseKpis(__state)", sandbox);
checkOk("engine: average maturity within [1,4]", kpis.avg >= 1 && kpis.avg <= 4);
checkOk("engine: velocity within [-1,1]", kpis.velocity >= -1 && kpis.velocity <= 1);
checkOk("engine: evidence coverage within [0,100]", kpis.groundedPct >= 0 && kpis.groundedPct <= 100);
const momenta = demo.clusters.flatMap(cl => demo.lenses.map(l =>
  vm.runInContext(`cellMomentum(__state, __state.clusters.find(c=>c.id==="${cl.id}"), "${l.key}")`, sandbox)));
checkOk("engine: every cell momentum within [-1,1]", momenta.every(m => m >= -1 && m <= 1));

// ---- 6. API key isolation: a state carrying a key must FAIL validation ----
const leaky = JSON.parse(JSON.stringify(demo));
leaky.apiKey = "sk-ant-should-never-be-here";
checkOk("contract rejects any state containing an API key", schema.validateState(leaky).length > 0);

// ---- 7. Scan prompt includes cluster ids and lens keys (prompt/parser alignment) ----
const prompt = vm.runInContext("buildScanPrompt(buildDemoState(), ['IATA'])", sandbox);
checkOk("scan prompt names every cluster id", demo.clusters.every(c => prompt.includes('"' + c.id + '"')));
checkOk("scan prompt names every lens key", demo.lenses.every(l => prompt.includes(l.key)));
checkOk("scan prompt demands JSON-only output", prompt.includes("ONLY a JSON object"));

// ---- 8. extractJson handles fenced and prose-wrapped responses ----
const extractJson = vm.runInContext("extractJson", sandbox);
checkOk("extractJson parses fenced JSON", extractJson('Here you go:\n```json\n{"signals":[]}\n```').signals.length === 0);
checkOk("extractJson parses prose-wrapped JSON", extractJson('Based on my research: {"signals": [{"headline":"x"}]} — done.').signals.length === 1);

// ---- 9. Prediction honesty (rubric v4): unknown is rendered, never guessed ----
const blankNoEvidence = {
  schema: 1, orgName: "Blank", actor: "You", industry_id: "generic", industry_name: "Generic",
  lenses: vm.runInContext("JSON.parse(JSON.stringify(DEFAULT_LENSES))", sandbox),
  rubric: {}, patterns: [], versions: [], changeLog: [], briefings: [], signal_keywords: [],
  currentVersion: "v0.1",
  clusters: [{
    id: "c1", no: 1, name: "Cluster One", desc: "", priority_move: "",
    cells: Object.fromEntries(["Structure", "People", "Process", "Culture"].map(k => [k, {
      level: 2, status: "Early", rationale: "", intervention: "",
      items: [], evidence: [], leading: [], watch: [], history: [],
      last_updated: new Date().toISOString(), updated_by: "—"
    }]))
  }]
};
vm.runInContext("globalThis.__blank = " + JSON.stringify(blankNoEvidence), sandbox);
const tUnknown = vm.runInContext('cellTrajectory(__blank, __blank.clusters[0], "Structure")', sandbox);
checkOk("no evidence → trajectory UNKNOWN (never a guessed 'stable')", tUnknown.known === false && tUnknown.confidence === "None");
checkOk("unknown trajectory renders '?' not an arrow",
  vm.runInContext("trajectoryLabel(" + JSON.stringify(tUnknown) + ").sym", sandbox) === "?");
checkOk("unknown trajectory yields NO projection",
  vm.runInContext('projectedLevel(__blank.clusters[0].cells.Structure, ' + JSON.stringify(tUnknown) + ')', sandbox) === 2);
checkOk("unknown cells classified 'unassessed', not steady",
  vm.runInContext('classifyCell(__blank.clusters[0].cells.Structure, ' + JSON.stringify(tUnknown) + ')', sandbox) === "unassessed");
const blankKpis = vm.runInContext("enterpriseKpis(__blank)", sandbox);
checkOk("enterprise velocity reported as not-known when nothing is assessable",
  blankKpis.velocityKnown === false && blankKpis.unknownPct === 100);

// ---- 10. Confidence + evidence mix rules (mechanical, per rubric) ----
const demo2 = vm.runInContext("buildDemoState()", sandbox);
vm.runInContext("globalThis.__d2 = " + JSON.stringify(demo2), sandbox);
const tHigh = vm.runInContext('cellTrajectory(__d2, __d2.clusters.find(c=>c.id==="gateway"), "Culture")', sandbox);
checkOk("history + ≥2 leading indicators → High confidence", tHigh.confidence === "High");
const tMed = vm.runInContext('cellTrajectory(__d2, __d2.clusters.find(c=>c.id==="food"), "Structure")', sandbox);
checkOk("history only (no leading indicators) → Medium confidence", tMed.confidence === "Medium");
checkOk("evidenceMix: sources + leading indicators → 'both'",
  vm.runInContext('evidenceMix(__d2.clusters.find(c=>c.id==="gateway").cells.Culture)', sandbox) === "both");
checkOk("evidenceMix: sources only → 'lagging' (rear-view photograph)",
  vm.runInContext('evidenceMix(__d2.clusters.find(c=>c.id==="food").cells.Structure)', sandbox) === "lagging");

// ---- 11. Cross-lens interdependency patterns (rubric indicator library) ----
const patterns = vm.runInContext("detectCrossLensPatterns(__d2)", sandbox);
checkOk("detects bench-starves-rollout (People L2 + Process L3, commercial)",
  patterns.some(p => p.key === "bench-starves-rollout" && p.clusterId === "commercial"));
checkOk("detects structure-without-people (Structure L4 + People L2, commercial)",
  patterns.some(p => p.key === "structure-without-people" && p.clusterId === "commercial"));
checkOk("detects adoption red flag (Process up + Culture down, food)",
  patterns.some(p => p.key === "adoption-red-flag" && p.clusterId === "food"));

// ---- 12. Binding constraint targets weak-and-not-moving, not just lowest ----
const bind = vm.runInContext('bindingConstraint(__d2, __d2.clusters.find(c=>c.id==="commercial"), __d2.lenses)', sandbox);
checkOk("commercial binding constraint is People (L2, not improving)", bind.lensKey === "People");

// ---- 13. Watch signals: contract accepts strings, rejects non-strings ----
const withWatch = JSON.parse(JSON.stringify(demo2));
withWatch.briefings = []; withWatch.signal_keywords = [];
checkOk("demo watch signals validate", schema.validateState(withWatch).length === 0);
withWatch.clusters[0].cells.Culture.watch = [{ bad: true }];
checkOk("non-string watch signal rejected by contract", schema.validateState(withWatch).length > 0);

// ---- 14. Document ingestion contracts (PRD F6) ----
const docKindFor = vm.runInContext("docKindFor", sandbox);
checkOk("file-kind routing: text local; pdf/image native; Word/PowerPoint/Excel to local parsers; legacy binary unsupported",
  docKindFor("strategy.txt", "text/plain") === "text" &&
  docKindFor("survey.md", "") === "text" &&
  docKindFor("headcount.csv", "text/csv") === "text" &&
  docKindFor("board-deck.pdf", "application/pdf") === "pdf" &&
  docKindFor("org-chart.png", "image/png") === "image" &&
  docKindFor("plan.docx", "") === "docx" &&
  docKindFor("offsite.pptx", "") === "pptx" &&
  docKindFor("model.xlsx", "") === "xlsx" &&
  docKindFor("model.xls", "") === "xlsx" &&
  docKindFor("legacy.doc", "") === "unsupported" &&
  docKindFor("legacy.ppt", "") === "unsupported");

// ---- 14b. Office XML → text extraction (pure helpers, same file the app loads) ----
const parsers = require(path.join(__dirname, "..", "app", "js", "parsers.js"));
const docxText = parsers.docxXmlToText(
  '<w:document><w:body><w:p><w:r><w:t>Attrition in critical roles: 14%</w:t></w:r></w:p>' +
  '<w:tbl><w:tr><w:tc><w:p><w:r><w:t>Pricing architect</w:t></w:r></w:p></w:tc>' +
  '<w:tc><w:p><w:r><w:t>Vacant</w:t></w:r></w:p></w:tc></w:tr></w:tbl>' +
  '<w:p><w:r><w:t>Safety &amp; trust: &#8722;5 vs norm</w:t></w:r></w:p></w:body></w:document>');
checkOk("docx extraction keeps figures, tables, and decodes entities",
  docxText.includes("Attrition in critical roles: 14%") &&
  docxText.includes("Pricing architect") && docxText.includes("Vacant") &&
  docxText.includes("Safety & trust: −5 vs norm"));
const pptxText = parsers.pptxXmlToText(
  '<p:sld><p:txBody><a:p><a:r><a:t>Transform to Win</a:t></a:r><a:r><a:t> 2026</a:t></a:r></a:p>' +
  '<a:p><a:r><a:t>CRM adoption 55% &lt; target</a:t></a:r></a:p></p:txBody></p:sld>');
checkOk("pptx extraction joins runs per paragraph and skips layout XML",
  pptxText === "Transform to Win 2026\nCRM adoption 55% < target");
checkOk("slide ordering is natural (slide2 before slide10)",
  ["ppt/slides/slide10.xml", "ppt/slides/slide2.xml"].sort(parsers.slideOrder)[0] === "ppt/slides/slide2.xml");

const textDoc = {
  id: "doc_1", name: "survey.txt", label: "Engagement Survey 2026", doc_type: "survey-report",
  kind: "text", size: 100, added_at: new Date().toISOString(),
  text: "Safety engagement fell 5 points below the high-performance norm in 2026."
};
check("text document conforms to document contract", schema.validateDocument(textDoc));
checkOk("contract rejects persisted text on a PDF document (binary must stay in memory)",
  schema.validateDocument({ ...textDoc, kind: "pdf", text: "leak" }).length > 0);
checkOk("contract rejects unknown document type",
  schema.validateDocument({ ...textDoc, doc_type: "resume" }).length > 0);

// ---- 15. Evidence analysis: prompt, content blocks, mock, contract ----
const anaPrompt = vm.runInContext("buildAnalysisPrompt(buildDemoState())", sandbox);
checkOk("analysis prompt names every cluster id", demo.clusters.every(c => anaPrompt.includes('"' + c.id + '"')));
checkOk("analysis prompt names every lens key", demo.lenses.every(l => anaPrompt.includes(l.key)));
checkOk("analysis prompt encodes extraction discipline (stated ≠ demonstrated, verbatim, lower level)",
  anaPrompt.includes("Stated is not demonstrated") && anaPrompt.includes("verbatim") && anaPrompt.includes("suggest the lower"));
checkOk("analysis prompt demands JSON-only output", anaPrompt.includes("ONLY a JSON object"));

vm.runInContext("globalThis.__docs = " + JSON.stringify([textDoc]) + "; globalThis.__blobs = { doc_2: { media_type: 'application/pdf', data: 'QUJD' } }", sandbox);
const blocks = vm.runInContext("buildAnalysisContent(buildDemoState(), __docs.concat([{id:'doc_2',name:'deck.pdf',label:'Board deck',doc_type:'board-paper',kind:'pdf',size:9,added_at:''}]), __blobs)", sandbox);
checkOk("text document becomes a labelled text block", blocks.some(b => b.type === "text" && b.text.includes("Engagement Survey 2026") && b.text.includes("5 points below")));
checkOk("PDF document becomes a native base64 document block",
  blocks.some(b => b.type === "document" && b.source && b.source.media_type === "application/pdf" && b.source.data === "QUJD"));

const rawAna = vm.runInContext("mockAnalysis(buildDemoState(), __docs)", sandbox);
const normAna = {
  id: "ana_test", generated_at: new Date().toISOString(), model: "mock",
  doc_ids: ["doc_1"], doc_labels: ["Engagement Survey 2026"],
  findings: rawAna.findings.map(f => ({ ...f, applied: false }))
};
check("mock evidence analysis conforms to analysis contract", schema.validateAnalysis(normAna));
checkOk("mock findings map to real clusters and lenses",
  normAna.findings.every(f => demo.clusters.some(c => c.id === f.cluster_id) && demo.lenses.some(l => l.key === f.lens_key)));
checkOk("mock quotes the uploaded document's own text (proof of ingestion)",
  normAna.findings.some(f => f.quote.includes("Safety engagement fell 5 points")));
checkOk("leading findings carry a direction; suggested levels are conservative or null",
  normAna.findings.every(f => (f.classification !== "leading" || f.direction === null || ["improving", "stable", "declining"].includes(f.direction))
    && (f.suggested_level === null || (f.suggested_level >= 1 && f.suggested_level <= 4))));
checkOk("contract rejects a finding with an invalid classification",
  schema.validateAnalysis({ ...normAna, findings: [{ ...normAna.findings[0], classification: "vibes" }] }).length > 0);

// ---- 16. Applying a finding keeps the state contract-valid ----
const demoForApply = JSON.parse(JSON.stringify(demo));
const fApply = normAna.findings[0];
const clApply = demoForApply.clusters.find(c => c.id === fApply.cluster_id);
const cellApply = clApply.cells[fApply.lens_key];
cellApply.evidence.push({ label: "Engagement Survey 2026", note: fApply.quote });
if (fApply.classification === "leading" && fApply.direction) cellApply.leading.push({ name: fApply.quote.slice(0, 80), signal: fApply.direction });
if (fApply.watch) cellApply.watch.push(fApply.watch);
demoForApply.documents = [textDoc];
demoForApply.analyses = [normAna];
check("state with documents + analyses + applied finding stays contract-valid", schema.validateState(demoForApply));

// ---- 17. Two-axis role rubric: index, TKI, routing thresholds ----
const demoRoles = vm.runInContext("buildDemoState()", sandbox);
vm.runInContext("globalThis.__dr = " + JSON.stringify(demoRoles), sandbox);
const idxOf = (cid, title) => vm.runInContext(
  `criticalityIndex(__dr.clusters.find(c=>c.id==="${cid}").roles.find(r=>r.title.indexOf(${JSON.stringify(title)})===0))`, sandbox);
const tkiOf = (cid, title) => vm.runInContext(
  `tkiScore(__dr.clusters.find(c=>c.id==="${cid}").roles.find(r=>r.title.indexOf(${JSON.stringify(title)})===0))`, sandbox);
const routeOf = (cid, title) => vm.runInContext(
  `routeRole(__dr.clusters.find(c=>c.id==="${cid}").roles.find(r=>r.title.indexOf(${JSON.stringify(title)})===0))`, sandbox);

// Weighted index: 30/25/20/15/10 on 1-5 inputs must stay inside 1-5.
const allIdx = vm.runInContext("__dr.clusters.flatMap(c=>(c.roles||[]).map(r=>criticalityIndex(r)))", sandbox);
const allTki = vm.runInContext("__dr.clusters.flatMap(c=>(c.roles||[]).map(r=>tkiScore(r)))", sandbox);
checkOk("criticality index stays within [1,5]", allIdx.every(v => v >= 1 && v <= 5));
checkOk("tacit-knowledge score stays within [1,5]", allTki.every(v => v >= 1 && v <= 5));
checkOk("Axis A weights sum to 1.0", Math.abs(vm.runInContext("AXIS_A_WEIGHTS.reduce((a,w)=>a+w.wt,0)", sandbox) - 1) < 1e-9);

// High leverage + low tacit → Critical (succession bench fix)
checkOk("high-leverage, low-tacit role routes to Critical",
  routeOf("commercial", "Head of Pricing") === "critical" && idxOf("commercial", "Head of Pricing") >= 4.5);
// High leverage + high tacit → Dual-critical (both fixes)
checkOk("high-leverage, high-tacit role routes to Dual-critical",
  routeOf("gateway", "Cargo & Pharma") === "dual" && tkiOf("gateway", "Cargo & Pharma") >= 4);
// Low leverage + high tacit → Specialist (knowledge transfer, NOT succession list)
checkOk("low-leverage, high-tacit role routes to Specialist / key-person",
  routeOf("gateway", "Load Control") === "specialist" && idxOf("gateway", "Load Control") < 3.5 && tkiOf("gateway", "Load Control") >= 4);
checkOk("core-system super-user is a Specialist, not Standard — the quiet-expert case a scarcity-only view misses",
  routeOf("tdx", "Core-system super-user") === "specialist");
checkOk("routing thresholds are explicit and equal on both axes",
  vm.runInContext("HIGH_LEVERAGE === 3.5 && HIGH_TACIT === 3.5", sandbox));

// ---- 18. Registers separate the two risks ----
const critReg = vm.runInContext("criticalRoleRegister(__dr).map(r=>r.role.title)", sandbox);
const keyReg = vm.runInContext("keyPersonRegister(__dr).map(r=>r.role.title)", sandbox);
checkOk("critical-role register leads with absent anchor seats",
  vm.runInContext("criticalRoleRegister(__dr)[0].role.status", sandbox) === "absent");
checkOk("key-person register holds the high-tacit roles", keyReg.some(t => t.indexOf("Load Control") === 0));
checkOk("the two registers are genuinely different lists (different risks, different fixes)",
  keyReg.some(t => critReg.indexOf(t) === -1) && critReg.some(t => keyReg.indexOf(t) === -1));
checkOk("key-person register is ordered by tacit intensity",
  (() => { const t = vm.runInContext("keyPersonRegister(__dr).map(r=>r.tki)", sandbox); return t.every((v, i) => i === 0 || t[i - 1] >= v); })());

// ---- 19. Anchor-seat coverage feeds structural findings ----
const cov = vm.runInContext('roleCoverage(__dr.clusters.find(c=>c.id==="commercial"))', sandbox);
checkOk("anchor-seat coverage counts only critical/dual roles", cov.anchors > 0 && cov.anchors <= cov.total);
checkOk("commercial cluster reports absent anchor seats", cov.gaps.length >= 2 && cov.pct < 50);
const rolePatterns = vm.runInContext("detectCrossLensPatterns(__dr).filter(p=>p.key==='anchor-seat-gap')", sandbox);
checkOk("absent anchor seat surfaces as a structural pattern", rolePatterns.some(p => p.clusterId === "commercial"));
checkOk("anchor-seat pattern names the missing role and its consequence",
  rolePatterns.some(p => p.body.indexOf("Head of Pricing") !== -1 && p.body.indexOf("Structure cannot score above L2") !== -1));

// ---- 20. Value chain: follow the money ----
check("demo state with value chain + roles conforms to contract", schema.validateState(
  Object.assign({}, demoRoles, { briefings: [], signal_keywords: [], documents: [], analyses: [] })));
checkOk("cluster economic weight sums its mapped levers",
  vm.runInContext('clusterEconomicWeight(__dr, "gateway")', sandbox) === 21); // lv4 14 + lv6 7
checkOk("value chain is detected as configured", vm.runInContext("hasValueChain(__dr)", sandbox) === true);
const exposure = vm.runInContext('clusterValueExposure(__dr, __dr.clusters.find(c=>c.id==="commercial"), __dr.lenses)', sandbox);
checkOk("value exposure = economic weight × capability gap", Math.abs(exposure.exposure - exposure.weight * exposure.gap) < 1e-9);
checkOk("a strong cluster carries less exposure than an equally-weighted weak one",
  vm.runInContext('clusterValueExposure(__dr, __dr.clusters.find(c=>c.id==="food"), __dr.lenses).gap < clusterValueExposure(__dr, __dr.clusters.find(c=>c.id==="commercial"), __dr.lenses).gap', sandbox));
const boardValue = vm.runInContext('orderClustersForBoard(__dr, "auto")', sandbox);
checkOk("board auto-ranks by value exposure once levers are mapped", boardValue.basis === "value");
checkOk("value ordering leads with the highest money-at-risk cluster",
  boardValue.clusters[0].id === vm.runInContext(
    '__dr.clusters.map(c=>({id:c.id,e:clusterValueExposure(__dr,c,__dr.lenses).exposure})).sort((a,b)=>b.e-a.e)[0].id', sandbox));
const noVc = JSON.parse(JSON.stringify(demoRoles)); noVc.valueChain = { currency: "$", stages: [], levers: [] };
vm.runInContext("globalThis.__novc = " + JSON.stringify(noVc), sandbox);
checkOk("board falls back to weakest-first when no value chain is mapped",
  vm.runInContext('orderClustersForBoard(__novc, "auto").basis', sandbox) === "weakest");
checkOk("contract rejects a lever pointing at a non-existent cluster",
  schema.validateState(Object.assign({}, noVc, {
    briefings: [], signal_keywords: [], documents: [], analyses: [],
    valueChain: { currency: "$", stages: [], levers: [{ id: "x", name: "n", share_pct: 5, cluster_id: "not-a-cluster" }] }
  })).length > 0);
checkOk("contract rejects an out-of-range share_pct",
  schema.validateValueChain({ currency: "$", stages: [], levers: [{ id: "x", name: "n", share_pct: 140 }] }).length > 0);
checkOk("contract rejects an out-of-range role score",
  schema.validateRole({ id: "r", title: "T", status: "exists",
    axisA: { impact: 9, scarcity: 3, vacancy: 3, pivotal: 3, futurefit: 3 },
    tki: { time: 3, codifiability: 3, concentration: 3, consequence: 3, relationship: 3 } }, "r").length > 0);
checkOk("contract rejects an unknown role status",
  schema.validateRole({ id: "r", title: "T", status: "maybe",
    axisA: { impact: 3, scarcity: 3, vacancy: 3, pivotal: 3, futurefit: 3 },
    tki: { time: 3, codifiability: 3, concentration: 3, consequence: 3, relationship: 3 } }, "r").length > 0);

// ---- 21. Harvest discipline in the external-signal prompt ----
const scanPrompt = vm.runInContext("buildScanPrompt(buildDemoState(), ['cargo tonnage'])", sandbox);
checkOk("scan prompt requires query triangulation with stop conditions",
  scanPrompt.includes("triangulation") && scanPrompt.includes("practitioner's words") && scanPrompt.includes("six queries have run"));
checkOk("scan prompt requires 1-5 source-quality scoring", scanPrompt.includes("Source quality") && scanPrompt.includes("SEO-farm"));
checkOk("scan prompt forbids averaging conflicting figures", scanPrompt.includes("Never average figures"));
checkOk("scan prompt carries the anti-fabrication rule", scanPrompt.includes("Anti-fabrication") && scanPrompt.includes("traceable"));
checkOk("mock briefing carries a source-quality score per signal",
  vm.runInContext("mockBriefing(buildDemoState(), []).signals.every(s => s.source_quality >= 1 && s.source_quality <= 5)", sandbox));

// ---- 22. Evidence analysis extracts roles, not just cell findings ----
const anaPrompt2 = vm.runInContext("buildAnalysisPrompt(buildDemoState())", sandbox);
checkOk("analysis prompt asks for anchor-role presence/absence", anaPrompt2.includes("ANCHOR ROLES") && anaPrompt2.includes("absent"));
checkOk("analysis prompt separates market scarcity from tacit-knowledge intensity",
  anaPrompt2.includes("market scarcity") && anaPrompt2.includes("tacit-knowledge intensity") && anaPrompt2.includes("Score them independently"));
const mockAna2 = vm.runInContext("mockAnalysis(buildDemoState(), [])", sandbox);
checkOk("mock analysis returns role findings", Array.isArray(mockAna2.roles) && mockAna2.roles.length >= 2);
const normRoles = {
  id: "ana_r", generated_at: new Date().toISOString(), model: "mock", doc_ids: [], doc_labels: [],
  findings: mockAna2.findings.map(f => ({ ...f, applied: false })),
  roles: mockAna2.roles.map(r => ({
    cluster_id: r.cluster_id, title: r.title, status: r.status,
    axisA: r.criticality, tki: r.tacit, note: r.note, applied: false
  }))
};
check("analysis with roles conforms to the analysis contract", schema.validateAnalysis(normRoles));
checkOk("contract rejects a role finding with an out-of-range score",
  schema.validateAnalysis({ ...normRoles, roles: [{ ...normRoles.roles[0], axisA: { ...normRoles.roles[0].axisA, impact: 11 } }] }).length > 0);

// ---- 23. Upload templates are real, parseable artefacts ----
const appSrc = fs.readFileSync(path.join(__dirname, "..", "app", "js", "app.js"), "utf8");
["role-inventory-template.csv", "value-chain-template.csv", "evidence-checklist.md"].forEach(f => {
  checkOk(`template '${f}' is defined in the app`, appSrc.indexOf(f) !== -1);
});
checkOk("role-inventory template header matches the CSV importer's required columns",
  ["cluster_id", "role_title", "status", "impact", "tki_time"].every(c => appSrc.indexOf(c) !== -1));

console.log(failures ? `\n${failures} CONTRACT FAILURE(S)` : "\nAll contract checks passed.");
process.exit(failures ? 1 : 0);
