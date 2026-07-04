# ConvictionIQ

AI-powered portfolio decision-support for disciplined discretionary investors. Ichimoku + options scoring, quality-gated study cards, and decision memory — runs entirely in your browser.

## Prerequisites

- **Bun** (latest stable) — the package manager and dev server runner.

  **macOS / Linux:**
  ```bash
  curl -fsSL https://bun.sh/install | bash
  ```

  **macOS with Homebrew:**
  ```bash
  brew install bun
  ```

  **Windows:** download the installer from [bun.sh](https://bun.sh).

  Requires Bun ≥ 1.1.0. Verify with `bun --version`.

- **Node.js** is not required — Bun bundles its own JS runtime.

## Install

```bash
bun install
```

## Run locally

```bash
bun dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser. The app loads immediately with no API keys required.

## What works offline (no API keys needed)

| Feature | Works offline? |
|---|---|
| Daily Screen — scored ticker list | Yes |
| Briefing | Yes |
| Memory | Yes |
| Portfolio | Yes |
| MCP Setup page | Yes (shows config instructions) |
| Add / edit holdings | Yes |
| Record decisions | Yes |
| Advance simulated date | Yes |
| **Sync to Server / Refresh from Server** | No — requires Supabase credentials |
| **Ask about a stock (MCP)** | No — requires `LOVABLE_API_KEY` |

## Environment variables (all optional)

Copy `.env.example` to `.env` and fill in only what you need:

```bash
cp .env.example .env
```

See `.env.example` for descriptions of each variable. If the file is empty or absent, the app starts normally and all offline features work.

### Cloud sync (optional)

Add Supabase credentials to `.env` to enable the **Sync to Server** and **Refresh from Server** buttons. These sync your local data to Supabase so Claude can read it through the MCP tools.

You can get your Supabase URL and publishable key from your project's API settings at [supabase.com](https://supabase.com).

### AI Q&A via MCP (optional)

Add `LOVABLE_API_KEY` to `.env` to enable the `ask_stock` MCP tool, which lets Claude answer grounded questions about a scored ticker.

## Connect Claude (MCP)

Once the dev server is running, go to the **MCP** tab in the app for step-by-step instructions to connect Claude Desktop, VS Code, or the Claude CLI.

## Build for production

```bash
bun run build
```

Output goes to `dist/`.
