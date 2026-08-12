/* ============================================================
   Capability Compass — Local document parsers

   Turns office documents into rubric-grade text entirely inside
   the browser, using vendored open-source libraries (app/js/vendor):
     - pdf.js  (Apache-2.0)  → PDF text, page by page
     - SheetJS (Apache-2.0)  → Excel .xlsx/.xls → per-sheet CSV tables
     - JSZip   (MIT)         → .docx/.pptx are zip archives of XML;
                               text is extracted from the XML directly
   Nothing leaves the machine during parsing. Scanned/image-only
   PDFs (no text layer) fall back to Claude vision via the API key.

   The XML→text helpers are pure functions, exported for the Node
   contract test so parsing logic and UI stay aligned.
   ============================================================ */

var XML_ENTITIES = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'" };

function decodeXmlEntities(s) {
  return String(s)
    .replace(/&(amp|lt|gt|quot|apos);/g, function (m) { return XML_ENTITIES[m]; })
    .replace(/&#x([0-9a-fA-F]+);/g, function (_, h) { return String.fromCodePoint(parseInt(h, 16)); })
    .replace(/&#(\d+);/g, function (_, d) { return String.fromCodePoint(parseInt(d, 10)); });
}

/* Word: paragraphs (</w:p>) and explicit breaks become newlines;
   table cells get separated so figures don't run together. */
function docxXmlToText(xml) {
  var s = String(xml)
    .replace(/<w:tab[^>]*\/>/g, "\t")
    .replace(/<w:br[^>]*\/>/g, "\n")
    .replace(/<\/w:tc>/g, " | ")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "");
  return decodeXmlEntities(s).replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/* PowerPoint: keep only the actual text runs (<a:t>), one line per
   paragraph (</a:p>), so shape/layout XML noise never leaks in. */
function pptxXmlToText(xml) {
  var paragraphs = String(xml).split(/<\/a:p>/);
  var out = [];
  var re = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;
  paragraphs.forEach(function (part) {
    var line = [], m;
    while ((m = re.exec(part)) !== null) line.push(decodeXmlEntities(m[1]));
    re.lastIndex = 0;
    if (line.length) out.push(line.join(""));
  });
  return out.join("\n").trim();
}

/* Natural sort for slide file names (slide2 before slide10). */
function slideOrder(a, b) {
  var na = parseInt((a.match(/slide(\d+)\.xml$/) || [])[1] || "0", 10);
  var nb = parseInt((b.match(/slide(\d+)\.xml$/) || [])[1] || "0", 10);
  return na - nb;
}

/* ---------- Browser extractors (need the vendored libs) ---------- */

var PARSER_SUPPORT = {
  pdf: typeof window !== "undefined" && typeof window.pdfjsLib !== "undefined",
  office: typeof window !== "undefined" && typeof window.JSZip !== "undefined",
  sheets: typeof window !== "undefined" && typeof window.XLSX !== "undefined"
};

if (PARSER_SUPPORT.pdf) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = "js/vendor/pdf.worker.min.js";
}

/* PDF → text. Returns "" when the PDF has no text layer (scanned). */
async function extractPdfText(arrayBuffer) {
  var doc = await window.pdfjsLib.getDocument({ data: arrayBuffer, isEvalSupported: false }).promise;
  var pages = [];
  var maxPages = Math.min(doc.numPages, 150);
  for (var p = 1; p <= maxPages; p++) {
    var page = await doc.getPage(p);
    var content = await page.getTextContent();
    var text = content.items.map(function (it) { return it.str; }).join(" ").replace(/\s+/g, " ").trim();
    if (text) pages.push("--- Page " + p + " ---\n" + text);
  }
  try { doc.destroy(); } catch (e) { /* ignore */ }
  return pages.join("\n\n").trim();
}

/* .docx → text via JSZip + XML stripping. */
async function extractDocxText(arrayBuffer) {
  var zip = await window.JSZip.loadAsync(arrayBuffer);
  var entry = zip.file("word/document.xml");
  if (!entry) throw new Error("Not a valid .docx (no word/document.xml)");
  var xml = await entry.async("string");
  return docxXmlToText(xml);
}

/* .pptx → text per slide via JSZip + XML stripping. */
async function extractPptxText(arrayBuffer) {
  var zip = await window.JSZip.loadAsync(arrayBuffer);
  var names = Object.keys(zip.files).filter(function (n) { return /^ppt\/slides\/slide\d+\.xml$/.test(n); }).sort(slideOrder);
  if (!names.length) throw new Error("Not a valid .pptx (no slides found)");
  var out = [];
  for (var i = 0; i < names.length; i++) {
    var xml = await zip.file(names[i]).async("string");
    var text = pptxXmlToText(xml);
    if (text) out.push("--- Slide " + (i + 1) + " ---\n" + text);
  }
  // Speaker notes often carry the real evidence
  var noteNames = Object.keys(zip.files).filter(function (n) { return /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(n); }).sort(slideOrder);
  for (var j = 0; j < noteNames.length; j++) {
    var nxml = await zip.file(noteNames[j]).async("string");
    var ntext = pptxXmlToText(nxml);
    if (ntext) out.push("--- Notes (slide " + (j + 1) + ") ---\n" + ntext);
  }
  return out.join("\n\n").trim();
}

/* .xlsx/.xls → per-sheet CSV tables via SheetJS. */
function extractXlsxText(arrayBuffer) {
  var wb = window.XLSX.read(arrayBuffer, { type: "array" });
  var out = [];
  wb.SheetNames.slice(0, 20).forEach(function (name) {
    var csv = window.XLSX.utils.sheet_to_csv(wb.Sheets[name]).trim();
    if (csv) {
      var lines = csv.split("\n").slice(0, 500);
      out.push("=== Sheet: " + name + " ===\n" + lines.join("\n"));
    }
  });
  return out.join("\n\n").trim();
}

/* Node (contract test) export; harmless no-op in the browser. */
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    decodeXmlEntities: decodeXmlEntities,
    docxXmlToText: docxXmlToText,
    pptxXmlToText: pptxXmlToText,
    slideOrder: slideOrder
  };
}
