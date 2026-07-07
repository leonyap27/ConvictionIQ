**Size: L**

# CIQ-8 — Analysis Inbox: CoWork Decision Queue

## What Changed

ConvictionIQ's main screen has been replaced. The old Daily Screen — a ranked table of tickers scored by a technical indicator pipeline — is gone. In its place is the **Analysis Inbox**: a queue-style view where every row represents a CoWork-generated analysis waiting for an operator decision.

This is the foundational shift in how ConvictionIQ works: instead of the app generating its own scores, it now receives analysis from an external CoWork workflow and presents it for human review and decisioning.

---

## What Operators Can Do Now

| Capability | Detail |
|---|---|
| Review pending analyses | Open any row in the Analysis Review Panel to read the full CoWork analysis body, signal label, and recommended action |
| Action an analysis | Select Add / Approve, Hold, Trim / Take Profit, or Exit / Cut Loss from the Review Panel; decision is saved locally |
| See what has been actioned | Actioned rows remain in the inbox but are visually dimmed and show the saved decision label — no records disappear unexpectedly |
| Work the highest-priority items first | Rows are sorted by urgency: Exit and Cut Loss positions surface at the top; Hold positions fall to the bottom |
| Multi-select and bulk action | Select multiple rows with checkboxes for bulk decisions |

---

## Before and After

| Aspect | Before | After |
|---|---|---|
| Default working view | Ranked Daily Screen of 30–50 tickers | Analysis Inbox showing CoWork-generated records |
| Where analysis comes from | App calculated composite scores from price/options data | CoWork generates analysis externally; app presents it for review |
| Decision tracking | None — no record of operator decisions | Each decision saved locally; actioned rows marked and labelled |
| Row priority | Score-ranked highest first | Sorted by action urgency: Exit first, Hold last |
| What the header shows | Date selector, Advance day, Sync, Refresh, Reset | Cleaned — only navigation and relevant inbox controls |

---

## CoWork Integration Story

ConvictionIQ is built as a **local-first prototype**. In this phase, analysis records are bundled as mock data — 15 representative records covering a range of tickers, asset classes, strategies, signal labels, and suggested actions.

The file contract for live integration is already defined: CoWork will write daily analysis files named `cowork-analysis-YYYY-MM-DD.json` to a configured local directory. When that sync is wired up in a future sprint, the inbox will read from those files instead of the mock bundle — no UI changes required.

---

## Caveats and Known Gaps

- **Mock data only.** The 15 records are static and bundled in the app. Live file sync from a CoWork directory is not yet implemented.
- **No server-side pagination.** All records load in a single pass. This is intentional for Phase 1 — live sync will introduce pagination when record volumes grow.
- **Decisions are browser-local.** Data is stored in IndexedDB (browser storage). Clearing browser data resets all decisions. A decision export or sync feature is not in scope for this sprint.
