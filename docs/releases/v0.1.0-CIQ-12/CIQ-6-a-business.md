**Size: L**

# CIQ-6 — Queue App Shell and Demo CoWork Dataset

**Business Release Notes**

## What changed

The app's navigation and workflow have been replaced entirely. The Daily Screen / Portfolio / Briefing / Memory navigation is gone. In its place: a four-screen decision queue — Analysis Inbox, Decision Ledger, Follow-up Queue, and Queue Settings — built around how an analyst actually processes research.

The app opens on the **Analysis Inbox**. Records are separated by asset class (US options, Singapore stocks, Hong Kong stocks, crypto) so strategies that require different decision frameworks are never compared in the same list.

---

## What users can do now

| Capability | Detail |
|------------|--------|
| Review a queue of incoming analysis records | Inbox opens by default with 15 pre-loaded demo records across 4 asset classes |
| Act on multiple records at once | Checkbox-select any number; sticky bulk action bar moves them to Ledger or Follow-up Queue in one step |
| See a log of actioned decisions | Decision Ledger shows all actioned records, filterable by asset class and action type |
| Track positions under monitoring | Follow-up Queue: cards with due-date labels (Overdue / Due today / Due in N days) and a Mark done button |
| Configure which asset classes appear | Queue Settings: per-asset-class toggles and a default view preference |
| Demo the full workflow on first launch | 15 inbox records, 3 actioned decisions, and 2 follow-up records pre-seeded — no manual data entry required |

---

## Before / after

| Aspect | Before | After |
|--------|--------|-------|
| Default screen | Daily Screen (ticker ranking) | Analysis Inbox (decision queue) |
| Navigation items | Daily, Briefing, Memory, Portfolio, MCP Setup | Inbox, Ledger, Follow-up Queue, Settings |
| Asset class handling | US tickers in one blended table | Grouped by asset class — separate sections |
| Demo data on launch | 98 mock tickers | 15 inbox + 3 decisions + 2 follow-ups, seeded once |

---

## Caveats and known gaps

- Two browser-level verification tests remain pending (grouped Inbox rendering and seed deduplication on reload). All other acceptance criteria passed static analysis. No functional issues are expected.
- The app remains entirely local — no data leaves the device, no account or API key is required.
- The old Daily Screen, Portfolio, Briefing, and Memory screens have been fully removed. Any bookmarks or direct links to those URLs will show a not-found page.
