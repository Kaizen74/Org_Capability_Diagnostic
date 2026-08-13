/* ============================================================
   Capability Compass — Shared Data Contract
   Single source of truth for the shapes that flow between the
   data layer (persistence, presets, LLM responses) and the UI.

   Used in THREE places, which is what keeps the layers aligned:
   1. Runtime: importJson() validates uploaded files.
   2. Runtime: the Signals engine validates every Claude response
      (real or mock) before it touches the UI.
   3. Tests: the Node contract test validates the demo state,
      preset-generated states, and mock briefings against the
      exact same functions.
   Any shape change must keep this file and its callers in sync —
   the contract test fails otherwise.
   ============================================================ */

var COMPASS_SCHEMA_VERSION = 1;
var SIGNAL_DIRECTIONS = ["tailwind", "headwind", "neutral"];
var LEADING_SIGNALS = ["improving", "stable", "declining"];
var DOC_KINDS = ["text", "pdf", "image", "unsupported"];
var DOC_TYPES = ["strategy-deck", "survey-report", "board-paper", "workforce-file", "annual-report", "org-chart", "program-update", "other"];
var EVIDENCE_CLASSES = ["leading", "lagging"];
var ROLE_STATUSES = ["exists", "thin", "absent"];
var ROLE_ROUTES = ["critical", "dual", "specialist", "standard"];
var AXIS_A_KEYS = ["impact", "scarcity", "vacancy", "pivotal", "futurefit"];
var TKI_KEYS = ["time", "codifiability", "concentration", "consequence", "relationship"];
var CALIBRATION_ACTIONS = ["add", "merge", "rename", "split", "keep"];
var CONFIDENCE_LEVELS = ["high", "medium", "low"];

function _isStr(v) { return typeof v === "string"; }
function _isArr(v) { return Array.isArray(v); }
function _isObj(v) { return v !== null && typeof v === "object" && !Array.isArray(v); }

/* Validate one cell. Returns error strings (empty = valid). */
function validateCell(cell, where) {
  var errs = [];
  if (!_isObj(cell)) return [where + ": cell is not an object"];
  if (!(cell.level >= 1 && cell.level <= 4)) errs.push(where + ": level must be 1-4");
  if (!_isStr(cell.status)) errs.push(where + ": status must be a string");
  if (!_isArr(cell.items)) errs.push(where + ": items must be an array");
  if (!_isArr(cell.evidence)) errs.push(where + ": evidence must be an array");
  if (!_isArr(cell.leading)) errs.push(where + ": leading must be an array");
  if (cell.watch !== undefined) {
    if (!_isArr(cell.watch)) errs.push(where + ": watch must be an array");
    else cell.watch.forEach(function (w, i) {
      if (!_isStr(w)) errs.push(where + ".watch[" + i + "]: watch signals must be strings");
    });
  }
  (cell.leading || []).forEach(function (li, i) {
    if (!_isStr(li.name)) errs.push(where + ".leading[" + i + "]: name must be a string");
    if (LEADING_SIGNALS.indexOf(li.signal) === -1) errs.push(where + ".leading[" + i + "]: signal must be one of " + LEADING_SIGNALS.join("/"));
  });
  return errs;
}

/* Validate a full application state (import / persistence shape). */
function validateState(s) {
  var errs = [];
  if (!_isObj(s)) return ["state is not an object"];
  if (s.schema !== COMPASS_SCHEMA_VERSION) errs.push("schema: expected " + COMPASS_SCHEMA_VERSION);
  if (!_isStr(s.orgName)) errs.push("orgName must be a string");
  if (!_isArr(s.lenses) || !s.lenses.length) errs.push("lenses must be a non-empty array");
  (s.lenses || []).forEach(function (l, i) {
    if (!_isStr(l.key) || !_isStr(l.name)) errs.push("lenses[" + i + "]: key and name required");
  });
  if (!_isArr(s.clusters) || !s.clusters.length) errs.push("clusters must be a non-empty array");
  (s.clusters || []).forEach(function (c, i) {
    if (!_isStr(c.id)) errs.push("clusters[" + i + "]: id required");
    if (!_isStr(c.name)) errs.push("clusters[" + i + "]: name required");
    if (c.roles !== undefined) {
      if (!_isArr(c.roles)) errs.push("clusters[" + i + "].roles must be an array");
      else c.roles.forEach(function (r, ri) {
        errs = errs.concat(validateRole(r, "clusters[" + i + "].roles[" + ri + "]"));
      });
    }
    if (!_isObj(c.cells)) { errs.push("clusters[" + i + "]: cells required"); return; }
    (s.lenses || []).forEach(function (l) {
      if (c.cells[l.key]) errs = errs.concat(validateCell(c.cells[l.key], "clusters[" + i + "].cells." + l.key));
    });
  });
  if (s.valueChain !== undefined && s.valueChain !== null) {
    errs = errs.concat(validateValueChain(s.valueChain));
    (s.valueChain.levers || []).forEach(function (l, i) {
      if (l.cluster_id && !(s.clusters || []).some(function (c) { return c.id === l.cluster_id; }))
        errs.push("valueChain.levers[" + i + "]: cluster_id does not match any cluster");
    });
  }
  if (!_isArr(s.patterns)) errs.push("patterns must be an array");
  if (!_isArr(s.versions)) errs.push("versions must be an array");
  if (s.briefings !== undefined && !_isArr(s.briefings)) errs.push("briefings must be an array");
  (s.briefings || []).forEach(function (b, i) {
    errs = errs.concat(validateBriefing(b).map(function (e) { return "briefings[" + i + "]: " + e; }));
  });
  if (s.documents !== undefined && !_isArr(s.documents)) errs.push("documents must be an array");
  (s.documents || []).forEach(function (d, i) {
    errs = errs.concat(validateDocument(d).map(function (e) { return "documents[" + i + "]: " + e; }));
  });
  if (s.analyses !== undefined && !_isArr(s.analyses)) errs.push("analyses must be an array");
  (s.analyses || []).forEach(function (a, i) {
    errs = errs.concat(validateAnalysis(a).map(function (e) { return "analyses[" + i + "]: " + e; }));
  });
  if (s.calibrations !== undefined && !_isArr(s.calibrations)) errs.push("calibrations must be an array");
  (s.calibrations || []).forEach(function (c, i) {
    errs = errs.concat(validateCalibration(c).map(function (e) { return "calibrations[" + i + "]: " + e; }));
  });
  // The API key must NEVER live inside exported/persisted state.
  if (s.apiKey || s.api_key || (s.settings && s.settings.apiKey)) errs.push("state must not contain an API key");
  return errs;
}

/* Validate an external-signals briefing (Claude response contract). */
function validateBriefing(b) {
  var errs = [];
  if (!_isObj(b)) return ["briefing is not an object"];
  if (!_isStr(b.generated_at)) errs.push("generated_at must be a string");
  if (!_isStr(b.model)) errs.push("model must be a string");
  if (!_isArr(b.signals) || !b.signals.length) errs.push("signals must be a non-empty array");
  (b.signals || []).forEach(function (sig, i) {
    var w = "signals[" + i + "]";
    if (!_isStr(sig.headline) || !sig.headline.trim()) errs.push(w + ": headline required");
    if (!_isStr(sig.summary)) errs.push(w + ": summary required");
    if (SIGNAL_DIRECTIONS.indexOf(sig.direction) === -1) errs.push(w + ": direction must be one of " + SIGNAL_DIRECTIONS.join("/"));
    if (!_isArr(sig.affected_cluster_ids)) errs.push(w + ": affected_cluster_ids must be an array");
    if (sig.lens_key !== undefined && sig.lens_key !== null && !_isStr(sig.lens_key)) errs.push(w + ": lens_key must be a string when present");
  });
  return errs;
}

function _score1to5(v) { return typeof v === "number" && v >= 1 && v <= 5; }

/* Validate one anchor role (two-axis rubric: criticality × tacit knowledge). */
function validateRole(r, where) {
  var errs = [];
  if (!_isObj(r)) return [where + ": role is not an object"];
  if (!_isStr(r.id)) errs.push(where + ": id required");
  if (!_isStr(r.title) || !r.title.trim()) errs.push(where + ": title required");
  if (ROLE_STATUSES.indexOf(r.status) === -1) errs.push(where + ": status must be one of " + ROLE_STATUSES.join("/"));
  if (!_isObj(r.axisA)) errs.push(where + ": axisA required");
  else AXIS_A_KEYS.forEach(function (k) {
    if (!_score1to5(r.axisA[k])) errs.push(where + ".axisA." + k + " must be a number 1-5");
  });
  if (!_isObj(r.tki)) errs.push(where + ": tki required");
  else TKI_KEYS.forEach(function (k) {
    if (!_score1to5(r.tki[k])) errs.push(where + ".tki." + k + " must be a number 1-5");
  });
  return errs;
}

/* Validate the value-chain / follow-the-money layer. */
function validateValueChain(vc) {
  var errs = [];
  if (!_isObj(vc)) return ["valueChain is not an object"];
  if (!_isStr(vc.currency)) errs.push("valueChain.currency must be a string");
  if (!_isArr(vc.stages)) errs.push("valueChain.stages must be an array");
  (vc.stages || []).forEach(function (s, i) {
    if (!_isStr(s.label)) errs.push("valueChain.stages[" + i + "].label must be a string");
  });
  if (!_isArr(vc.levers)) errs.push("valueChain.levers must be an array");
  (vc.levers || []).forEach(function (l, i) {
    var w = "valueChain.levers[" + i + "]";
    if (!_isStr(l.id)) errs.push(w + ": id required");
    if (!_isStr(l.name) || !l.name.trim()) errs.push(w + ": name required");
    if (typeof l.share_pct !== "number" || l.share_pct < 0 || l.share_pct > 100)
      errs.push(w + ": share_pct must be a number 0-100");
    if (l.cluster_id !== null && l.cluster_id !== undefined && !_isStr(l.cluster_id))
      errs.push(w + ": cluster_id must be null or a string");
  });
  return errs;
}

/* Validate an ingested document's metadata (content itself may be
   in-memory only — PDFs/images are never persisted to storage). */
function validateDocument(d) {
  var errs = [];
  if (!_isObj(d)) return ["document is not an object"];
  if (!_isStr(d.id)) errs.push("id required");
  if (!_isStr(d.name)) errs.push("name required");
  if (!_isStr(d.label)) errs.push("label must be a string");
  if (DOC_KINDS.indexOf(d.kind) === -1) errs.push("kind must be one of " + DOC_KINDS.join("/"));
  if (DOC_TYPES.indexOf(d.doc_type) === -1) errs.push("doc_type must be one of " + DOC_TYPES.join("/"));
  if (d.text !== undefined && d.text !== null && !_isStr(d.text)) errs.push("text must be a string when present");
  if (d.kind !== "text" && d.text) errs.push("only text documents may persist extracted text");
  return errs;
}

/* Validate an evidence-analysis result (Claude extraction contract). */
function validateAnalysis(a) {
  var errs = [];
  if (!_isObj(a)) return ["analysis is not an object"];
  if (!_isStr(a.generated_at)) errs.push("generated_at must be a string");
  if (!_isStr(a.model)) errs.push("model must be a string");
  if (!_isArr(a.doc_ids)) errs.push("doc_ids must be an array");
  if (!_isArr(a.findings) || !a.findings.length) errs.push("findings must be a non-empty array");
  (a.findings || []).forEach(function (f, i) {
    var w = "findings[" + i + "]";
    if (!_isStr(f.cluster_id)) errs.push(w + ": cluster_id required");
    if (!_isStr(f.lens_key)) errs.push(w + ": lens_key required");
    if (!_isStr(f.quote) || !f.quote.trim()) errs.push(w + ": quote (verbatim evidence) required");
    if (EVIDENCE_CLASSES.indexOf(f.classification) === -1) errs.push(w + ": classification must be leading|lagging");
    if (f.direction !== null && f.direction !== undefined && LEADING_SIGNALS.indexOf(f.direction) === -1)
      errs.push(w + ": direction must be null or one of " + LEADING_SIGNALS.join("/"));
    if (f.suggested_level !== null && f.suggested_level !== undefined && !(f.suggested_level >= 1 && f.suggested_level <= 4))
      errs.push(w + ": suggested_level must be null or 1-4");
    if (f.watch !== null && f.watch !== undefined && !_isStr(f.watch)) errs.push(w + ": watch must be null or a string");
  });
  if (a.roles !== undefined) {
    if (!_isArr(a.roles)) errs.push("roles must be an array");
    else a.roles.forEach(function (r, i) {
      var w = "roles[" + i + "]";
      if (!_isStr(r.cluster_id)) errs.push(w + ": cluster_id required");
      if (!_isStr(r.title) || !r.title.trim()) errs.push(w + ": title required");
      if (ROLE_STATUSES.indexOf(r.status) === -1) errs.push(w + ": status must be one of " + ROLE_STATUSES.join("/"));
      if (!_isObj(r.axisA)) errs.push(w + ": axisA required");
      else AXIS_A_KEYS.forEach(function (k) { if (!_score1to5(r.axisA[k])) errs.push(w + ".axisA." + k + " must be 1-5"); });
      if (!_isObj(r.tki)) errs.push(w + ": tki required");
      else TKI_KEYS.forEach(function (k) { if (!_score1to5(r.tki[k])) errs.push(w + ".tki." + k + " must be 1-5"); });
    });
  }
  return errs;
}

/* Validate a cluster-calibration proposal set (Claude response contract).
   Structural changes to the cluster set are the most consequential thing
   the model can suggest, so the contract is strict: every proposal must
   name an action, a rationale, and — except for "add" — an existing
   cluster it acts on. Nothing here is ever auto-applied. */
function validateCalibration(c) {
  var errs = [];
  if (!_isObj(c)) return ["calibration is not an object"];
  if (!_isStr(c.generated_at)) errs.push("generated_at must be a string");
  if (!_isStr(c.model)) errs.push("model must be a string");
  if (!_isArr(c.proposals) || !c.proposals.length) errs.push("proposals must be a non-empty array");
  (c.proposals || []).forEach(function (p, i) {
    var w = "proposals[" + i + "]";
    if (CALIBRATION_ACTIONS.indexOf(p.action) === -1) errs.push(w + ": action must be one of " + CALIBRATION_ACTIONS.join("/"));
    if (!_isStr(p.rationale) || !p.rationale.trim()) errs.push(w + ": rationale required");
    if (p.action !== "add" && (!_isStr(p.cluster_id) || !p.cluster_id.trim()))
      errs.push(w + ": cluster_id required for action '" + p.action + "'");
    if (p.action === "add" && (!_isStr(p.name) || !p.name.trim()))
      errs.push(w + ": name required when adding a cluster");
    if (p.action === "merge" && (!_isStr(p.merge_into_id) || !p.merge_into_id.trim()))
      errs.push(w + ": merge_into_id required when merging");
    if (p.action === "split" && (!_isStr(p.name) || !p.name.trim()))
      errs.push(w + ": name required for the cluster being split out");
    if (!_isArr(p.lever_ids)) errs.push(w + ": lever_ids must be an array");
    if (CONFIDENCE_LEVELS.indexOf(p.confidence) === -1)
      errs.push(w + ": confidence must be one of " + CONFIDENCE_LEVELS.join("/"));
  });
  return errs;
}

/* Map a signal direction to a leading-indicator signal. */
function directionToLeading(direction) {
  if (direction === "tailwind") return "improving";
  if (direction === "headwind") return "declining";
  return "stable";
}

/* Node (contract test) export; harmless no-op in the browser. */
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    COMPASS_SCHEMA_VERSION: COMPASS_SCHEMA_VERSION,
    SIGNAL_DIRECTIONS: SIGNAL_DIRECTIONS,
    LEADING_SIGNALS: LEADING_SIGNALS,
    DOC_KINDS: DOC_KINDS,
    DOC_TYPES: DOC_TYPES,
    EVIDENCE_CLASSES: EVIDENCE_CLASSES,
    ROLE_STATUSES: ROLE_STATUSES,
    ROLE_ROUTES: ROLE_ROUTES,
    AXIS_A_KEYS: AXIS_A_KEYS,
    TKI_KEYS: TKI_KEYS,
    CALIBRATION_ACTIONS: CALIBRATION_ACTIONS,
    CONFIDENCE_LEVELS: CONFIDENCE_LEVELS,
    validateCalibration: validateCalibration,
    validateRole: validateRole,
    validateValueChain: validateValueChain,
    validateCell: validateCell,
    validateState: validateState,
    validateBriefing: validateBriefing,
    validateDocument: validateDocument,
    validateAnalysis: validateAnalysis,
    directionToLeading: directionToLeading
  };
}
