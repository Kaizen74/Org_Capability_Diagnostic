/* ============================================================
   Capability Compass — External Intelligence (Claude API client)

   Direct browser → Anthropic API calls using the user's own key
   (CORS enabled via the anthropic-dangerous-direct-browser-access
   header — appropriate here because this is a single-user local
   app; the key belongs to the user and never touches any server
   of ours).

   Key handling rules (grounded in the PRD security requirements):
   - Stored ONLY in this browser's localStorage, under a key
     SEPARATE from the diagnostic state, so Export can never
     include it.
   - Never logged, never rendered back except masked.

   Mock mode: entering the key "mock" activates a deterministic
   offline stub. All automated tests run against the mock —
   never the real API.
   ============================================================ */

var API_STORE_KEY = "capability_compass_api_v1";
var API_URL = "https://api.anthropic.com/v1/messages";
var API_VERSION = "2023-06-01";
var DEFAULT_MODEL = "claude-opus-4-8";
var MODEL_CHOICES = [
  { id: "claude-opus-4-8", label: "Claude Opus 4.8 — most capable (default)" },
  { id: "claude-sonnet-5", label: "Claude Sonnet 5 — fast, lower cost" },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5 — fastest, cheapest" }
];

function getApiConfig() {
  try {
    var raw = localStorage.getItem(API_STORE_KEY);
    if (raw) {
      var cfg = JSON.parse(raw);
      return { apiKey: cfg.apiKey || "", model: cfg.model || DEFAULT_MODEL };
    }
  } catch (e) { /* fall through */ }
  return { apiKey: "", model: DEFAULT_MODEL };
}

function setApiConfig(cfg) {
  try {
    localStorage.setItem(API_STORE_KEY, JSON.stringify({ apiKey: cfg.apiKey || "", model: cfg.model || DEFAULT_MODEL }));
  } catch (e) { /* storage unavailable */ }
}

function clearApiConfig() {
  try { localStorage.removeItem(API_STORE_KEY); } catch (e) { /* ignore */ }
}

function isMockKey(key) { return key === "mock"; }

/* Newer models take the current web-search tool; older custom models
   fall back to the basic variant. */
function webSearchToolFor(model) {
  var current = /(opus-4-[678]|sonnet-5|sonnet-4-6|fable-5)/.test(model);
  return { type: current ? "web_search_20260209" : "web_search_20250305", name: "web_search", max_uses: 5 };
}

async function anthropicRequest(cfg, body) {
  var res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": cfg.apiKey,
      "anthropic-version": API_VERSION,
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    var detail = "";
    try { detail = (await res.json()).error.message; } catch (e) { detail = await res.text().catch(function () { return ""; }); }
    throw new Error("API error " + res.status + (detail ? ": " + String(detail).slice(0, 240) : ""));
  }
  return res.json();
}

/* ---------- Test connection ---------- */
async function testConnection(cfg) {
  if (!cfg.apiKey) throw new Error("No API key entered.");
  if (isMockKey(cfg.apiKey)) {
    await new Promise(function (r) { setTimeout(r, 250); });
    return { ok: true, model: cfg.model, note: "Mock mode — simulated responses, no cost, no network." };
  }
  var resp = await anthropicRequest(cfg, {
    model: cfg.model,
    max_tokens: 16,
    messages: [{ role: "user", content: "Reply with the single word: ok" }]
  });
  return { ok: true, model: resp.model, note: "Connected. Model responded successfully." };
}

/* ---------- External signal scan ---------- */

/* The money map, rendered for a prompt. Research and extraction are both
   far sharper when the model knows which capabilities carry the P&L —
   a benchmark on a 2% lever is trivia, the same benchmark on a 30% lever
   is a board decision. Returns "" when nothing has been mapped, so the
   prompt never implies economics that were not supplied. */
function valueChainBrief(state) {
  var vc = state.valueChain || {};
  var levers = (vc.levers || []).filter(function (l) { return (l.share_pct || 0) > 0; });
  if (!levers.length) return "";
  levers = levers.slice().sort(function (a, b) { return (b.share_pct || 0) - (a.share_pct || 0); });
  var lines = levers.map(function (l) {
    var owner = (state.clusters.filter(function (c) { return c.id === l.cluster_id; })[0] || {}).name;
    return "- " + l.name + " — " + l.share_pct + "% of economic weight" +
      (l.figure ? " (" + l.figure + ")" : "") +
      (l.capability ? " | capability that moves it: " + l.capability : "") +
      " | owned by: " + (owner || "NO CLUSTER — accountability gap");
  });
  return [
    "",
    "WHERE THE MONEY IS (follow-the-money map" + (vc.as_of ? ", " + vc.as_of : "") +
      (vc.revenue ? ", revenue " + (vc.currency || "") + vc.revenue : "") + "):",
    lines.join("\n"),
    "Weight the analysis accordingly: a finding on a high-weight lever outranks a finding on a low-weight one, and you must say which lever a finding touches."
  ].join("\n");
}

function buildScanPrompt(state, keywords) {
  var clusterLines = state.clusters.map(function (c) {
    var weak = state.lenses.filter(function (l) { return c.cells[l.key] && c.cells[l.key].level <= 2; }).map(function (l) { return l.key; });
    var wt = typeof clusterEconomicWeight === "function" ? clusterEconomicWeight(state, c.id) : 0;
    return '- id: "' + c.id + '" | ' + c.name + " — " + c.desc +
      (wt ? " | economic weight: " + wt + "%" : "") +
      (weak.length ? " | weak lenses: " + weak.join(", ") : "");
  }).join("\n");
  var lensKeys = state.lenses.map(function (l) { return l.key; }).join(", ");
  var money = valueChainBrief(state);
  if (money) money = money + "\n";
  return [
    "You are a strategy analyst preparing an external-signal briefing for an organizational capability diagnostic.",
    "",
    "Organisation: " + state.orgName,
    "Industry: " + state.industry_name,
    "Watch keywords: " + (keywords.length ? keywords.join(", ") : "(none provided — infer from the industry)"),
    "",
    "Capability clusters being assessed (with their ids):",
    clusterLines,
    "Assessment lenses: " + lensKeys,
    money,
    "HARVEST DISCIPLINE (follow literally — this is what separates a defensible briefing from a plausible one):",
    "1. Query triangulation — run at least three vocabularies before concluding: the user's words (the keywords above), the practitioner's words (how an expert in this industry would name it), and the document's words (terms that would appear IN the target page). Stop when the last query returns no new credible sources, or the top three sources agree, or six queries have run.",
    "2. Source quality — rate every source before trusting it: 5 primary (the organisation's own site, regulator, filings, peer-reviewed), 4 reputable secondary (established news, named industry analysts), 3 useful aggregate (trade press, detailed comparisons), 2 SEO-farm signals (listicles, no named author, identical phrasing across sites), 1 content mill. Prefer 4-5. Two low-quality sources agreeing does NOT outrank one primary source.",
    "3. Conflicts — when sources disagree, prefer the more primary, then the more recent. Never average figures from different sources; record the conflict in the summary instead.",
    "4. Anti-fabrication — every figure must be traceable to a specific fetched page. If you cannot point to the source line, leave it out. Never fill a number from memory or pattern-completion. Transcribe figures exactly; no unit or currency conversion.",
    "5. Recency — prioritise the last 6 months; state the as-of date of any figure you cite.",
    "",
    "Then produce 3 to 5 signals that should recalibrate this diagnostic.",
    "",
    "Respond with ONLY a JSON object, no prose before or after, matching exactly:",
    "{",
    '  "signals": [',
    "    {",
    '      "headline": "short signal headline (max 12 words)",',
    '      "summary": "2-3 sentences: what the signal is and why it matters to this organisation, with concrete figures transcribed exactly and their as-of date",',
    '      "source": "publication or organisation, with year, and the URL if you have it",',
    '      "source_quality": 1 | 2 | 3 | 4 | 5,',
    '      "direction": "tailwind" | "headwind" | "neutral",',
    '      "affected_cluster_ids": ["one or more cluster ids from the list above"],',
    '      "lens_key": "the single most affected lens: one of ' + lensKeys + '",',
    '      "calibration_note": "one falsifiable sentence: how this should change the rating or its trajectory, with a threshold and re-score trigger where possible (e.g. adoption <60% by Oct -> flip trajectory down)"',
    "    }",
    "  ]",
    "}"
  ].join("\n");
}

function extractJson(text) {
  var fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) text = fenced[1];
  var start = text.indexOf("{");
  var end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("The model response contained no JSON object.");
  return JSON.parse(text.slice(start, end + 1));
}

function mockBriefing(state, keywords) {
  var ids = state.clusters.map(function (c) { return c.id; });
  var lens = state.lenses.map(function (l) { return l.key; });
  var kw = keywords.length ? keywords : ["market trends"];
  return {
    signals: [
      {
        headline: "AI-driven productivity race accelerating in " + state.industry_name.toLowerCase(),
        summary: "Recent industry research reports peers deploying applied AI into core workflows at scale, with early adopters claiming 10-15% productivity gains. Watch keyword coverage: " + kw.slice(0, 3).join(", ") + ". Organisations without a scaled AI programme risk a widening cost gap within two planning cycles.",
        source: "Industry analyst briefing, 2026 (simulated)", source_quality: 4,
        direction: "headwind",
        affected_cluster_ids: ids.slice(2, 3).length ? ids.slice(2, 3) : [ids[0]],
        lens_key: lens.indexOf("Process") !== -1 ? "Process" : lens[0],
        calibration_note: "Pressure-test the Process ratings of technology clusters; competitor pace suggests holding L3 requires faster rollout."
      },
      {
        headline: "Talent market loosening for specialist commercial roles",
        summary: "Labour-market data shows rising availability of pricing and revenue-operations specialists as sector consolidation releases talent. Hiring windows like this historically last 2-3 quarters.",
        source: "Talent market monitor, 2026 (simulated)", source_quality: 3,
        direction: "tailwind",
        affected_cluster_ids: [ids[Math.min(3, ids.length - 1)]],
        lens_key: lens.indexOf("People") !== -1 ? "People" : lens[0],
        calibration_note: "Bench-gap cells rated L2 have a realistic path to L3 within two cycles if hiring accelerates now."
      },
      {
        headline: "Regulators signal tighter workforce-safety reporting",
        summary: "Draft regulatory guidance proposes mandatory disclosure of safety-culture metrics alongside incident counts. Final rules expected within 12 months; peers are already piloting expanded reporting.",
        source: "Regulatory tracker, 2026 (simulated)", source_quality: 5,
        direction: "neutral",
        affected_cluster_ids: [ids[0]],
        lens_key: lens.indexOf("Culture") !== -1 ? "Culture" : lens[0],
        calibration_note: "Add safety-culture reporting readiness as a leading indicator on Culture cells; neutral today, headwind if unprepared."
      }
    ]
  };
}

/* Scan external signals. Returns a validated briefing object. */
async function scanExternalSignals(state, keywords) {
  var cfg = getApiConfig();
  if (!cfg.apiKey) throw new Error("Add a Claude API key in Settings first.");
  var raw;
  if (isMockKey(cfg.apiKey)) {
    await new Promise(function (r) { setTimeout(r, 500); });
    raw = mockBriefing(state, keywords);
  } else {
    var messages = [{ role: "user", content: buildScanPrompt(state, keywords) }];
    var resp = null;
    for (var attempt = 0; attempt < 4; attempt++) {
      resp = await anthropicRequest(cfg, {
        model: cfg.model,
        max_tokens: 4096,
        tools: [webSearchToolFor(cfg.model)],
        messages: messages
      });
      if (resp.stop_reason === "pause_turn") {
        // Server-side tool loop paused — resend to let it resume.
        messages = messages.concat([{ role: "assistant", content: resp.content }]);
        continue;
      }
      break;
    }
    if (resp.stop_reason === "refusal") throw new Error("The model declined this request. Try adjusting the watch keywords.");
    var text = (resp.content || []).filter(function (b) { return b.type === "text"; }).map(function (b) { return b.text; }).join("\n");
    raw = extractJson(text);
  }
  var briefing = {
    id: "brf_" + Date.now(),
    generated_at: new Date().toISOString(),
    model: isMockKey(cfg.apiKey) ? "mock" : cfg.model,
    industry_id: state.industry_id,
    signals: (raw.signals || []).map(function (s) {
      return {
        headline: String(s.headline || "").trim(),
        summary: String(s.summary || "").trim(),
        source: String(s.source || "").trim(),
        source_quality: (s.source_quality >= 1 && s.source_quality <= 5) ? Math.round(s.source_quality) : null,
        direction: SIGNAL_DIRECTIONS.indexOf(s.direction) !== -1 ? s.direction : "neutral",
        affected_cluster_ids: (Array.isArray(s.affected_cluster_ids) ? s.affected_cluster_ids : [])
          .filter(function (id) { return state.clusters.some(function (c) { return c.id === id; }); }),
        lens_key: state.lenses.some(function (l) { return l.key === s.lens_key; }) ? s.lens_key : state.lenses[0].key,
        calibration_note: String(s.calibration_note || "").trim(),
        applied: {}
      };
    })
  };
  var errs = validateBriefing(briefing);
  if (errs.length) throw new Error("Signal briefing failed contract validation: " + errs[0]);
  return briefing;
}

/* ============================================================
   Cluster calibration — tune the cluster set to the value chain
   AND to the industry.

   The deterministic engine (calibrateClusters) already catches the
   arithmetic mismatches: money with no owner, clusters with no money,
   clusters carrying too much. What it cannot do is know that a peer
   in this industry treats "revenue management" as its own capability,
   or that the two levers piled into one cluster are recognised
   elsewhere as separate disciplines. That is what the harvest is for.

   Every proposal is a PROPOSAL. Nothing is applied without a click.
   ============================================================ */

function buildCalibrationPrompt(state) {
  var levers = ((state.valueChain || {}).levers) || [];
  var leverLines = levers.length ? levers.map(function (l) {
    var owner = (state.clusters.filter(function (c) { return c.id === l.cluster_id; })[0] || {}).name;
    return '- lever_id: "' + l.id + '" | ' + l.name + " | weight " + (l.share_pct || 0) + "%" +
      (l.figure ? " (" + l.figure + ")" : "") +
      " | capability: " + (l.capability || "NOT NAMED") +
      " | owned by: " + (owner || "NO CLUSTER");
  }).join("\n") : "(no levers mapped)";
  var clusterLines = state.clusters.map(function (c) {
    var wt = typeof clusterEconomicWeight === "function" ? clusterEconomicWeight(state, c.id) : 0;
    return '- cluster_id: "' + c.id + '" | ' + c.name + " — " + c.desc + " | economic weight " + wt + "%";
  }).join("\n");

  return [
    "You are an organisation-design analyst auditing whether a capability-diagnostic's CLUSTER SET is the right one for this specific organisation's economics and for its industry.",
    "",
    "Organisation: " + state.orgName,
    "Industry: " + state.industry_name,
    "",
    "Current capability clusters (these are the rows of the diagnostic):",
    clusterLines,
    "",
    "The organisation's follow-the-money map:",
    leverLines,
    "",
    "HARVEST DISCIPLINE (follow literally):",
    "1. Query triangulation — before proposing anything, research how capability is actually organised in this industry using at least three vocabularies: the organisation's words (the cluster and lever names above), the practitioner's words (how an operator in this industry names the same discipline), and the document's words (terms that would appear in a peer's annual report, org announcement, or an industry capability model). Stop when the last query returns no new credible sources, or the top three sources agree, or six queries have run.",
    "2. Source quality — 5 primary (peer filings, regulator, the organisation's own disclosures), 4 reputable secondary (established industry analysts), 3 trade press, 2 SEO-farm, 1 content mill. Prefer 4-5. Two weak sources agreeing does not outrank one primary source.",
    "3. Anti-fabrication — every claim about industry practice must be traceable to a page you actually fetched. Do NOT invent a benchmark, a peer's structure, or a 'commonly accepted' capability model from memory. If you cannot source it, say so and lower the confidence.",
    "4. Do not propose change for its own sake. If a cluster is right, return action \"keep\" and say why. A calibration that changes everything is a rewrite, not a calibration.",
    "",
    "THE TESTS a cluster set must pass:",
    "- Every material P&L lever has exactly one cluster accountable for it.",
    "- Every cluster carries economic weight, or a stated non-financial licence-to-operate reason for existing.",
    "- No single cluster hides two disciplines that move on different capabilities and different clocks.",
    "- The names are the organisation's own language, not consultant vocabulary.",
    "",
    "Propose 3 to 6 changes maximum. Respond with ONLY a JSON object, no prose:",
    "{",
    '  "proposals": [',
    "    {",
    '      "action": "add" | "merge" | "rename" | "split" | "keep",',
    '      "cluster_id": "existing cluster_id this acts on (null only for add)",',
    '      "merge_into_id": "target cluster_id (merge only, else null)",',
    '      "name": "proposed cluster name (add/split/rename; else null)",',
    '      "desc": "one line describing what the cluster covers",',
    '      "priority_move": "one imperative sentence — what must be done next",',
    '      "lever_ids": ["lever ids this cluster should own, from the list above"],',
    '      "rationale": "one sentence tying the change to a named P&L lever or a sourced industry practice",',
    '      "evidence": "source and year for any industry claim, or empty string if this rests only on the money map",',
    '      "confidence": "high" | "medium" | "low"',
    "    }",
    "  ]",
    "}"
  ].join("\n");
}

/* Deterministic offline stand-in. Derived from the real money map so it
   exercises every branch the applier supports. */
function mockClusterCalibration(state) {
  var levers = ((state.valueChain || {}).levers) || [];
  var weightOf = function (id) {
    return levers.filter(function (l) { return l.cluster_id === id; })
      .reduce(function (a, l) { return a + (l.share_pct || 0); }, 0);
  };
  var proposals = [];

  levers.filter(function (l) { return !l.cluster_id && (l.share_pct || 0) > 0; }).forEach(function (l) {
    proposals.push({
      action: "add", cluster_id: null, merge_into_id: null,
      name: (l.capability || l.name).split(",")[0].slice(0, 40),
      desc: "Owns the capability behind “" + l.name + "”.",
      priority_move: "Name an accountable owner and score this cluster before the next review.",
      lever_ids: [l.id],
      rationale: l.share_pct + "% of economic weight currently has no cluster accountable for it (simulated calibration).",
      evidence: "", confidence: "high"
    });
  });

  var empty = state.clusters.filter(function (c) { return weightOf(c.id) === 0; });
  var biggest = state.clusters.slice().sort(function (a, b) { return weightOf(b.id) - weightOf(a.id); })[0];
  if (empty.length && biggest) {
    proposals.push({
      action: "merge", cluster_id: empty[0].id, merge_into_id: biggest.id,
      name: null, desc: "", priority_move: "",
      lever_ids: [],
      rationale: "“" + empty[0].name + "” carries no economic weight; its levers and roles belong with “" + biggest.name + "” (simulated calibration).",
      evidence: "", confidence: "medium"
    });
  }

  var overloaded = state.clusters.filter(function (c) {
    return levers.filter(function (l) { return l.cluster_id === c.id && (l.share_pct || 0) > 0; }).length >= 2;
  })[0];
  if (overloaded) {
    var own = levers.filter(function (l) { return l.cluster_id === overloaded.id && (l.share_pct || 0) > 0; });
    proposals.push({
      action: "split", cluster_id: overloaded.id, merge_into_id: null,
      name: own[own.length - 1].name.split("(")[0].trim().slice(0, 40),
      desc: "Split out of “" + overloaded.name + "” so each lever carries its own rating.",
      priority_move: "Assign a distinct owner and re-score the split cluster from evidence.",
      lever_ids: [own[own.length - 1].id],
      rationale: "“" + overloaded.name + "” answers for " + own.length + " levers that move on different capabilities and different clocks (simulated calibration).",
      evidence: "", confidence: "medium"
    });
  }

  if (biggest) {
    proposals.push({
      action: "keep", cluster_id: biggest.id, merge_into_id: null,
      name: null, desc: "", priority_move: "", lever_ids: [],
      rationale: "“" + biggest.name + "” carries the largest share of economic weight and maps cleanly to one discipline — no change needed (simulated calibration).",
      evidence: "", confidence: "high"
    });
  }
  if (!proposals.length) {
    proposals.push({
      action: "keep", cluster_id: state.clusters[0].id, merge_into_id: null,
      name: null, desc: "", priority_move: "", lever_ids: [],
      rationale: "Nothing to calibrate against yet — map P&L weights first (simulated calibration).",
      evidence: "", confidence: "low"
    });
  }
  return { proposals: proposals };
}

/* Propose cluster-set changes. Returns a validated calibration object. */
async function proposeClusterCalibration(state) {
  var cfg = getApiConfig();
  if (!cfg.apiKey) throw new Error("Add a Claude API key in Settings first (or use the key 'mock').");
  var raw;
  if (isMockKey(cfg.apiKey)) {
    await new Promise(function (r) { setTimeout(r, 500); });
    raw = mockClusterCalibration(state);
  } else {
    var messages = [{ role: "user", content: buildCalibrationPrompt(state) }];
    var resp = null;
    for (var attempt = 0; attempt < 4; attempt++) {
      resp = await anthropicRequest(cfg, {
        model: cfg.model, max_tokens: 4096,
        tools: [webSearchToolFor(cfg.model)],
        messages: messages
      });
      if (resp.stop_reason === "pause_turn") {
        messages = messages.concat([{ role: "assistant", content: resp.content }]);
        continue;
      }
      break;
    }
    if (resp.stop_reason === "refusal") throw new Error("The model declined this calibration request.");
    var text = (resp.content || []).filter(function (b) { return b.type === "text"; }).map(function (b) { return b.text; }).join("\n");
    raw = extractJson(text);
  }

  var leverIds = (((state.valueChain || {}).levers) || []).map(function (l) { return l.id; });
  var clusterIds = state.clusters.map(function (c) { return c.id; });
  var calibration = {
    id: "cal_" + Date.now(),
    generated_at: new Date().toISOString(),
    model: isMockKey(cfg.apiKey) ? "mock" : cfg.model,
    proposals: (raw.proposals || []).map(function (p) {
      return {
        action: CALIBRATION_ACTIONS.indexOf(p.action) !== -1 ? p.action : "keep",
        cluster_id: clusterIds.indexOf(p.cluster_id) !== -1 ? p.cluster_id : null,
        merge_into_id: clusterIds.indexOf(p.merge_into_id) !== -1 ? p.merge_into_id : null,
        name: typeof p.name === "string" && p.name.trim() ? p.name.trim().slice(0, 60) : null,
        desc: String(p.desc || "").trim(),
        priority_move: String(p.priority_move || "").trim(),
        lever_ids: (Array.isArray(p.lever_ids) ? p.lever_ids : []).filter(function (id) { return leverIds.indexOf(id) !== -1; }),
        rationale: String(p.rationale || "").trim(),
        evidence: String(p.evidence || "").trim(),
        confidence: CONFIDENCE_LEVELS.indexOf(p.confidence) !== -1 ? p.confidence : "low",
        applied: false, dismissed: false
      };
    }).filter(function (p) {
      // Drop proposals the applier could not honour — a structural change
      // aimed at a cluster that does not exist is worse than no proposal.
      if (!p.rationale) return false;
      if (p.action === "add" || p.action === "split") return !!p.name;
      if (p.action === "merge") return !!p.cluster_id && !!p.merge_into_id && p.cluster_id !== p.merge_into_id;
      return !!p.cluster_id;
    })
  };
  if (!calibration.proposals.length) throw new Error("No actionable calibration proposals came back — try again once more of the value chain is mapped.");
  var errs = validateCalibration(calibration);
  if (errs.length) throw new Error("Calibration failed contract validation: " + errs[0]);
  return calibration;
}

/* ============================================================
   Document ingestion & evidence synthesis (PRD F6, Local Edition)

   - .txt/.md/.csv/.json parse locally via FileReader (offline, free)
   - .pdf/.png/.jpg/.webp/.gif go to Claude as native document /
     image blocks (base64, held in memory only — never persisted)
   - .docx/.pptx/.xlsx are flagged unsupported with a save-as-PDF /
     paste-text path (no client-side parser in a zero-dependency app)
   The analysis prompt encodes the evidence-extraction protocol:
   verbatim figures, stated ≠ demonstrated, leading vs lagging,
   conservative level suggestions, falsifiable watch signals.
   ============================================================ */

var TEXT_EXTENSIONS = ["txt", "md", "markdown", "csv", "tsv", "json", "log"];
var IMAGE_TYPES = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif" };
var MAX_TEXT_CHARS = 100000;   // per document, persisted
var MAX_BINARY_BYTES = 10 * 1024 * 1024; // 10 MB per PDF/image (API limit is 32MB/request)
var MIN_PDF_TEXT_CHARS = 200;  // below this the PDF is treated as scanned → Claude vision

/* Routing: which ingestion path a file takes. Office formats parse
   locally via the vendored libraries; the stored doc.kind afterwards
   is always one of the contract's DOC_KINDS. */
function docKindFor(fileName, mimeType) {
  var ext = (fileName.split(".").pop() || "").toLowerCase();
  if (TEXT_EXTENSIONS.indexOf(ext) !== -1 || /^text\//.test(mimeType || "")) return "text";
  if (ext === "pdf" || mimeType === "application/pdf") return "pdf";
  if (IMAGE_TYPES[ext]) return "image";
  if (ext === "docx") return "docx";
  if (ext === "pptx") return "pptx";
  if (ext === "xlsx" || ext === "xls") return "xlsx";
  return "unsupported"; // legacy binary .doc/.ppt and everything else
}

function readAs(file, mode) {
  return new Promise(function (resolve, reject) {
    var r = new FileReader();
    r.onerror = function () { reject(new Error("Could not read " + file.name)); };
    r.onload = function () { resolve(r.result); };
    if (mode === "text") r.readAsText(file);
    else if (mode === "dataurl") r.readAsDataURL(file);
    else r.readAsArrayBuffer(file);
  });
}

function bufferToBase64(buf) {
  var bytes = new Uint8Array(buf);
  var chunks = [];
  for (var i = 0; i < bytes.length; i += 32768) {
    chunks.push(String.fromCharCode.apply(null, bytes.subarray(i, i + 32768)));
  }
  return btoa(chunks.join(""));
}

/* Read a File → document record. Office formats and text-layer PDFs
   become kind "text" (parsed locally); scanned PDFs and images keep
   a memory-only base64 payload for Claude vision. */
async function ingestFile(file, blobStore) {
  var route = docKindFor(file.name, file.type);
  var id = "doc_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
  var base = {
    id: id, name: file.name, label: file.name.replace(/\.[^.]+$/, ""),
    doc_type: "other", kind: "unsupported", size: file.size,
    added_at: new Date().toISOString()
  };
  if (route === "unsupported") return base;

  if (route === "text") {
    base.kind = "text";
    base.text = String(await readAs(file, "text") || "").slice(0, MAX_TEXT_CHARS);
    return base;
  }

  if (route === "docx" || route === "pptx" || route === "xlsx") {
    var canParse = (route === "xlsx") ? PARSER_SUPPORT.sheets : PARSER_SUPPORT.office;
    if (!canParse) return base; // vendored parser missing → unsupported
    var buf = await readAs(file, "arraybuffer");
    try {
      var text = route === "docx" ? await extractDocxText(buf)
        : route === "pptx" ? await extractPptxText(buf)
        : extractXlsxText(buf);
      if (!text || !text.trim()) throw new Error("no text found");
      base.kind = "text";
      base.parsed_from = route;
      base.text = text.slice(0, MAX_TEXT_CHARS);
      return base;
    } catch (e) {
      base.parse_error = String(e.message || e).slice(0, 120);
      return base; // stays unsupported, with the reason
    }
  }

  if (file.size > MAX_BINARY_BYTES) throw new Error(file.name + " is over 10 MB — split it or export a lighter version.");

  if (route === "pdf") {
    var pdfBuf = await readAs(file, "arraybuffer");
    if (PARSER_SUPPORT.pdf) {
      try {
        // pdf.js consumes the buffer — keep a copy for the vision fallback
        var textOut = await extractPdfText(pdfBuf.slice(0));
        if (textOut && textOut.length >= MIN_PDF_TEXT_CHARS) {
          base.kind = "text";
          base.parsed_from = "pdf";
          base.text = textOut.slice(0, MAX_TEXT_CHARS);
          return base;
        }
      } catch (e) { /* fall through to Claude vision */ }
    }
    base.kind = "pdf"; // scanned / no text layer → Claude reads it natively
    blobStore[id] = { media_type: "application/pdf", data: bufferToBase64(pdfBuf) };
    return base;
  }

  // image
  var dataUrl = await readAs(file, "dataurl");
  var ext = (file.name.split(".").pop() || "").toLowerCase();
  base.kind = "image";
  blobStore[id] = { media_type: IMAGE_TYPES[ext] || file.type, data: String(dataUrl).split(",")[1] || "" };
  return base;
}

function buildAnalysisPrompt(state) {
  var clusterLines = state.clusters.map(function (c) {
    return '- id: "' + c.id + '" | ' + c.name + " — " + c.desc;
  }).join("\n");
  var lensKeys = state.lenses.map(function (l) { return l.key; }).join(", ");
  return [
    "You are an organisational-capability analyst running an evidence-extraction protocol over the attached documents for a capability diagnostic.",
    "",
    "Organisation: " + state.orgName + " | Industry: " + state.industry_name,
    "Capability clusters (use these exact ids):",
    clusterLines,
    "Assessment lenses (use these exact keys): " + lensKeys,
    "Maturity scale: 1 Absent, 2 Early, 3 Emerging, 4 Established.",
    valueChainBrief(state),
    "",
    "Extraction discipline (mandatory):",
    "- Numbers verbatim — exact value, unit, base, comparison period. Never round or invent.",
    "- Stated is not demonstrated: announcements/approvals/plans are LEADING evidence (justify direction only); things live and operating are LAGGING evidence (justify level).",
    "- Between two levels, suggest the lower. If evidence is insufficient for a level call, use null.",
    "- Every finding maps to exactly one cluster id and one lens key from the lists above.",
    "- Watch signals must be falsifiable: a threshold plus what crossing it should trigger.",
    "",
    "ROLE EVIDENCE (when the documents contain job titles, an org chart, or a workforce file):",
    "- Also report which ANCHOR ROLES for each cluster are present, thin, or absent. A capability with no named owner cannot be scored as established, however good the narrative.",
    "- Quote the real job title as it appears in the document. If a capability's anchor role is nowhere in the document, report it as absent with status_evidence explaining what you searched for.",
    "- Separate two different risks: market scarcity (hard to hire — fixed by a succession bench) and tacit-knowledge intensity (hard to rebuild internally even if you can hire — fixed by knowledge capture, overlap and apprenticeship). Score them independently, 1-5 each.",
    "",
    "Extract the 4 to 10 most decision-relevant findings. Respond with ONLY a JSON object, no prose:",
    "{",
    '  "findings": [',
    "    {",
    '      "cluster_id": "one of the ids above",',
    '      "lens_key": "one of: ' + lensKeys + '",',
    '      "quote": "short verbatim evidence from the document (max 30 words)",',
    '      "figure": "the key number(s) with units, or empty string",',
    '      "source_ref": "where in the document (page/slide/section), or empty string",',
    '      "classification": "leading" | "lagging",',
    '      "direction": "improving" | "stable" | "declining" | null,',
    '      "suggested_level": 1 | 2 | 3 | 4 | null,',
    '      "suggested_status": "2-4 word headline",',
    '      "rationale": "one sentence with the real numbers",',
    '      "watch": "falsifiable watch signal with threshold, or null"',
    "    }",
    "  ],",
    '  "roles": [',
    "    {",
    '      "cluster_id": "one of the ids above",',
    '      "title": "the real job title as written in the document",',
    '      "status": "exists" | "thin" | "absent",',
    '      "status_evidence": "where you found it, or what you searched for and did not find",',
    '      "criticality": { "impact": 1-5, "scarcity": 1-5, "vacancy": 1-5, "pivotal": 1-5, "futurefit": 1-5 },',
    '      "tacit": { "time": 1-5, "codifiability": 1-5, "concentration": 1-5, "consequence": 1-5, "relationship": 1-5 },',
    '      "note": "one sentence on why this role is critical or internally irreplaceable"',
    "    }",
    "  ]",
    "}",
    'If the documents contain no role or org-chart information at all, return "roles": [].'
  ].join("\n");
}

function buildAnalysisContent(state, docs, blobStore) {
  var blocks = [{ type: "text", text: buildAnalysisPrompt(state) }];
  docs.forEach(function (d) {
    if (d.kind === "text" && d.text) {
      blocks.push({ type: "text", text: "=== DOCUMENT: " + d.label + " (" + d.doc_type + ", file: " + d.name + ") ===\n" + d.text });
    } else if (d.kind === "pdf" && blobStore[d.id]) {
      blocks.push({ type: "text", text: "=== DOCUMENT (PDF): " + d.label + " (" + d.doc_type + ", file: " + d.name + ") ===" });
      blocks.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: blobStore[d.id].data }, title: d.label });
    } else if (d.kind === "image" && blobStore[d.id]) {
      blocks.push({ type: "text", text: "=== DOCUMENT (image): " + d.label + " (" + d.doc_type + ", file: " + d.name + ") ===" });
      blocks.push({ type: "image", source: { type: "base64", media_type: blobStore[d.id].media_type, data: blobStore[d.id].data } });
    }
  });
  return blocks;
}

function mockAnalysis(state, docs) {
  var textDoc = docs.filter(function (d) { return d.kind === "text" && d.text; })[0];
  var firstLine = textDoc
    ? (textDoc.text.split("\n").map(function (s) { return s.trim(); }).filter(Boolean)[0] || "").slice(0, 90)
    : "Simulated evidence extract";
  var ids = state.clusters.map(function (c) { return c.id; });
  var lens = state.lenses.map(function (l) { return l.key; });
  var pick = function (i) { return ids[Math.min(i, ids.length - 1)]; };
  var L = function (k) { return lens.indexOf(k) !== -1 ? k : lens[0]; };
  return {
    findings: [
      {
        cluster_id: pick(0), lens_key: L("Culture"),
        quote: firstLine || "Engagement category 5 points below benchmark norm",
        figure: "−5 vs norm", source_ref: docs.length ? docs[0].label : "document",
        classification: "lagging", direction: null,
        suggested_level: 2, suggested_status: "Below benchmark",
        rationale: "Survey category sits 5 points below the high-performance norm in the uploaded evidence (simulated extraction).",
        watch: "Next pulse below the norm again → hold L2 and escalate remediation"
      },
      {
        cluster_id: pick(3), lens_key: L("People"),
        quote: "Specialist hiring approved; 6 offers extended, 4 accepted",
        figure: "4 of 6 offers accepted", source_ref: "workforce section",
        classification: "leading", direction: "improving",
        suggested_level: null, suggested_status: "Bench building",
        rationale: "Approved hires are announcements, not operating capability — leading evidence for an improving People trajectory only (simulated extraction).",
        watch: "Fewer than 4 starts by next quarter → bench gap persists, re-score"
      },
      {
        cluster_id: pick(2), lens_key: L("Process"),
        quote: "System deployed to 8 of 12 sites; active usage at 55%",
        figure: "deployment 67%, adoption 55%", source_ref: "program update",
        classification: "leading", direction: "stable",
        suggested_level: 3, suggested_status: "Rollout underway",
        rationale: "Deployment at 67% with adoption at 55% — a 12-point gap, inside the 30-point stall threshold but worth watching (simulated extraction).",
        watch: "Deployment-minus-adoption gap exceeds 30 points → flip Process trajectory down"
      }
    ],
    roles: [
      {
        cluster_id: pick(3), title: "Head of Pricing / Revenue Management", status: "absent",
        status_evidence: "Searched the uploaded titles for pricing, revenue management and deal desk — no enterprise owner found (simulated extraction).",
        criticality: { impact: 5, scarcity: 5, vacancy: 4, pivotal: 5, futurefit: 4 },
        tacit: { time: 3, codifiability: 2, concentration: 3, consequence: 4, relationship: 2 },
        note: "Scarce technical keystone; without it pricing fragments across sales, finance and ops."
      },
      {
        cluster_id: pick(0), title: "Load Control / Weight & Balance Officer", status: "exists",
        status_evidence: "Appears repeatedly across stations in the uploaded workforce data (simulated extraction).",
        criticality: { impact: 2, scarcity: 3, vacancy: 5, pivotal: 4, futurefit: 1 },
        tacit: { time: 5, codifiability: 4, concentration: 4, consequence: 5, relationship: 3 },
        note: "Safety-critical loading judgement; years to master and error carries a safety consequence."
      }
    ]
  };
}

/* Analyze uploaded evidence. Returns a validated analysis object. */
async function analyzeEvidence(state, docs, blobStore) {
  var cfg = getApiConfig();
  if (!cfg.apiKey) throw new Error("Add a Claude API key in Settings first (or use the key 'mock').");
  var ready = docs.filter(function (d) {
    return (d.kind === "text" && d.text) || ((d.kind === "pdf" || d.kind === "image") && blobStore[d.id]);
  });
  if (!ready.length) throw new Error("No analyzable documents — add a text/PDF/image file, or re-attach files after a reload.");
  ready = ready.slice(0, 6);
  var raw;
  if (isMockKey(cfg.apiKey)) {
    await new Promise(function (r) { setTimeout(r, 500); });
    raw = mockAnalysis(state, ready);
  } else {
    var messages = [{ role: "user", content: buildAnalysisContent(state, ready, blobStore) }];
    var resp = null;
    for (var attempt = 0; attempt < 3; attempt++) {
      resp = await anthropicRequest(cfg, { model: cfg.model, max_tokens: 8192, messages: messages });
      if (resp.stop_reason === "pause_turn") {
        messages = messages.concat([{ role: "assistant", content: resp.content }]);
        continue;
      }
      break;
    }
    if (resp.stop_reason === "refusal") throw new Error("The model declined to analyse these documents.");
    var text = (resp.content || []).filter(function (b) { return b.type === "text"; }).map(function (b) { return b.text; }).join("\n");
    raw = extractJson(text);
  }
  var analysis = {
    id: "ana_" + Date.now(),
    generated_at: new Date().toISOString(),
    model: isMockKey(cfg.apiKey) ? "mock" : cfg.model,
    doc_ids: ready.map(function (d) { return d.id; }),
    doc_labels: ready.map(function (d) { return d.label; }),
    findings: (raw.findings || []).map(function (f) {
      return {
        cluster_id: String(f.cluster_id || ""),
        lens_key: state.lenses.some(function (l) { return l.key === f.lens_key; }) ? f.lens_key : state.lenses[0].key,
        quote: String(f.quote || "").trim(),
        figure: String(f.figure || "").trim(),
        source_ref: String(f.source_ref || "").trim(),
        classification: EVIDENCE_CLASSES.indexOf(f.classification) !== -1 ? f.classification : "lagging",
        direction: LEADING_SIGNALS.indexOf(f.direction) !== -1 ? f.direction : null,
        suggested_level: (f.suggested_level >= 1 && f.suggested_level <= 4) ? Math.round(f.suggested_level) : null,
        suggested_status: String(f.suggested_status || "").trim(),
        rationale: String(f.rationale || "").trim(),
        watch: typeof f.watch === "string" && f.watch.trim() ? f.watch.trim() : null,
        applied: false
      };
    }).filter(function (f) {
      return f.quote && state.clusters.some(function (c) { return c.id === f.cluster_id; });
    }),
    roles: (raw.roles || []).map(function (r) {
      var c15 = function (v, d) { var n = parseFloat(v); return (n >= 1 && n <= 5) ? n : d; };
      var a = r.criticality || {}, t = r.tacit || {};
      return {
        cluster_id: String(r.cluster_id || ""),
        title: String(r.title || "").trim(),
        status: ROLE_STATUSES.indexOf(r.status) !== -1 ? r.status : "exists",
        status_evidence: String(r.status_evidence || "").trim(),
        axisA: {
          impact: c15(a.impact, 3), scarcity: c15(a.scarcity, 3), vacancy: c15(a.vacancy, 3),
          pivotal: c15(a.pivotal, 3), futurefit: c15(a.futurefit, 3)
        },
        tki: {
          time: c15(t.time, 3), codifiability: c15(t.codifiability, 3), concentration: c15(t.concentration, 3),
          consequence: c15(t.consequence, 3), relationship: c15(t.relationship, 3)
        },
        note: String(r.note || "").trim(),
        applied: false
      };
    }).filter(function (r) {
      return r.title && state.clusters.some(function (c) { return c.id === r.cluster_id; });
    })
  };
  var errs = validateAnalysis(analysis);
  if (errs.length) throw new Error("Evidence analysis failed contract validation: " + errs[0]);
  return analysis;
}

/* Node (contract test) export; harmless no-op in the browser. */
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    DEFAULT_MODEL: DEFAULT_MODEL,
    MODEL_CHOICES: MODEL_CHOICES,
    buildScanPrompt: buildScanPrompt,
    valueChainBrief: valueChainBrief,
    buildCalibrationPrompt: buildCalibrationPrompt,
    mockClusterCalibration: mockClusterCalibration,
    extractJson: extractJson,
    mockBriefing: mockBriefing,
    webSearchToolFor: webSearchToolFor,
    docKindFor: docKindFor,
    buildAnalysisPrompt: buildAnalysisPrompt,
    buildAnalysisContent: buildAnalysisContent,
    mockAnalysis: mockAnalysis
  };
}
