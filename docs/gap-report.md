# ConvictionIQ — Lovable Frontend Gap Report

**Ticket:** CIQ-4  
**Date:** 2026-07-04  
**Scope:** Review of the Lovable-generated frontend against the local prototype requirements.  
**Status:** Audit complete — gaps documented below. Implementation tickets TBD.

---

## 1. Routing & Layout

### Routes present

| Route | Component | Nav label |
|---|---|---|
| `/` | `src/components/DailyScreen/DailyScreen.tsx` | Daily Screen |
| `/briefing` | `src/components/Briefing/BriefingScreen.tsx` | Briefing |
| `/memory` | `src/components/Memory/MemoryScreen.tsx` | Memory |
| `/portfolio` | `src/components/Portfolio/PortfolioScreen.tsx` | Portfolio |
| `/mcp-setup` | `src/routes/mcp-setup.tsx` | MCP *(to remove — see §5)* |
| `/mcp` | `src/routes/mcp.ts` | *(internal — to remove)* |
| `/[.mcp]/list-tools` | `src/routes/[.mcp]/list-tools.ts` | *(MCP server — to remove)* |
| `/[.mcp]/invoke-tool/$tool` | `src/routes/[.mcp]/invoke-tool/$tool.ts` | *(MCP server — to remove)* |
| `/[.well-known]/oauth-protected-resource` | `src/routes/[.well-known]/oauth-protected-resource.ts` | *(Lovable auth — to remove)* |

### Layout

- **Root shell:** `src/routes/__root.tsx` — sets `<html lang="en" class="dark">`, injects CSS, wraps all routes in `AppHeader` + `Toaster`.
- **Sticky header:** `src/components/AppHeader.tsx` — logo, nav links, simulated-date display, Advance Day button, Sync/Refresh buttons (Lovable Cloud — to remove).
- **Error boundary:** `src/components/ErrorBoundary.tsx` wraps every screen route.
- **SSR-safe hydration guard:** `ClientOnly` wrapper in `__root.tsx` shows a skeleton until the client mounts, preventing hydration mismatch.

---

## 2. Screen Coverage

| Screen | Status | Notes |
|---|---|---|
| Daily Screen | **Present** | `/` → `DailyScreen.tsx` — ranked ticker table, Ichimoku + options scoring, band/signal filter bar |
| Study Card | **Present** | `StudyCardDrawer.tsx` — rendered as a Sheet drawer off the Daily Screen row, not a dedicated route |
| Daily Briefing | **Present** | `/briefing` → `BriefingScreen.tsx` — portfolio health, new setups, improved/weakened, exit alerts, income ops |
| Recommendation Memory | **Present** | `/memory` → `MemoryScreen.tsx` — filterable table of saved recommendation records with monitoring log |
| Portfolio Exposure | **Present** | `/portfolio` → `PortfolioScreen.tsx` — add/remove holdings, sector tracking |
| Settings | **Not needed** | Portfolio covers all user-configurable data (holdings, sector limits). Scoring thresholds are hardcoded in `src/lib/constants.ts` — intentional for local prototype. No separate Settings screen required. |

---

## 3. State Management

| Layer | Library | What it owns |
|---|---|---|
| Global UI state | Zustand (`src/lib/store.ts`) | `currentDate` (simulated day), filter selections (signal, band, strategy) |
| Server/async state | TanStack Query | All data fetching — snapshots, tickers, holdings, recommendations, monitoring log |
| Local persistence | Dexie / IndexedDB (`src/lib/db.ts`) | Recommendations, holdings, monitoring log — survives page refresh without a server |
| Computed / deterministic | `src/lib/snapshots.ts`, `src/lib/scoring.ts`, `src/lib/ichimoku.ts` | Score computation from seeded mock OHLC data |

State is entirely local-first: Dexie is the source of truth for the UI. The Sync/Refresh buttons in `AppHeader` are the only path to/from a remote store (Supabase — to remove, see §5).

---

## 4. Reusable Components

### Global

| Component | Path | Used by |
|---|---|---|
| `AppHeader` | `src/components/AppHeader.tsx` | All routes via `__root.tsx` |
| `ErrorBoundary` | `src/components/ErrorBoundary.tsx` | All screen routes |

### Domain

| Component | Path | Description |
|---|---|---|
| `BandChip` / `SignalChip` | `src/components/Chips.tsx` | Colour-coded band and signal badges — used by DailyScreen, BriefingScreen, MemoryScreen |
| `FilterBar` | `src/components/DailyScreen/FilterBar.tsx` | Signal / band / strategy dropdowns — used by DailyScreen only, but extractable |
| `StudyCardDrawer` | `src/components/DailyScreen/StudyCardDrawer.tsx` | Full study card Sheet — used by DailyScreen and BriefingScreen |

### Primitive library (shadcn/ui)

All 30+ shadcn/ui components live in `src/components/ui/`. Available without installation — already wired to the Tailwind design tokens. Key ones actively used:

`Sheet`, `Drawer`, `Dialog`, `Skeleton`, `Tooltip`, `Select`, `Button`, `Input`, `Textarea`, `Badge`, `Card`, `Table`, `Tabs`, `Separator`, `ScrollArea`, `Sonner` (toasts).

---

## 5. API / Server Assumptions to Remove

All items below are Lovable-platform dependencies. They do not belong in a local single-user prototype and should be removed in follow-up tickets.

### 5a. Lovable AI Gateway

| File | What it does | Env var required |
|---|---|---|
| `src/lib/ai-gateway.server.ts` | Creates an OpenAI-compatible client pointed at `https://ai.gateway.lovable.dev/v1` | `LOVABLE_API_KEY` |
| `src/lib/mcp/tools/ask_stock.ts` | Calls Lovable AI Gateway to answer natural-language stock questions | `LOVABLE_API_KEY` |

**Action:** Remove `ai-gateway.server.ts`. Remove or stub `ask_stock.ts`.

### 5b. MCP Server (Lovable Cloud)

| File / folder | What it does |
|---|---|
| `src/lib/mcp/` (all files) | MCP tool definitions: `advance_day`, `ask_stock`, `get_briefing`, `get_portfolio`, `ingest_positions`, `list_daily_candidates`, `list_memory`, `record_decision`, `remove_holding`, `upsert_holding` |
| `src/routes/[.mcp]/list-tools.ts` | MCP HTTP endpoint — lists available tools |
| `src/routes/[.mcp]/invoke-tool/$tool.ts` | MCP HTTP endpoint — invokes a tool by name |
| `src/routes/mcp-setup.tsx` | UI page explaining how to connect Claude to the MCP server |
| `src/routes/mcp.ts` | MCP root route |

**Action:** Remove the entire `src/lib/mcp/` folder and all `[.mcp]` routes. Remove `mcp-setup.tsx` and `mcp.ts`. Remove MCP nav item from `src/lib/constants.ts`.

### 5c. Supabase Sync

| File | What it does | Env vars required |
|---|---|---|
| `src/lib/sync.ts` | Push/pull between local Dexie and Supabase `app_state` table (labelled "Lovable Cloud") | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` |
| `src/integrations/supabase/client.ts` | Supabase JS client (client-side) | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` |
| `src/integrations/supabase/client.server.ts` | Supabase JS client (server-side) | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` |
| `src/integrations/supabase/auth-middleware.ts` | Supabase auth middleware for SSR routes | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` |
| `src/integrations/supabase/auth-attacher.ts` | Attaches Supabase auth to TanStack Start server | — |
| `src/integrations/supabase/types.ts` | Generated Supabase database types | — |
| `src/lib/mcp/state.ts` | Server-side Supabase client for MCP tools to read/write `app_state` | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` |
| `supabase/` (folder) | Supabase config and migrations | — |

**Action:** Remove `src/lib/sync.ts`, `src/integrations/supabase/` (entire folder), `src/lib/mcp/state.ts`, `supabase/` folder. Remove Sync/Refresh buttons from `AppHeader`. Remove all `SUPABASE_*` env vars.

### 5d. Lovable Error Reporting

| File | What it does |
|---|---|
| `src/lib/lovable-error-reporting.ts` | Calls `window.__lovableEvents?.captureException` — Lovable platform error telemetry |
| `src/lib/error-capture.ts` | Likely wraps Lovable error capture (verify before removing) |
| `src/lib/error-page.ts` | Lovable-specific error page helpers |

**Action:** Remove `lovable-error-reporting.ts`. Keep `ErrorBoundary.tsx` (it calls `reportLovableError` — replace the call with a `console.error` or remove entirely). Verify `error-capture.ts` and `error-page.ts` before removing.

### 5e. Summary of env vars to remove

```
LOVABLE_API_KEY
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

---

## 6. Suggested Next Tickets

| Priority | Work | Suggested ticket |
|---|---|---|
| High | Remove MCP server routes and `src/lib/mcp/` | New ticket: "CIQ — Remove Lovable MCP server infrastructure" |
| High | Remove Supabase sync (`src/lib/sync.ts`, `src/integrations/supabase/`) | New ticket: "CIQ — Remove Supabase/Lovable Cloud sync layer" |
| High | Remove Lovable AI Gateway (`ai-gateway.server.ts`, `ask_stock.ts`) | Covered by MCP removal ticket above |
| High | Remove Lovable error reporting; replace with `console.error` in ErrorBoundary | New ticket or bundled with MCP removal |
| Medium | Remove Sync/Refresh buttons from AppHeader; simplify to local-only flow | Bundled with Supabase removal |
| Low | Remove `/[.well-known]/oauth-protected-resource` route (Lovable auth artifact) | Bundled with MCP removal |
