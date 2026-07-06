/* ============================================================
   Capability Compass — Industry Presets (data, not code)
   Each preset: clusters, lenses, rubric text, signal keywords.
   All content is generic / illustrative. Edit freely.
   ============================================================ */

const DEFAULT_LENSES = [
  { key: "Structure", name: "Structure", sub: "Roles, span & layers" },
  { key: "People", name: "People", sub: "Skillsets & behaviours" },
  { key: "Process", name: "Process", sub: "Systems & workflows" },
  { key: "Culture", name: "Culture", sub: "Engagement signals" }
];

const DEFAULT_RUBRIC = {
  Structure: {
    L1: "No owner or role assigned; capability sits nowhere in the org chart.",
    L2: "Role owner named but structure immature; overlap or gaps in reporting lines.",
    L3: "Structure defined; span and layers appropriate; some regional/BU coverage.",
    L4: "Reinforced structure with clear reporting lines and enterprise integration."
  },
  People: {
    L1: "No visible capability in the workforce — zero specialists.",
    L2: "Critical bench gaps; single points of failure; hiring in progress.",
    L3: "Bench building; core capabilities acquired; still under construction.",
    L4: "Deep and distributed bench; successor pipeline in place."
  },
  Process: {
    L1: "No systems or workflows — manual and ad hoc.",
    L2: "Systems in early build; fragmented; no standard workflows.",
    L3: "Systems in rollout; workflows defined; standardisation in flight.",
    L4: "Enterprise systems live and scaling; measurable productivity outcomes."
  },
  Culture: {
    L1: "Signals materially below benchmark; declining across multiple categories.",
    L2: "One or more categories in significant concern versus benchmark.",
    L3: "On par with benchmark; some categories improving; specific gaps remain.",
    L4: "Above benchmark; consistent values alignment; positive momentum."
  }
};

const DEFAULT_PATTERNS = [
  { num: 1, title: "Name your enterprise priority #1", body: "Edit these hero patterns in Settings. The top pattern should name the single cross-cluster issue that most threatens the strategy." },
  { num: 2, title: "Describe the arc of the transformation", body: "What phase is the organisation in — assembling structure, activating systems, or scaling outcomes? Say it in one sentence." },
  { num: 3, title: "State the binding constraint", body: "Capital, talent, trust, or time — name the scarce resource that forces prioritisation across all clusters." }
];

function mkClusters(list) {
  return list.map((c, i) => ({ id: c[0], no: i + 1, name: c[1], desc: c[2], priority_move: c[3] }));
}

const PRESETS = [
  {
    industry_id: "generic",
    display_name: "Generic Enterprise",
    description: "A neutral starting point for any organisation. Six classic capability clusters.",
    clusters: mkClusters([
      ["core-ops", "Core Operations Excellence", "The engine room — delivery of the core product or service.", "Standardise the operating model + lift productivity of the core."],
      ["growth", "Commercial & Growth", "Sales, marketing, pricing, and customer value creation.", "Fill the commercial bench + activate key-account management."],
      ["digital", "Technology, Data & AI", "Systems, data platforms, and applied AI.", "Drive data standardisation + scale AI into core workflows."],
      ["innovation", "Product & Innovation", "New offerings, R&D, and portfolio renewal.", "Focus the innovation portfolio on 3 bets + kill the long tail."],
      ["leadership", "Enterprise Leadership", "Leadership depth, succession, and organisational agility.", "Close the leadership long-tail + strengthen succession cover."],
      ["enabling", "People & Enabling Functions", "HR, finance, procurement, and shared services.", "Build people analytics + digitise enabling workflows."]
    ]),
    signal_keywords: ["operating model", "productivity", "AI adoption", "engagement", "succession"]
  },
  {
    industry_id: "aviation-logistics",
    display_name: "Aviation, Logistics & Transportation",
    description: "Cargo, ground handling, catering, freight, rail, and maritime services.",
    clusters: mkClusters([
      ["gateway", "Gateway / Hub Services", "Cargo, ground handling, and hub-of-the-future innovation.", "Scale hub-of-the-future globally + close the safety-culture gap."],
      ["food", "Food & Catering Solutions", "Aviation catering and adjacent large-scale food manufacturing.", "Digitise the food supply chain + monetise waste intelligence."],
      ["tdx", "Technology, Data & AI", "Operational excellence, technology, and data & AI as one discipline.", "Scale AI workforce optimisation + complete data standardisation."],
      ["commercial", "Commercial Leadership", "Global accounts, pricing, bid management, and customer value.", "Fill the commercial bench + activate global account management."],
      ["leadership", "Enterprise Leadership", "Leadership bench, succession, and organisational effectiveness.", "Scale leadership development + close the bottom-quintile long tail."],
      ["enabling", "Human Capital & Enabling", "Future-ready HR, finance, and support capabilities.", "Build people analytics + embed non-negotiable behaviours."]
    ]),
    signal_keywords: ["cargo tonnage", "on-time performance", "ground handling", "IATA CEIV", "safety incidents"]
  },
  {
    industry_id: "financial-services",
    display_name: "Financial Services",
    description: "Banking, insurance, wealth, and capital markets.",
    clusters: mkClusters([
      ["risk", "Enterprise Risk Management", "Credit, market, operational, and regulatory risk.", "Modernise risk analytics + strengthen second-line independence."],
      ["digital-cx", "Digital & Customer Experience", "Omnichannel, mobile, and personalisation.", "Consolidate onto one customer data platform + journey-based teams."],
      ["regulatory", "Regulatory & Compliance", "Prudential, conduct, and financial-crime compliance.", "Automate compliance monitoring + close regulator-flagged gaps."],
      ["data-ai", "Data & AI", "Data platform, model risk, and applied AI.", "Industrialise the model pipeline + govern GenAI use at scale."],
      ["leadership", "Enterprise Leadership", "Leadership depth, succession, and agility.", "Deepen succession cover for material risk-taker roles."],
      ["enabling", "People & Enabling Functions", "HR, finance, and operations enablement.", "Build skills intelligence + automate control-heavy workflows."]
    ]),
    signal_keywords: ["Basel", "AML", "open banking", "CET1", "conduct risk"]
  },
  {
    industry_id: "technology-saas",
    display_name: "Technology / SaaS",
    description: "SaaS, platform, semiconductors, and consumer technology.",
    clusters: mkClusters([
      ["product-eng", "Product & Engineering", "Product management, engineering, design, and data.", "Shift to platform team model + cut cycle time in half."],
      ["gtm", "Go-to-Market", "Sales, marketing, customer success, and RevOps.", "Move from founder-led to structured, metric-driven GTM."],
      ["data-ai", "Data & AI", "Data platform, ML, and applied AI in product.", "Ship model-in-the-loop features across the top 3 workflows."],
      ["customer", "Customer Success & Retention", "Onboarding, adoption, expansion, and renewal.", "Instrument health scores + build an expansion playbook."],
      ["leadership", "Leadership & Scaling", "Leadership depth for the next stage of scale.", "Hire ahead of scale in 2 exec seats + build manager capability."],
      ["enabling", "People & Enabling Functions", "HR, finance, and business operations.", "Build skills-based workforce planning + tighten spend discipline."]
    ]),
    signal_keywords: ["ARR", "NRR", "CAC", "PLG", "developer experience"]
  },
  {
    industry_id: "healthcare",
    display_name: "Healthcare & Life Sciences",
    description: "Providers, payers, pharma, and medtech.",
    clusters: mkClusters([
      ["clinical", "Clinical / Scientific Excellence", "Quality of care or science at the core of the mission.", "Standardise clinical pathways + close variation in outcomes."],
      ["access", "Patient / Customer Access", "Access, experience, and omnichannel engagement.", "Digitise front-door access + reduce time-to-treatment."],
      ["data-ai", "Data, AI & Digital Health", "Interoperable data, analytics, and applied AI.", "Build the interoperable data layer + scale 2 proven AI use cases."],
      ["regulatory", "Regulatory & Quality", "GxP, safety, accreditation, and compliance.", "Automate quality management + strengthen audit readiness."],
      ["workforce", "Clinical Workforce & Leadership", "Talent supply, retention, and leadership depth.", "Fix the retention hotspots + build clinical leadership pipeline."],
      ["enabling", "Enabling Functions", "HR, finance, supply chain, and shared services.", "Digitise supply chain + build workforce analytics."]
    ]),
    signal_keywords: ["patient outcomes", "value-based care", "FDA", "interoperability", "clinical trials"]
  },
  {
    industry_id: "manufacturing",
    display_name: "Manufacturing & Industrials",
    description: "Discrete, process, aerospace, and defence manufacturing.",
    clusters: mkClusters([
      ["operations", "Manufacturing Operations", "Plant performance, lean systems, and asset reliability.", "Deploy the production system to all plants + lift OEE."],
      ["supply", "Supply Chain Resilience", "Planning, sourcing, logistics, and inventory.", "Build n-tier visibility + dual-source critical components."],
      ["digital", "Industry 4.0 / Digital", "IIoT, digital twin, and factory analytics.", "Scale the top 3 proven use cases beyond lighthouse plants."],
      ["commercial", "Commercial & Aftermarket", "Sales, pricing, service, and aftermarket growth.", "Monetise aftermarket services + professionalise pricing."],
      ["safety", "Safety, Quality & Sustainability", "HSE performance, quality systems, and ESG.", "Move safety from compliance to embedded culture."],
      ["people", "Workforce & Leadership", "Frontline skills, technical talent, and leadership.", "Build technical skills academies + succession for plant leaders."]
    ]),
    signal_keywords: ["OEE", "supply chain disruption", "IIoT", "decarbonisation", "safety incidents"]
  },
  {
    industry_id: "public-sector",
    display_name: "Public Sector & Non-Profit",
    description: "Government agencies, NGOs, education, and defence.",
    clusters: mkClusters([
      ["mission", "Mission Delivery", "The core public service or programme outcomes.", "Focus resources on highest-impact programmes + measure outcomes."],
      ["citizen", "Citizen / Beneficiary Experience", "Service access, digital channels, and trust.", "Digitise top 5 citizen journeys end-to-end."],
      ["digital", "Digital, Data & AI", "Data sharing, platforms, and responsible AI.", "Establish the data-sharing backbone + responsible-AI guardrails."],
      ["policy", "Policy & Regulatory Capability", "Policy design, evaluation, and regulatory delivery.", "Build evaluation muscle + close the policy-to-delivery gap."],
      ["workforce", "Workforce & Leadership", "Public-service talent, skills, and leadership depth.", "Compete for digital talent + build leadership mobility."],
      ["enabling", "Corporate & Enabling", "Finance, procurement, HR, and shared services.", "Modernise procurement + consolidate shared services."]
    ]),
    signal_keywords: ["digital government", "service standard", "budget cycle", "workforce attrition"]
  }
];

/* ============================================================
   Fictional demo dataset — "Meridian Group" (illustrative only).
   A made-up aviation-services conglomerate used to demonstrate
   the full feature set, including momentum and delta analysis.
   ============================================================ */

function demoCell(level, status, rationale, intervention, items, evidence, leading, watch) {
  return {
    level, status, rationale, intervention,
    items: items || [],
    evidence: evidence || [],
    leading: leading || [],
    watch: watch || [],
    history: [],
    last_updated: "2026-07-01T09:00:00Z",
    updated_by: "Demo data"
  };
}

const DEMO_STATE = {
  schema: 1,
  orgName: "Meridian Group (fictional demo)",
  actor: "You",
  industry_id: "aviation-logistics",
  industry_name: "Aviation, Logistics & Transportation",
  lenses: JSON.parse(JSON.stringify(DEFAULT_LENSES)),
  rubric: JSON.parse(JSON.stringify(DEFAULT_RUBRIC)),
  patterns: [
    { num: 1, title: "Safety culture is enterprise priority #1", body: "Safety engagement sits 5 points below the high-performance norm with rising incident severity. Policy and systems launched — but culture, not policy, is the fulcrum." },
    { num: 2, title: "From assembly to activation", body: "No cluster sits at Level 1 any more. The group has moved from building structures and hiring leaders to scaling live systems. The agenda is now execution velocity." },
    { num: 3, title: "Capital scarcity is the binding constraint", body: "Many opportunities, finite capital. Disciplined allocation (strategic fit → returns → affordability → risk) forces sharp prioritisation across all six clusters." }
  ],
  clusters: [
    {
      id: "gateway", no: 1, name: "Gateway / Hub Services",
      desc: "Cargo, ground handling, and hub-of-the-future innovation.",
      priority_move: "Scale hub-of-the-future globally + close the safety-culture gap urgently.",
      cells: {
        Structure: demoCell(4, "Reinforced structure", "Deputy CEO appointed; three regional CEOs plus a global commercial architecture in place.", "Sustain and extend the structure to hub-of-the-future scale.", ["Deputy CEO role created", "3 regional CEOs appointed", "Global commercial architecture live"], [{ label: "Org announcement Q1", note: "Leadership structure confirmed" }], [{ name: "Regional handover completion", signal: "improving" }]),
        People: demoCell(3, "Progressing bench", "94% contract renewal; two flagship-airline wins; specialist forwarder muscle still building.", "Acquire specialist forwarder and product-management talent.", ["94% renewal rate", "2 flagship wins", "Forwarder capability in build"], [{ label: "Workforce file Q2", note: "Bench-depth analysis" }], [{ name: "Specialist hiring funnel", signal: "improving" }]),
        Process: demoCell(4, "Live and scaling", "Computer-vision cargo readback at 96% accuracy; ops-assist tooling delivering +10–15% productivity across live stations.", "Scale the digital hub playbook to all regions.", ["CV readback 96% accuracy", "+10–15% productivity", "6 systems live"], [{ label: "Ops dashboard Q2", note: "Productivity metrics" }], [{ name: "Station rollout rate", signal: "improving" }]),
        Culture: demoCell(2, "Safety concern", "Safety engagement 5 points below the high-performance norm; serious-incident count rising; regional trust gap persists in the Americas.", "Move safety from policy to embedded culture.", ["Safety −5 vs norm", "Incident severity rising", "Americas trust gap"], [{ label: "Engagement survey 2026", note: "Safety category detail" }], [{ name: "Near-miss reporting rate", signal: "improving" }, { name: "Americas engagement pulse", signal: "declining" }], ["Near-miss reporting rate falls for 2 consecutive months → flip trajectory down and escalate", "Americas pulse below 80 at next quarterly check → re-score Culture"])
      }
    },
    {
      id: "food", no: 2, name: "Food & Catering Solutions",
      desc: "Aviation catering and adjacent large-scale food manufacturing.",
      priority_move: "Monetise waste-intelligence platform + arrest the cultural decline.",
      cells: {
        Structure: demoCell(4, "Strong structure", "New divisional CEO transition confirmed; mature three-tier model operating across six geographies.", "Sustain.", ["CEO transition confirmed", "3-tier model, 6 geographies"], [{ label: "Org announcement Q2", note: "" }], []),
        People: demoCell(4, "Deep bench", "Two major account wins; deep culinary and food-tech talent distributed globally.", "Sustain and rotate top talent across regions.", ["2 major wins", "Distributed culinary bench"], [{ label: "Talent review Q2", note: "" }], []),
        Process: demoCell(4, "AI-enabled supply chain", "AI-powered supply-chain control tower live; flagship facility at 32K meals/day; waste-to-value pilot operational.", "Monetise waste intelligence at network scale.", ["Control tower live", "32K meals/day", "Waste-to-value pilot"], [{ label: "Ops review Q2", note: "" }], [{ name: "Waste-to-value revenue", signal: "improving" }]),
        Culture: demoCell(2, "Declining signals", "Engagement −2, integrity −4, excellence −4 versus prior year; high pride in innovation but mixed frontline signals.", "Diagnose the root cause and reset.", ["Engagement −2", "Integrity −4", "Excellence −4"], [{ label: "Engagement survey 2026", note: "Divisional cut" }], [{ name: "Frontline pulse trend", signal: "declining" }])
      }
    },
    {
      id: "tdx", no: 3, name: "Technology, Data & AI",
      desc: "Operational excellence, technology, and data & AI as one discipline.",
      priority_move: "Scale the digital core + drive data standardisation + AI CoE globally.",
      cells: {
        Structure: demoCell(4, "Unified discipline", "Chief Digital Officer in place; tech, data and operational excellence consolidated as one discipline; AI CoE framework live.", "Sustain and scale the AI Centre of Excellence.", ["CDO appointed", "One unified discipline", "AI CoE live"], [{ label: "Operating model paper", note: "" }], []),
        People: demoCell(3, "Building bench", "Key AI capabilities acquired via build/borrow/buy; engineering bench under construction.", "Continue aggressive acquisition and global upskilling.", ["Build/borrow/buy running", "Engineering bench in build"], [{ label: "Workforce file Q2", note: "" }], [{ name: "AI-skilled headcount", signal: "improving" }]),
        Process: demoCell(3, "In build & scaling", "Core data programme started; ERP, CRM and planning systems commenced; managed-services deal approved.", "Complete data standardisation as priority #1.", ["Data programme started", "ERP/CRM commenced"], [{ label: "Programme board pack", note: "" }], [{ name: "Data-standardisation milestones", signal: "improving" }]),
        Culture: demoCell(3, "Mindset shifting", "AI upskilling curriculum live; growth-mindset campaign running; innovation permission still uneven.", "Unblock innovation permission at pace.", ["AI upskilling live", "Growth-mindset campaign"], [{ label: "Engagement survey 2026", note: "Growth category" }], [{ name: "Idea-to-pilot cycle time", signal: "stable" }])
      }
    },
    {
      id: "commercial", no: 4, name: "Commercial Leadership",
      desc: "Global accounts, pricing, bid management, and customer value.",
      priority_move: "Fill the commercial bench + activate global accounts + per-country growth plans.",
      cells: {
        Structure: demoCell(4, "Architecture defined", "Chief Commercial Officer in place with a full six-part commercial architecture designed.", "Complete staffing at pace.", ["CCO appointed", "6-part architecture designed"], [{ label: "Org announcement Q1", note: "" }], []),
        People: demoCell(2, "Bench gaps", "Structure defined but pricing, revenue management, and bid-solution architect roles not yet visibly staffed.", "Acquire pricing, RevOps, and bid architects urgently.", ["Pricing roles unfilled", "RevOps gap", "Bid architects missing"], [{ label: "Workforce file Q2", note: "Open-roles report" }], [{ name: "Offer-acceptance rate", signal: "stable" }], ["Fewer than 3 specialist offers accepted by end of quarter → bench gap persists, hold L2 and flag to board"]),
        Process: demoCell(3, "In rollout", "CRM programme commenced; contract-lifecycle system underway; multi-year EBITDA uplift targeted.", "Complete the CRM + CPQ + CLM stack.", ["CRM commenced", "CLM underway"], [{ label: "Programme board pack", note: "" }], [{ name: "CRM adoption rate", signal: "improving" }], ["CRM adoption below 60% at 90 days post-launch → flip trajectory down (adoption gap predicts stall)"]),
        Culture: demoCell(3, "Shift underway", "Brand architecture rolling out; commercial mindset shift underway; regional trust variance remains.", "Anchor the commercial narrative + rebuild regional trust.", ["Brand rollout live", "Regional trust variance"], [{ label: "Engagement survey 2026", note: "Regional cut" }], [{ name: "Cross-sell pipeline", signal: "improving" }])
      }
    },
    {
      id: "leadership", no: 5, name: "Enterprise Leadership",
      desc: "Leadership bench, succession, and organisational effectiveness.",
      priority_move: "Scale leadership development globally + close the bottom-quintile long tail.",
      cells: {
        Structure: demoCell(4, "Functionalised", "Global corporate functions functionalised; enterprise leadership seats filled.", "Sustain + build OD/change specialist capability.", ["Functions functionalised", "Leadership seats filled"], [{ label: "Operating model paper", note: "" }], []),
        People: demoCell(4, "Exceptional bench", "90%+ of top-two leadership tiers have internal successors ready within 0–3 years; top-talent density within norm.", "Sustain + close the 20% leadership long tail.", ["90%+ succession cover", "Top-talent density in norm"], [{ label: "Talent review Q2", note: "Succession data" }], [{ name: "Successor readiness drift", signal: "stable" }]),
        Process: demoCell(3, "Frameworks live", "Group balanced scorecard live for the top 450 leaders; global governance matrix operating.", "Establish an enterprise PMO + capital-allocation discipline.", ["Scorecard live for top 450", "Governance matrix live"], [{ label: "Programme board pack", note: "" }], []),
        Culture: demoCell(3, "Improving", "Leadership category +1 versus prior year; a 20% long tail of leaders scores at or below threshold; behaviour standards codified.", "Close the bottom quintile + embed non-negotiable behaviours.", ["Leadership +1 YoY", "20% long tail"], [{ label: "Engagement survey 2026", note: "Leadership category" }], [{ name: "Long-tail coaching completion", signal: "improving" }])
      }
    },
    {
      id: "enabling", no: 6, name: "Human Capital & Enabling",
      desc: "Future-ready HR, finance, and support capabilities.",
      priority_move: "Build people analytics + activate the engagement framework at scale.",
      cells: {
        Structure: demoCell(4, "Functionalised", "CHRO in place; fully functionalised human-capital organisation.", "Add a people-analytics function.", ["CHRO in place", "HC functionalised"], [{ label: "Org announcement Q1", note: "" }], []),
        People: demoCell(3, "Specialist gaps", "Key HC capabilities acquired via build/borrow/buy; people-analytics function still not visible.", "Build people analytics + specialist talent-acquisition capability.", ["Build/borrow/buy running", "People-analytics gap"], [{ label: "Workforce file Q2", note: "" }], [{ name: "Analytics hiring funnel", signal: "improving" }]),
        Process: demoCell(3, "Progressive rollout", "HRIS rollout in progress across regions; global data alignment for performance, goals, and learning underway.", "Complete HRIS + build the data foundation for people analytics.", ["HRIS rollout in progress", "Global data alignment underway"], [{ label: "Programme board pack", note: "" }], [{ name: "HRIS milestone velocity", signal: "stable" }]),
        Culture: demoCell(3, "Values embedded", "People values embedded; global town halls running; engagement framework live.", "Activate the engagement framework at scale + own the remedy first.", ["Values embedded", "Town halls running"], [{ label: "Engagement survey 2026", note: "" }], [])
      }
    }
  ],
  versions: [],
  changeLog: [],
  currentVersion: "v1.1 (working)"
};

/* A prior snapshot so momentum, trajectory, and delta views demo well. */
const DEMO_PRIOR_LEVELS = {
  gateway: { Structure: 3, People: 3, Process: 3, Culture: 2 },
  food: { Structure: 4, People: 4, Process: 3, Culture: 3 },
  tdx: { Structure: 3, People: 2, Process: 2, Culture: 3 },
  commercial: { Structure: 3, People: 2, Process: 2, Culture: 2 },
  leadership: { Structure: 4, People: 4, Process: 3, Culture: 3 },
  enabling: { Structure: 4, People: 3, Process: 2, Culture: 3 }
};

function buildDemoState() {
  const s = JSON.parse(JSON.stringify(DEMO_STATE));
  // Build the prior version snapshot (v1.0, one quarter earlier)
  const prior = JSON.parse(JSON.stringify(s.clusters));
  prior.forEach(cl => {
    Object.keys(cl.cells).forEach(lk => {
      const pl = (DEMO_PRIOR_LEVELS[cl.id] || {})[lk];
      if (pl) {
        cl.cells[lk].level = pl;
        if (pl < s.clusters.find(c => c.id === cl.id).cells[lk].level) {
          cl.cells[lk].status = "Earlier stage";
          cl.cells[lk].rationale = "Position one quarter earlier, before the current recalibration.";
        }
      }
    });
  });
  s.versions = [{
    version: "v1.0",
    label: "Q1 2026 baseline (demo)",
    savedAt: "2026-04-01T09:00:00Z",
    snapshot: { clusters: prior, patterns: JSON.parse(JSON.stringify(s.patterns)) }
  }];
  return s;
}
