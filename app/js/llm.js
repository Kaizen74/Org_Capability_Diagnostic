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

function buildScanPrompt(state, keywords) {
  var clusterLines = state.clusters.map(function (c) {
    var weak = state.lenses.filter(function (l) { return c.cells[l.key] && c.cells[l.key].level <= 2; }).map(function (l) { return l.key; });
    return '- id: "' + c.id + '" | ' + c.name + " — " + c.desc + (weak.length ? " | weak lenses: " + weak.join(", ") : "");
  }).join("\n");
  var lensKeys = state.lenses.map(function (l) { return l.key; }).join(", ");
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
    "",
    "Use web search to find the LATEST relevant market research, industry trends, competitor moves, and regulatory shifts (prioritise the last 6 months). Then produce 3 to 5 signals that should recalibrate this diagnostic.",
    "",
    "Respond with ONLY a JSON object, no prose before or after, matching exactly:",
    "{",
    '  "signals": [',
    "    {",
    '      "headline": "short signal headline (max 12 words)",',
    '      "summary": "2-3 sentences: what the signal is and why it matters to this organisation, with concrete facts or numbers",',
    '      "source": "publication or organisation the signal comes from, with year",',
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
        source: "Industry analyst briefing, 2026 (simulated)",
        direction: "headwind",
        affected_cluster_ids: ids.slice(2, 3).length ? ids.slice(2, 3) : [ids[0]],
        lens_key: lens.indexOf("Process") !== -1 ? "Process" : lens[0],
        calibration_note: "Pressure-test the Process ratings of technology clusters; competitor pace suggests holding L3 requires faster rollout."
      },
      {
        headline: "Talent market loosening for specialist commercial roles",
        summary: "Labour-market data shows rising availability of pricing and revenue-operations specialists as sector consolidation releases talent. Hiring windows like this historically last 2-3 quarters.",
        source: "Talent market monitor, 2026 (simulated)",
        direction: "tailwind",
        affected_cluster_ids: [ids[Math.min(3, ids.length - 1)]],
        lens_key: lens.indexOf("People") !== -1 ? "People" : lens[0],
        calibration_note: "Bench-gap cells rated L2 have a realistic path to L3 within two cycles if hiring accelerates now."
      },
      {
        headline: "Regulators signal tighter workforce-safety reporting",
        summary: "Draft regulatory guidance proposes mandatory disclosure of safety-culture metrics alongside incident counts. Final rules expected within 12 months; peers are already piloting expanded reporting.",
        source: "Regulatory tracker, 2026 (simulated)",
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
var UNSUPPORTED_EXTENSIONS = ["docx", "pptx", "xlsx", "doc", "ppt", "xls"];
var MAX_TEXT_CHARS = 100000;   // per document, persisted
var MAX_BINARY_BYTES = 10 * 1024 * 1024; // 10 MB per PDF/image (API limit is 32MB/request)

function docKindFor(fileName, mimeType) {
  var ext = (fileName.split(".").pop() || "").toLowerCase();
  if (TEXT_EXTENSIONS.indexOf(ext) !== -1 || /^text\//.test(mimeType || "")) return "text";
  if (ext === "pdf" || mimeType === "application/pdf") return "pdf";
  if (IMAGE_TYPES[ext]) return "image";
  if (UNSUPPORTED_EXTENSIONS.indexOf(ext) !== -1) return "unsupported";
  return "unsupported";
}

/* Read a File into {kind, text?} + registers binary payloads into blobStore. */
function ingestFile(file, blobStore) {
  return new Promise(function (resolve, reject) {
    var kind = docKindFor(file.name, file.type);
    var id = "doc_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
    var base = {
      id: id, name: file.name, label: file.name.replace(/\.[^.]+$/, ""),
      doc_type: "other", kind: kind, size: file.size,
      added_at: new Date().toISOString()
    };
    if (kind === "unsupported") { resolve(base); return; }
    if (kind === "text") {
      var r1 = new FileReader();
      r1.onerror = function () { reject(new Error("Could not read " + file.name)); };
      r1.onload = function () {
        base.text = String(r1.result || "").slice(0, MAX_TEXT_CHARS);
        resolve(base);
      };
      r1.readAsText(file);
      return;
    }
    // pdf / image → base64, memory only
    if (file.size > MAX_BINARY_BYTES) { reject(new Error(file.name + " is over 10 MB — split it or export a lighter PDF.")); return; }
    var r2 = new FileReader();
    r2.onerror = function () { reject(new Error("Could not read " + file.name)); };
    r2.onload = function () {
      var data = String(r2.result || "").split(",")[1] || "";
      var ext = (file.name.split(".").pop() || "").toLowerCase();
      blobStore[id] = { media_type: kind === "pdf" ? "application/pdf" : (IMAGE_TYPES[ext] || file.type), data: data };
      resolve(base);
    };
    r2.readAsDataURL(file);
  });
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
    "",
    "Extraction discipline (mandatory):",
    "- Numbers verbatim — exact value, unit, base, comparison period. Never round or invent.",
    "- Stated is not demonstrated: announcements/approvals/plans are LEADING evidence (justify direction only); things live and operating are LAGGING evidence (justify level).",
    "- Between two levels, suggest the lower. If evidence is insufficient for a level call, use null.",
    "- Every finding maps to exactly one cluster id and one lens key from the lists above.",
    "- Watch signals must be falsifiable: a threshold plus what crossing it should trigger.",
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
    "  ]",
    "}"
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
    extractJson: extractJson,
    mockBriefing: mockBriefing,
    webSearchToolFor: webSearchToolFor,
    docKindFor: docKindFor,
    buildAnalysisPrompt: buildAnalysisPrompt,
    buildAnalysisContent: buildAnalysisContent,
    mockAnalysis: mockAnalysis
  };
}
