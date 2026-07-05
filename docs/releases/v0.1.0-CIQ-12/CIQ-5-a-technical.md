---
ticket: CIQ-5
title: Set Up Local Development Baseline
audience: Technical
tag: a
bucket: Frontend
sprint: v0.1.0
tracker: CIQ-12
date: 2026-07-05
---

**Size: M**

## Summary

CIQ-5 makes the Lovable-generated app reliably runnable on a fresh local checkout. Four files were changed or created: the `package.json` engines constraint was added, the misleading error message in `src/integrations/supabase/client.ts` was corrected, and two new files — `.env.example` and `README.md` — were written from scratch. No application logic was modified. Test verdict: Pass (5/5 static checks, forge run-1).

---

## Problem being solved

The Lovable-generated repo had no README, no `.env.example`, and a Supabase error message that told local developers to "Connect Supabase in Lovable Cloud" — a Lovable-hosted instruction that is meaningless outside that platform. A developer cloning the repo had no documented path from checkout to running app, and no indication that Supabase credentials are optional for local use.

---

## Before / after

| Aspect | Before | After |
|---|---|---|
| README | Not present | `README.md` at repo root — prerequisites, `bun install`, `bun dev`, offline feature matrix, env var guide, MCP pointer, `bun run build` |
| Supabase error message (`src/integrations/supabase/client.ts` line 41) | `"Connect Supabase in Lovable Cloud"` | `"Cloud sync is not configured — add Supabase credentials to .env to enable 'Sync to Server' / 'Refresh from Server'. See .env.example for the required variables."` |
| Env var documentation | None — no `.env.example` | `.env.example` at repo root, all six env vars documented and grouped by feature tier |
| Bun version enforcement | None | `"engines": { "bun": ">=1.1.0" }` in `package.json` |

---

## File changes

| File | Change type | What changed |
|---|---|---|
| `README.md` | New | Install prerequisites, `bun install` / `bun dev` commands, offline feature matrix table, env var guide with `.env.example` pointer, MCP setup pointer, `bun run build` |
| `.env.example` | New | Six env vars documented in two tiers: Tier 1 (cloud sync — `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) and Tier 2 (AI Q&A — `LOVABLE_API_KEY`) |
| `src/integrations/supabase/client.ts` | Modified | Error message on line 41 rewritten — removes "Connect Supabase in Lovable Cloud" and replaces with actionable local-dev guidance referencing `.env.example` |
| `package.json` | Modified | `engines.bun: ">=1.1.0"` added as a soft version floor |

_Diagram omitted: single linear flow with no branching or actors — all changes are documentation and config with no runtime control flow._

---

## Env var inventory

All six env vars referenced across `src/` are now documented in `.env.example`:

| Variable | Client-side / Server-side | Feature gated |
|---|---|---|
| `VITE_SUPABASE_URL` | Client (Vite build-time) | Supabase cloud sync |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Client (Vite build-time) | Supabase cloud sync |
| `SUPABASE_URL` | Server (SSR / MCP) | Supabase cloud sync |
| `SUPABASE_PUBLISHABLE_KEY` | Server (SSR / MCP) | Supabase cloud sync |
| `SUPABASE_SERVICE_ROLE_KEY` | Server (SSR / MCP) | Supabase cloud sync (service role) |
| `LOVABLE_API_KEY` | Server (MCP `ask_stock` tool) | AI Q&A via MCP |

None of these vars are required for the app to start. The offline feature matrix in `README.md` makes this explicit.

---

## Risk and rollback

**Risk level: Low.** No application logic was changed. The Supabase error message fix is additive — it improves the developer experience without altering when the error fires or the exception type thrown. The `engines` field in `package.json` is advisory (Bun respects it; it does not block installs on older versions).

**Rollback:** revert `README.md`, `.env.example`, the `package.json` engines field, and `client.ts` line 41. No database migrations, no API changes, no build step affected.

---

## Test evidence

Forge run-1 — 5/5 static checks passed:

1. `package.json` `scripts.dev` is `vite dev` — matches `bun dev` documented in README.
2. `src/integrations/supabase/client.ts` line 41 no longer references "Lovable Cloud" — fixed.
3. `.env.example` documents all six env vars found in `src/` — complete.
4. README `bun install` / `bun dev` commands match `package.json` scripts — consistent.
5. README states app starts without API keys — consistent with Dexie-first data layer.

Runtime verification (fresh `bun install` + `bun dev` on a clean checkout) is deferred to a human operator with Bun installed, per the agreed test plan.
