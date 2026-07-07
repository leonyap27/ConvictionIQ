---
ticket: CIQ-10
type: business
tag: b
bucket: Frontend
version: 0.1.0
tracker: CIQ-12
---

**Size: L**

## What Changed

A new Decision Ledger screen is now available at the `/ledger` route. It gives the user a permanent, searchable record of every investment decision they have actioned — with the original analysis preserved exactly as it was at the time of the decision.

Previously, once an item moved out of the inbox there was no way to review what decision was made, what the score and price were at that moment, or what notes were recorded. That history was effectively lost to the user.

---

## What Users Can Do Now

### View the full decision history

The ledger displays every saved decision in a table. Each row shows: the ticker, asset class, color band, signal, strategy (e.g. Cash-Secured Put or Long Equity), the decision label (e.g. Accepted, Rejected, Modified), the score and price at the time of the decision, a preview of any notes, the follow-up status, and the date the decision was actioned.

### Filter by five dimensions

Users can narrow the ledger to the decisions they care about using any combination of:

- **Asset Class** — e.g. US Equity, ETF
- **Type** — ledger records vs. follow-up records
- **Decision Label** — Accepted, Rejected, Modified, Watch Only, Closed, Lesson Learned
- **Strategy** — Cash-Secured Put, Long Equity, Covered Call
- **Follow-up Status** — Pending (follow-up due in the future), Overdue (past due), N/A (no follow-up set)

Filters are applied immediately with no page reload.

### Open the original analysis snapshot

Clicking View on any row opens a side panel showing the full detail of that decision as it was recorded: the composite score, the price, the analyst note, and the suggested action — all preserved from the moment the decision was made. This lets the user review their original reasoning without needing to reconstruct it.

### Edit and log decision notes

The side panel includes an editable notes field. Changes are saved immediately to local storage. Every edit is appended to a notes history log, so the user can track how their thinking evolved over time on a given position.

---

## Before/After

| Capability | Before | After |
|------------|--------|-------|
| Reviewing past decisions | Not possible once item left the inbox | Available at `/ledger` with full analysis snapshot |
| Filtering decision history | None | 5 filter dimensions — label, strategy, status, type, asset class |
| Adding notes after the decision | Not supported | Notes editable in the detail panel; full history logged |
| Follow-up tracking | Raw date only — no status label | Computed status: Pending / Overdue / N/A |

---

## Caveats and Deferred Items

- **Date Range filter** — filtering by decision date range was scoped but deferred. Users can scroll to find decisions by date but cannot filter to a date window yet.
- **Search** — free-text search across notes or tickers is not included in this release.
- **Backend sync, tax/accounting exports, and broker integration** — all out of scope for this local prototype.
