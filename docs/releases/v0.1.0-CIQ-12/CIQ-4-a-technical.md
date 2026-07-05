---
ticket: CIQ-4
title: Review Lovable Frontend First Cut
audience: Technical
tag: a
bucket: Frontend
sprint: v0.1.0
tracker: CIQ-12
date: 2026-07-05
---

**Size: S**

## Summary

CIQ-4 produced `docs/gap-report.md` — a 158-line audit of the Lovable-generated frontend against the local-prototype requirements. No application code was changed. All five required screens are present. Four categories of Lovable-platform dependencies were identified and catalogued for removal in follow-up tickets.

---

## Screen coverage

All five screens required by the prototype scope are present and routable.

| Screen | Status | Entry point |
|---|---|---|
| Daily Screen | Present | `/` → `src/components/DailyScreen/DailyScreen.tsx` |
| Study Card | Present | Drawer off Daily Screen — `src/components/DailyScreen/StudyCardDrawer.tsx` |
| Daily Briefing | Present | `/briefing` → `src/components/Briefing/BriefingScreen.tsx` |
| Recommendation Memory | Present | `/memory` → `src/components/Memory/MemoryScreen.tsx` |
| Portfolio Exposure | Present | `/portfolio` → `src/components/Portfolio/PortfolioScreen.tsx` |
| Settings | Not needed | Portfolio covers all user-configurable data; scoring thresholds hardcoded in `src/lib/constants.ts` by design |

---

## State management stack

| Layer | Library | Source file | Owns |
|---|---|---|---|
| Global UI state | Zustand | `src/lib/store.ts` | Simulated date, filter selections (signal, band, strategy) |
| Async / server state | TanStack Query | (query hooks per screen) | All data fetching — tickers, snapshots, holdings, recommendations |
| Local persistence | Dexie / IndexedDB | `src/lib/db.ts` | Recommendations, holdings, monitoring log — survives refresh without a server |
| Computed / deterministic | — | `src/lib/snapshots.ts`, `src/lib/scoring.ts`, `src/lib/ichimoku.ts` | Score computation from seeded mock OHLC data |

State is fully local-first. Dexie is the authoritative store for the UI. The only path to/from a remote store is the Sync/Refresh buttons in `AppHeader` (Supabase — scheduled for removal, §5c below).

---

## Reusable components catalogue

### Global

| Component | Path | Used by |
|---|---|---|
| `AppHeader` | `src/components/AppHeader.tsx` | All routes via `src/routes/__root.tsx` |
| `ErrorBoundary` | `src/components/ErrorBoundary.tsx` | All screen routes |

### Domain

| Component | Path | Description |
|---|---|---|
| `BandChip` / `SignalChip` | `src/components/Chips.tsx` | Colour-coded band and signal badges; consumed by DailyScreen, BriefingScreen, MemoryScreen |
| `FilterBar` | `src/components/DailyScreen/FilterBar.tsx` | Signal / band / strategy dropdowns; used by DailyScreen, extractable |
| `StudyCardDrawer` | `src/components/DailyScreen/StudyCardDrawer.tsx` | Full study-card Sheet; consumed by DailyScreen and BriefingScreen |

### Primitive library

30+ shadcn/ui components live in `src/components/ui/` — already wired to Tailwind design tokens, no additional installation needed. Actively used primitives: `Sheet`, `Drawer`, `Dialog`, `Skeleton`, `Tooltip`, `Select`, `Button`, `Input`, `Textarea`, `Badge`, `Card`, `Table`, `Tabs`, `Separator`, `ScrollArea`, `Sonner`.

---

## Lovable dependencies to remove

Four categories of Lovable-platform infrastructure were found. None belong in a local single-user prototype. Engineers picking up removal tickets should work from the file lists below; the full detail (action notes, env-var mapping) is in `docs/gap-report.md §5`.

### 5a — Lovable AI Gateway

| File | Purpose | Env var |
|---|---|---|
| `src/lib/ai-gateway.server.ts` | OpenAI-compatible client → `https://ai.gateway.lovable.dev/v1` | `LOVABLE_API_KEY` |
| `src/lib/mcp/tools/ask_stock.ts` | Natural-language stock queries via Lovable AI Gateway | `LOVABLE_API_KEY` |

Action: remove `ai-gateway.server.ts`; remove or stub `ask_stock.ts`.

### 5b — MCP server (Lovable Cloud)

| File / folder | Purpose |
|---|---|
| `src/lib/mcp/` (all files) | MCP tool definitions: `advance_day`, `ask_stock`, `get_briefing`, `get_portfolio`, `ingest_positions`, `list_daily_candidates`, `list_memory`, `record_decision`, `remove_holding`, `upsert_holding` |
| `src/routes/[.mcp]/list-tools.ts` | MCP HTTP endpoint — list tools |
| `src/routes/[.mcp]/invoke-tool/$tool.ts` | MCP HTTP endpoint — invoke tool |
| `src/routes/mcp-setup.tsx` | UI page — Claude/MCP connection instructions |
| `src/routes/mcp.ts` | MCP root route |

Action: remove entire `src/lib/mcp/`, all `[.mcp]` routes, `mcp-setup.tsx`, `mcp.ts`, and the MCP nav item in `src/lib/constants.ts`.

### 5c — Supabase sync

| File | Purpose | Env vars |
|---|---|---|
| `src/lib/sync.ts` | Push/pull local Dexie ↔ Supabase `app_state` table | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` |
| `src/integrations/supabase/client.ts` | Supabase JS client (client-side) | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` |
| `src/integrations/supabase/client.server.ts` | Supabase JS client (server-side) | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` |
| `src/integrations/supabase/auth-middleware.ts` | Supabase auth middleware for SSR routes | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` |
| `src/integrations/supabase/auth-attacher.ts` | Attaches Supabase auth to TanStack Start server | — |
| `src/integrations/supabase/types.ts` | Generated Supabase database types | — |
| `src/lib/mcp/state.ts` | Server-side Supabase client for MCP tools | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` |
| `supabase/` (root folder) | Supabase config and migrations | — |

Action: remove `src/lib/sync.ts`, `src/integrations/supabase/` (entire folder), `src/lib/mcp/state.ts`, `supabase/` root folder. Remove Sync/Refresh buttons from `AppHeader`.

### 5d — Lovable error reporting

| File | Purpose |
|---|---|
| `src/lib/lovable-error-reporting.ts` | Calls `window.__lovableEvents?.captureException` — Lovable platform telemetry |
| `src/lib/error-capture.ts` | Likely wraps Lovable error capture (verify before removing) |
| `src/lib/error-page.ts` | Lovable-specific error page helpers |

Action: remove `lovable-error-reporting.ts`. In `ErrorBoundary.tsx` replace the `reportLovableError` call with `console.error`. Verify `error-capture.ts` and `error-page.ts` before deleting.

### Env vars to remove

```
LOVABLE_API_KEY
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

---

## Routes to remove (routing table delta)

These routes exist today and must be deleted as part of the MCP/Supabase removal tickets:

| Route | File | Reason |
|---|---|---|
| `/mcp-setup` | `src/routes/mcp-setup.tsx` | Lovable MCP onboarding UI |
| `/mcp` | `src/routes/mcp.ts` | MCP root — Lovable Cloud |
| `/[.mcp]/list-tools` | `src/routes/[.mcp]/list-tools.ts` | MCP HTTP server |
| `/[.mcp]/invoke-tool/$tool` | `src/routes/[.mcp]/invoke-tool/$tool.ts` | MCP HTTP server |
| `/[.well-known]/oauth-protected-resource` | `src/routes/[.well-known]/oauth-protected-resource.ts` | Lovable auth artifact |

---

## Suggested next tickets

From `docs/gap-report.md §6`:

| Priority | Work | Notes |
|---|---|---|
| High | Remove MCP server routes + `src/lib/mcp/` | Includes AI Gateway and `ask_stock.ts` |
| High | Remove Supabase sync (`src/lib/sync.ts`, `src/integrations/supabase/`) | Also removes `supabase/` root folder and AppHeader Sync/Refresh buttons |
| High | Remove Lovable error reporting; replace `reportLovableError` in `ErrorBoundary` with `console.error` | Can bundle with MCP removal |
| Low | Remove `/[.well-known]/oauth-protected-resource` route | Bundle with MCP removal |

---

## Reference

Full detail for all sections above: `docs/gap-report.md`
