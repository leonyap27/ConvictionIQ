---
ticket: CIQ-7
type: business
tag: b
bucket: Frontend
sprint: v0.1.0
tracker: CIQ-12
---

**Size: M**

## What Changed

The Daily Briefing screen's six sections — Exit Alerts, Review Triggers, New Setups, Improved, Weakened, and Income — are now backed by a formal data contract. Each section knows exactly which fields it is allowed to show. Previously this was loose internal wiring that was invisible to anyone other than the developer who wrote it.

No visible change to the briefing screen's layout or behaviour. All six sections still render in the same order; items still open the Study Card drawer on click.

---

## What Operators and QA Can Do Now

| Capability | Detail |
|---|---|
| Reliable field display per section | The "Improved" and "Weakened" sections are guaranteed to carry a score-change value and a prior recommendation; "New Setup" and "Income" sections never carry those fields. The contract is enforced by the compiler — not by runtime checks that could be bypassed. |
| Safer future extension | Adding a seventh briefing category requires adding exactly one new member to the contract definition. The compiler then identifies every render site that must handle it — no category can be silently ignored. |

---

## Before / After

| Aspect | Before | After |
|---|---|---|
| Category field contract | Informal — fields were passed and accessed by convention only | Formal — each of the 6 categories declares its exact allowed fields |
| Score-change field on "Improved" / "Weakened" | Present but unchecked — any section could access it | Restricted to the two categories that actually carry it |
| New category risk | Adding a 7th category required manually updating every render site with no compiler guidance | Compiler flags every unhandled category at build time |

---

## Caveats

This change is internal structure only. The briefing screen's visual output is unchanged. QA verification of the six sections and the Study Card drawer is unchanged — the same test steps apply.
