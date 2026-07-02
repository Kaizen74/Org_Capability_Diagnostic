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
    if (!_isObj(c.cells)) { errs.push("clusters[" + i + "]: cells required"); return; }
    (s.lenses || []).forEach(function (l) {
      if (c.cells[l.key]) errs = errs.concat(validateCell(c.cells[l.key], "clusters[" + i + "].cells." + l.key));
    });
  });
  if (!_isArr(s.patterns)) errs.push("patterns must be an array");
  if (!_isArr(s.versions)) errs.push("versions must be an array");
  if (s.briefings !== undefined && !_isArr(s.briefings)) errs.push("briefings must be an array");
  (s.briefings || []).forEach(function (b, i) {
    errs = errs.concat(validateBriefing(b).map(function (e) { return "briefings[" + i + "]: " + e; }));
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
    validateCell: validateCell,
    validateState: validateState,
    validateBriefing: validateBriefing,
    directionToLeading: directionToLeading
  };
}
