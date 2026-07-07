# CIQ-9 — Implement Queue Visual States and Status Badges

**Size: L** | **Audience: Business** | **Tag: a**

## What Changed

The three decision screens — Analysis Inbox, Decision Ledger, and Follow-up Queue — now use a consistent colour and badge system so that the user can read decision status and urgency without opening individual records.

---

## What Users Can Do Now

| Capability | Detail |
|------------|--------|
| Read row urgency at a glance in Follow-up Queue | Overdue and today's follow-ups show an amber-tinted row; reviews due within 3 days show a yellow-tinted row. No amber = nothing urgent today. |
| Distinguish decision outcomes in the Decision Ledger | Each record's decision (Accepted, Modified, Rejected, Watch Only, Closed, Lesson Learned) is displayed as a colour-coded badge — green for positive decisions, amber for conditional ones, gray for closed items. |
| See colour-band context per row in the Decision Ledger | Each row is tinted to match the signal colour band (Super Green, Light Green, Pink, Super Red) of the underlying analysis, matching the colour language used in the Analysis Inbox. |
| Identify reasoning gaps in Analyst Notes | If a scoring input was not grounded in a named factor, an amber warning icon appears on that reasoning bullet, flagging it for the user's attention. |
| Distinguish actioned records in the Analysis Inbox | Rows already recorded in the Decision Ledger are visually dimmed — still readable, but clearly separated from items that still require a decision. |

---

## Before / After

| Screen | Before | After |
|--------|--------|-------|
| Analysis Inbox | All rows visually identical regardless of status | Actioned rows are dimmed; colour-band tints reflect signal strength |
| Decision Ledger | Decision labels shown as plain text | Decision labels shown as colour-coded badges (green / amber / gray) |
| Follow-up Queue | All rows visually identical regardless of date | Overdue and today's rows show amber; within-3-day rows show yellow |
| Analyst Notes | All reasoning bullets look the same | Bullets without a named input show an amber warning icon |

---

## Caveats and Known Gaps

- **Follow-up date entry is not yet available.** The `Next Review Date` field exists in the data model and urgency tints will fire when the field is set, but users cannot yet enter or edit the date from the UI. A follow-up ticket will deliver the date picker widget.
- **Decision badges are ready but not yet visible.** The badge component is built and the colour rules are defined; however, badges will only appear on screen once the Decision Ledger is extended to store a decision label per record. This is a follow-up wiring task.
- **One visual test (dark-mode warning icon)** needs confirmation on the live dev server before this item can be fully signed off.
