/* ============================================================
   Capability Compass — Workspaces

   One browser, several named diagnostics: the Group view, a
   segment scored by value stream, a client engagement. Each is a
   complete, separate diagnostic.

   Storage, deliberately boring:
   - the ACTIVE workspace lives under the original storage key, so
     a diagnostic saved before workspaces existed simply becomes
     the first workspace with nothing to migrate;
   - every OTHER workspace is parked under its own key;
   - a small index lists them all.
   The API key is in none of these (it has its own key).
   ============================================================ */

var WS_INDEX_KEY = "capability_compass_workspaces_v1";
var WS_PREFIX = "capability_compass_ws_";

function wsReadIndex() {
  try {
    var ix = JSON.parse(localStorage.getItem(WS_INDEX_KEY));
    if (ix && Array.isArray(ix.list)) return ix;
  } catch (e) { /* fall through */ }
  return { active: null, list: [] };
}
function wsWriteIndex(ix) {
  try { localStorage.setItem(WS_INDEX_KEY, JSON.stringify(ix)); } catch (e) { /* storage unavailable */ }
}
function wsNewId() { return "ws_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

/* Make sure the state in hand is listed, named and marked active. */
function wsRegister(st) {
  if (!st) return;
  if (!st.workspaceId) st.workspaceId = wsNewId();
  if (!st.workspaceName) st.workspaceName = st.orgName || "Workspace";
  var ix = wsReadIndex();
  var row = ix.list.filter(function (w) { return w.id === st.workspaceId; })[0];
  if (!row) { row = { id: st.workspaceId }; ix.list.push(row); }
  row.name = st.workspaceName;
  row.unit = st.unit || "capability";
  row.updatedAt = new Date().toISOString();
  ix.active = st.workspaceId;
  wsWriteIndex(ix);
}

/* Park a workspace under its own key (when another becomes active). */
function wsPark(st) {
  if (!st || !st.workspaceId) return;
  try { localStorage.setItem(WS_PREFIX + st.workspaceId, JSON.stringify(st)); }
  catch (e) { throw new Error("Not enough browser storage to keep another workspace. Export one as a backup and delete it first."); }
}
function wsTakeParked(id) {
  var raw = localStorage.getItem(WS_PREFIX + id);
  if (!raw) return null;
  localStorage.removeItem(WS_PREFIX + id);
  return JSON.parse(raw);
}
function wsForget(id) {
  localStorage.removeItem(WS_PREFIX + id);
  var ix = wsReadIndex();
  ix.list = ix.list.filter(function (w) { return w.id !== id; });
  if (ix.active === id) ix.active = null;
  wsWriteIndex(ix);
}
function wsEraseAll(storeKey) {
  wsReadIndex().list.forEach(function (w) { localStorage.removeItem(WS_PREFIX + w.id); });
  localStorage.removeItem(WS_INDEX_KEY);
  localStorage.removeItem(storeKey);
}
