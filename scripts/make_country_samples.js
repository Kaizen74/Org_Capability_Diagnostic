/* ============================================================
   Writes the fictional country samples the other two apps are
   built and tested against (docs/samples/countries/):

     <country>_compass_handoff.json   one hand-off packet per country
     meridian_org_by_country.csv      an org file with a Country column
     belmar_return_org_modeling.json  what Org Modeling should send back
     belmar_return_process_map_studio.json  what Process Map Studio should send back

   Everything comes from the Compass's own fictional demo, so the
   samples cannot drift from what the Compass reads. Re-run after a
   change to the demo or the packet:   node scripts/make_country_samples.js
   ============================================================ */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const out = path.join(root, "docs", "samples", "countries");
const schema = require(path.join(root, "app", "js", "schema.js"));
const sb = { console };
vm.createContext(sb);
for (const f of ["presets.js", "engine.js", "handoff.js", "compare.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, "app", "js", f), "utf8"), sb, { filename: f });
}
Object.assign(sb, schema);
const run = code => vm.runInContext(code, sb);

// ---- the three countries, exactly as the demo builds them ----
run(`
  globalThis.__home = ensureRefs(buildDemoState());
  Object.assign(__home, { briefings: [], signal_keywords: [], documents: [], analyses: [], calibrations: [] });
  __home.country = DEMO_HOME_COUNTRY; __home.frameId = "fr_meridian"; __home.workspaceName = "Meridian Group (demo) — Arden";
  __home.returns = demoReturns(DEMO_HOME_COUNTRY);
  ensureRefs(__home);
  globalThis.__countries = [__home].concat(DEMO_COUNTRIES.map(spec => ensureRefs(buildDemoCountry(__home, spec))));
`);
const fixedTime = "2026-11-13T09:00:00Z";
const states = run("__countries");
const packets = [];
states.forEach((st, i) => {
  const pkt = run(`buildHandoffPacket(__countries[${i}])`);
  pkt.generated_at = fixedTime;
  const errs = schema.validateHandoffPacket(pkt);
  if (errs.length) throw new Error(st.country + ": " + errs[0]);
  packets.push(pkt);
  fs.writeFileSync(path.join(out, st.country.toLowerCase() + "_compass_handoff.json"), JSON.stringify(pkt, null, 2) + "\n");
});

// ---- an org file with a Country column (fictional people) ----
/* Holders per anchor role and country follow each country's role status in
   the demo: exists → 1 or 2 people, thin → 1, absent → 0. "To confirm"
   roles (Caldera's unscored cluster) are given 1 holder: the org file is
   the evidence that lets someone confirm them. */
const statusOf = (st, title) => {
  for (const cl of st.clusters) for (const r of cl.roles) if (r.title === title) return r.unconfirmed ? "unconfirmed" : r.status;
  return "exists";
};
const rows = [];
let n = 0;
const id = () => "E" + String(++n).padStart(3, "0");
/* The Level column follows the reporting chain, so the file raises no
   level-mismatch warnings in Org Modeling. */
const add = (country, title, grade, _level, mgr, dept, salary, workType) => {
  const r = { id: id(), name: "", title, grade, level: mgr ? mgr.level + 1 : 1, mgr, dept, country, salary, workType };
  r.name = (country.slice(0, 2).toUpperCase()) + " Person " + r.id.slice(1);
  rows.push(r); return r;
};
const ceo = add("Arden", "Group Chief Executive", "G1", 1, null, "Group Office", 900000, "Strategic");
const holders = (st, title) => ({ exists: title.match(/Manager|Officer|Controller|super-user/) ? 2 : 1, thin: 1, absent: 0, unconfirmed: 1 }[statusOf(st, title)]);
states.forEach(st => {
  const c = st.country, k = c === "Arden" ? 1 : c === "Belmar" ? 0.6 : 0.5;
  const pay = v => Math.round(v * k / 1000) * 1000;
  const md = add(c, "Regional Managing Director", "G2", 2, ceo, "Country Leadership", pay(420000), "Strategic");
  /* Caldera: the station and Commercial report through an operations
     director, one layer more than elsewhere (inherited from the acquisition). */
  const ops = c === "Caldera" ? add(c, "Operations Director", "G3", 3, md, "Gateway Operations", pay(300000), "Operational") : md;
  const station = add(c, "Station Head / General Manager", "G3", 3, ops, "Gateway Operations", pay(260000), "Operational");
  const cargo = add(c, "Regional VP Cargo", "G3", 3, md, "Cargo", pay(280000), "Operational");
  const comm = add(c, "Head of Commercial", "G3", 3, ops, "Commercial", pay(250000), "Strategic");
  const tech = add(c, "Head of Technology", "G3", 3, md, "Technology", pay(240000), "Specialist");
  const hr = add(c, "Head of People", "G3", 3, md, "Human Capital", pay(220000), "Specialist");
  const food = add(c, "Head of Catering", "G3", 3, md, "Food Solutions", pay(230000), "Operational");
  const place = [
    ["Cargo & Pharma Manager (cold-chain certified)", "G4", 4, cargo, "Cargo", 150000, "Specialist"],
    ["Load Control / Weight & Balance Officer", "G5", 4, station, "Gateway Operations", 90000, "Specialist"],
    ["Hub Duty Controller (disruption)", "G4", 4, station, "Gateway Operations", 120000, "Operational"],
    ["Executive Chef — Culinary Design", "G4", 4, food, "Food Solutions", 130000, "Specialist"],
    ["Food Safety & Quality Lead", "G4", 4, food, "Food Solutions", 110000, "Specialist"],
    ["Head, Analytics & AI", "G4", 4, tech, "Technology", 170000, "Specialist"],
    ["Head, Data Engineering & Platform", "G4", 4, tech, "Technology", 165000, "Specialist"],
    ["Core-system super-user", "G6", 5, tech, "Technology", 70000, "Specialist"],
    ["People Analytics & Workforce Planning Lead", "G5", 4, hr, "Human Capital", 110000, "Specialist"],
    ["Head of Pricing / Revenue Management", "G4", 4, comm, "Commercial", 160000, "Specialist"],
    ["Global Head, Commercial Excellence", "G3", 4, comm, "Commercial", 210000, "Strategic"],
    ["Bid & Solutions Architect", "G5", 4, comm, "Commercial", 120000, "Specialist"],
    ["VP Global Account Management", "G4", 4, comm, "Commercial", 190000, "Strategic"],
    ["M&A / Integration Lead", "G4", 3, md, "Country Leadership", 200000, "Strategic"],
    ["Organisation Design & Change Lead", "G5", 4, hr, "Human Capital", 120000, "Specialist"],
    ["Head of Talent Acquisition — specialist hiring", "G5", 4, hr, "Human Capital", 105000, "Specialist"]
  ];
  place.forEach(([title, grade, level, mgr, dept, salary, wt]) => {
    for (let i = 0; i < holders(st, title); i++) add(c, title, grade, level, mgr, dept, pay(salary), wt);
  });
  // A few frontline roles so spans and layers mean something
  const sup = add(c, "Shift Supervisor", "G6", 4, station, "Gateway Operations", pay(65000), "Operational");
  for (let i = 0; i < (c === "Arden" ? 6 : 4); i++) add(c, "Ramp Agent", "G8", 5, sup, "Gateway Operations", pay(38000), "Operational");
  const fin = add(c, "Finance Controller", "G4", 3, md, "Finance", pay(150000), "Specialist");
  add(c, "Finance Analyst", "G6", 4, fin, "Finance", pay(68000), "Specialist");
});
const csvCell = v => /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v);
const header = ["Employee ID", "Name", "Job Title", "Grade", "Level", "Line Manager", "Line Manager ID", "Department", "Country", "Salary", "Work Type"];
const csv = [header.join(",")].concat(rows.map(r => [r.id, r.name, r.title, r.grade, r.level, r.mgr ? r.mgr.name : "", r.mgr ? r.mgr.id : "", r.dept, r.country, r.salary, r.workType].map(csvCell).join(","))).join("\n") + "\n";
fs.writeFileSync(path.join(out, "meridian_org_by_country.csv"), csv);

// ---- what each app should send back for Belmar ----
const belmar = states.find(s => s.country === "Belmar");
const strip = f => { const o = Object.assign({}, f); delete o.cited; ["topic", "reason_class", "compared_with"].forEach(k => { if (!o[k]) delete o[k]; }); return o; };
const header2 = app => ({ format: "compass-return", format_version: "1.0", generated_at: fixedTime, source_app: app, engagement_key: belmar.charter.engagementKey, country: "Belmar" });
const belmarRows = rows.filter(r => r.country === "Belmar");
const layersIn = country => Math.max(...rows.filter(r => r.country === country).map(r => r.level));
console.log("Layers: " + ["Arden", "Belmar", "Caldera"].map(c => c + " " + layersIn(c)).join(", "));
const om = belmar.returns.find(r => r.source_app === "org-modeling");
const omFile = Object.assign(header2("org-modeling"), {
  findings: [
    { ref: "baseline.layers", kind: "structural_baseline", title: "Layers in the reporting chain (Belmar)", detail: "Counted from who reports to whom, for the people whose Country is Belmar. The chain starts at the group chief executive in Arden.", grade: "confirmed", figure: layersIn("Belmar") + " layers", relates_to: ["CAP-05.Structure"], source_note: "Computed from the uploaded org file (" + belmarRows.length + " people in Belmar)", topic: "role_presence" },
    { ref: "RL-011", kind: "role_reason", title: "Why Head of Pricing / Revenue Management exists in Belmar", detail: "Created in 2023 when Belmar won its two largest renewal contracts; Arden has no such role and leaves pricing to finance.", grade: "indicated", figure: "1 person", relates_to: ["RL-011", "CAP-04", "CAP-04.People"], source_note: "Stated by the country manager; headcount from the uploaded org file.", topic: "role_reason", reason_class: "chosen", compared_with: "Arden" }
  ].concat(om.findings.map(strip))
});
const pms = belmar.returns.find(r => r.source_app === "process-map-studio");
const pmsFile = Object.assign(header2("process-map-studio"), { findings: pms.findings.map(strip) });
[["belmar_return_org_modeling.json", omFile], ["belmar_return_process_map_studio.json", pmsFile]].forEach(([name, file]) => {
  const norm = run("normaliseReturn(" + JSON.stringify(file) + ")");
  const errs = schema.validateReturn(norm);
  if (errs.length) throw new Error(name + ": " + errs[0]);
  fs.writeFileSync(path.join(out, name), JSON.stringify(file, null, 2) + "\n");
});
console.log("Wrote " + fs.readdirSync(out).length + " files to docs/samples/countries/ (" + rows.length + " people in the org file).");
