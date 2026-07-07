---
ticket: CIQ-7
type: technical
tag: a
bucket: Frontend
sprint: v0.1.0
tracker: CIQ-12
---

**Size: M**

## Summary

Introduced a `BriefingCategory` string union and a `BriefingItem` discriminated union in `src/lib/types.ts`, then refactored `BriefingScreen.tsx` to type all six briefing sections against the new union. The discriminated union (Shape B) enables TypeScript's `Extract<>` utility to narrow each section to its exact field set without runtime guards.

---

## Problem Being Solved

`BriefingScreen.tsx` previously assembled its six category arrays using untyped or loosely-typed local inference. There was no central contract describing what fields each briefing category carried, which meant TypeScript could not catch a misuse of `recommendation` on a `new-setup` item or a missing `scoreDelta` on an `improved` item at compile time. Any future contributor adding a seventh category had no machine-checkable template to follow.

---

## Architecture: Before and After

| Aspect | Before | After |
|---|---|---|
| Category type | Inferred string literals in local scope of `BriefingScreen.tsx` | `BriefingCategory` union exported from `src/lib/types.ts` |
| Per-category field contract | No central contract — fields accessed ad hoc | `BriefingItem` discriminated union: one member per category, each with exact required fields |
| Type narrowing method | Runtime `if/switch` or cast | `Extract<BriefingItem, { category: "..." }>[]` — compile-time narrowing, no runtime guard |
| `BriefingScreen` imports | Imported `DailySnapshot`, `RecommendationRecord`, plus local string literals | Single import: `BriefingItem`; all field shapes derived from the union |
| Literal type preservation | String literals widened at assignment | `as const` on all category string assignments |

---

## Types Added — `src/lib/types.ts`

```typescript
// Six briefing categories — string union
type BriefingCategory =
  | "new-setup"
  | "improved"
  | "weakened"
  | "review-trigger"
  | "exit-alert"
  | "income";

// Discriminated union — one member per category
type BriefingItem =
  | { category: "new-setup";      snapshot: DailySnapshot }
  | { category: "improved";       snapshot: DailySnapshot; recommendation: RecommendationRecord; scoreDelta: number }
  | { category: "weakened";       snapshot: DailySnapshot; recommendation: RecommendationRecord; scoreDelta: number }
  | { category: "review-trigger"; snapshot: DailySnapshot; recommendation: RecommendationRecord }
  | { category: "exit-alert";     snapshot: DailySnapshot; recommendation: RecommendationRecord }
  | { category: "income";         snapshot: DailySnapshot };
```

`Extract<BriefingItem, { category: "improved" }>` resolves to the `improved` member only, giving TypeScript full knowledge of `scoreDelta` and `recommendation` at the call site without a cast.

---

## Refactoring in `BriefingScreen.tsx`

| Change | Detail |
|---|---|
| Import narrowed | Removed `DailySnapshot`, `RecommendationRecord` imports; replaced with `BriefingItem` only |
| Array types | All 6 internal arrays typed as `Extract<BriefingItem, { category: "..." }>[]` |
| Literal preservation | All 6 category string assignments use `as const` |
| Render sites | All 6 render lambdas destructure `{ snapshot, recommendation, scoreDelta }` from the narrowed union member — no casts |

_Diagram omitted: single-file refactoring with no branching or actor exchanges — prose captures the change completely._

---

## Design Decisions

| Option | Considered | Verdict | Reason |
|---|---|---|---|
| Keep `ScoringInputs` as a separate type | Yes | Rejected | Scoring inputs already embedded in `DailySnapshot`; adding a separate type would duplicate fields |
| Grouped union (Shape A) — `{ category: string } & CategoryFields` | Yes | Rejected | Requires runtime category check before accessing category-specific fields; `Extract<>` unavailable |
| Discriminated union (Shape B) — one member per category | Yes | **Chosen** | TypeScript narrows on `category` discriminant; `Extract<>` works at compile time; no runtime guards |

---

## File Changes

| File | Change |
|---|---|
| `src/lib/types.ts` | Added `BriefingCategory` string union and `BriefingItem` discriminated union (6 members) |
| `src/components/Briefing/BriefingScreen.tsx` | Narrowed imports to `BriefingItem`; typed all 6 arrays; added `as const` on category literals; destructured fields from union members at all 6 render sites |

---

## Risk and Rollback

**Risk:** The discriminated union is strict — a `new-setup` item cannot carry a `recommendation` field. If a caller constructs a `BriefingItem` with extra fields, TypeScript will surface a type error at the call site. This is intentional but could be surprising to a contributor not familiar with discriminated unions.

**Rollback:** Revert `src/lib/types.ts` to remove `BriefingCategory` and `BriefingItem`, and revert `BriefingScreen.tsx` to its prior import set. No Dexie schema, routing, or runtime data is affected — this is a compile-time-only change.

---

## Test Evidence

| Test | Method | Result |
|---|---|---|
| TC-001: `BriefingCategory` union has 6 values | `tsc --noEmit` | PASS |
| TC-002: `BriefingItem` discriminated union compiles | `tsc --noEmit` | PASS |
| TC-003: `BriefingScreen` imports `BriefingItem` only | Source inspection | PASS |
| TC-004: 6 sections render; Exit Alerts first | Browser — user verified | PASS |
| TC-005: Items clickable; `StudyCardDrawer` opens | Browser — user verified | PASS |
