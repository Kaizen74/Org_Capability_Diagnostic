# Decisions Log

Why the app is built the way it is. One line of reasoning each, newest last.

| # | Decision | Reasoning |
|---|---|---|
| 1 | Zero-install browser app instead of the PRD's React + Python + Docker stack | The owner is non-technical; a stack needing four developer toolchains is not "locally deployable". Full stack is preserved as the Pro Edition roadmap. |
| 2 | All data in browser localStorage; JSON export as the backup | No server means no accounts, no hosting, no data leaving the machine. |
| 3 | Claude API key stored under a **separate** storage key from the diagnostic | So an Export file can never contain it. The data contract actively rejects any state carrying a key. |
| 4 | Direct browser → Anthropic calls (`anthropic-dangerous-direct-browser-access`) | Single-user local app; the key is the owner's and never touches an intermediary server. |
| 5 | `mock` as a magic API key | Lets the owner try every AI feature free and offline, and lets every automated test run without calling the real API. |
| 6 | One shared `schema.js` validated at runtime *and* in tests | This is what keeps "backend" and "frontend" aligned in a single-file app — a shape change on either side fails the contract test. |
| 7 | Trajectory shows `? Unknown` rather than a guessed "stable" | Prediction honesty: a cell with no evidence has no direction. Guessed arrows are the failure mode of predictive dashboards. |
| 8 | Momentum = 50% version history + 50% leading indicators, thresholds ±0.25 | Deliberately simple so any forecast can be explained to a board in one sentence; no black box. |
| 9 | Vendored pdf.js, SheetJS, JSZip into `app/js/vendor/` | Local parsing of PDF/Word/PowerPoint/Excel without asking the owner to install anything. Apache-2.0 / MIT, safe to redistribute. |
| 10 | PDF and image payloads held in memory only, never persisted | Keeps exports small and private; the app honestly asks for re-attach after a restart rather than silently losing content. |
| 11 | Value chain added as a **precursor** layer, not an afterthought | A capability is only critical if money or risk rides on it. Without economic weight, "weakest first" over-prioritises cheap weaknesses. |
| 12 | Board ranks by value exposure (weight × gap) when levers are mapped, weakest-first otherwise | Automatic best-available behaviour; the basis is always stated in the view so the ranking is never mysterious. |
| 13 | Roles scored on **two independent axes**, not one seniority score | Market scarcity (hard to hire) and tacit-knowledge intensity (hard to rebuild) are different risks with different fixes — succession bench vs knowledge capture. A one-axis view misses the quiet experts. |
| 14 | Routing thresholds fixed at 3.5 on both axes and shown in the UI | An auditable rule beats a tuned-in-secret one; reviewers can challenge the threshold rather than the vibe. |
| 15 | Role level suggestions from documents are never auto-applied | The model proposes; the human scores. Preserves the audit trail and the owner's accountability for every rating. |
| 16 | Two separate registers (critical-role and key-person) | One combined list hides knowledge-drain exposure — the exact failure the two-axis rubric exists to prevent. |
| 17 | Nav grouped "Diagnose" / "Ground it" rather than adding an eighth flat tab | Eight equal tabs is a menu; two groups is a workflow — evidence and economics feed the reads. |
