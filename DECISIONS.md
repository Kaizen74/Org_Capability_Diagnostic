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
| 18 | The value chain **calibrates the cluster set**, not just the ranking | Scoring an industry preset's rows carefully still answers a question about the wrong six things. Four automatic tests — ownership, materiality, separability, diagnosability — check whether these are the right clusters for *this* organisation's money. |
| 19 | Calibration runs in two passes: deterministic first, Claude second | Arithmetic on the owner's own numbers is checkable, offline, and never wrong about itself. The harvest is only for what arithmetic cannot know — how the industry organises the same capability. |
| 20 | No structural change (add / merge / rename / split) is ever auto-applied | Changing the cluster set changes what the whole diagnostic is about. Every proposal needs a click, and merge/remove states plainly what it discards. |
| 21 | The calibration prompt must be allowed to return `keep` | A calibration that changes everything is a rewrite. Forcing the model to justify *no* change is what stops it inventing work. |
| 22 | Industry presets ship starter levers at **0% weight** | The preset knows the *shape* of a money map in that industry; only the owner knows the numbers. Seeding a plausible weight would be a fabricated economic figure, which the rest of the app is built to refuse. |
| 23 | Matrix, Board and Trajectory share one ordering basis | Three views ranking the same clusters three ways is three priority stories. One control, one basis, stated in each view. |
| 24 | Every Signal Matrix row carries its share of the P&L | A maturity score with no materiality beside it invites the board to fix the cheapest gap first. |
| 25 | The methodology's weaknesses ship **inside the app**, not in a doc | A board will find single-rater scoring and the one-snapshot baseline anyway. Naming them first is what makes the strengths credible; a methodology page that only advertises is marketing. |
| 26 | Every watch-out must carry a mitigation | A caveat with no action is an excuse. The test suite fails the build if any limitation lacks one. |
| 27 | Blueprint counters read live state | A static picture ages into a lie. Binding the diagram to the real diagnostic means any claim can be checked against the reader's own data. |
| 28 | Badge/explanation parity enforced both ways in tests | The diagram and the assessment are two representations of one thing; without a test they drift apart on the first edit. |
| 29 | Population guidance lives in the view, collapsed — not in the README | People fill in the Value Chain while looking at the Value Chain. Guidance one tab away is guidance not read; guidance always open is clutter. |
| 30 | Ten role criteria cut to six | Three Axis-A criteria were all measuring consequence, Axis B carried a cross-axis duplicate, and a 10% weight on a 1–5 scale could never cross the 3.5 threshold. Fewer, non-overlapping criteria beat more criteria for rater agreement. |
| 31 | The test for keeping a criterion is "does it point at a different remedy?" | Criteria that lead to the same action are one criterion wearing two names. Six criteria, six remedies. |
| 32 | "Codifiability" renamed "Locked in heads" | The old scale ran 1–5 toward *more* tacit, so a 5 meant "not codifiable" — backwards from its own label. Renaming removes the ambiguity; documenting it would have preserved it. |
| 33 | Every criterion carries written 1/3/5 anchors and an explicit "not" boundary | Anchored scales are the largest lever on inter-rater agreement, and the boundary line is what stops one reason raising two scores. |
| 34 | Definitions open from the column header, not a manual | Guidance read at the moment of scoring is guidance used. The same cards are also reachable as a full six-criterion guide. |
| 35 | Legacy scores migrate deterministically, never reset to 3 | A rubric change must not silently destroy last quarter's judgements or re-route a role. The migration runs on saved state, JSON import, old CSV headers and LLM replies, and the tests assert routing is preserved. |
