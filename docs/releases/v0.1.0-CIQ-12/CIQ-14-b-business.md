---
ticket: CIQ-14
type: business
tag: b
bucket: Frontend
sprint: v0.1.0
tracker: CIQ-12
---

**Size: M**

## What Changed

The app now formally recognises 11 market themes — US Mega Cap, US Tech & AI, US Financials, US Healthcare, US Energy, US Consumer, US Industrials, US ETFs, SG Blue Chip, SG REITs, and SG Financials — and assigns every ticker in the mock dataset to one of these themes. A ruleset structure is also in place that lets a future filtering screen include or exclude themes and set a minimum quality score.

A sixth signal label, HOLD, was added. It appears only in the portfolio monitoring context — the Daily Briefing opportunity scanner does not show HOLD, which keeps the scanner focused on actionable new opportunities.

---

## What Operators Can Do Now

| Capability | Detail |
|---|---|
| Every ticker has a theme | All 100+ mock tickers are tagged with a market theme. Future filtering work can group or filter by theme without any further data migration. |
| Theme-based ruleset ready to wire | A default ruleset (`DEFAULT_RULES`) is available: it covers all 11 themes, requires a minimum composite score, and caps the display count. A future Queue Settings screen can expose this ruleset to the operator without additional data model work. |
| HOLD signal in portfolio context | Positions that are being held but not acting on now emit a HOLD label in the portfolio view. This distinguishes "hold and monitor" from "exit alert" without cluttering the opportunity scanner. |

---

## Before / After

| Aspect | Before | After |
|---|---|---|
| Ticker market theme | Not recorded — all tickers were undifferentiated | 11 named themes; every ticker assigned |
| Signal labels available | 5 (Sell Put, Watch, Watchlist, Avoid, Exit Alert) | 6 — adds Hold for portfolio monitoring |
| Theme-based filtering | Not possible — no theme data | Possible — theme is a filterable field on every ticker |
| Default ruleset | Not defined | Defined with all 11 themes included; ready for future UI exposure |

---

## Caveats

Theme-based filtering is not yet exposed in the UI — this ticket lays the data model foundation. The Queue Settings screen that will let operators adjust rulesets is a future ticket. All 11 themes are included in the default ruleset until that screen is built.

The HOLD signal is visible in the portfolio view. It does not appear on the Daily Screen opportunity scanner by design.
