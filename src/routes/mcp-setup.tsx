import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

export const Route = createFileRoute("/mcp-setup")({
  component: McpSetupPage,
  head: () => ({
    meta: [
      { title: "MCP Setup — ConvictionIQ" },
      { name: "description", content: "Connect Claude Desktop, VS Code, or the Claude CLI to ConvictionIQ via MCP." },
    ],
  }),
});

function McpSetupPage() {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const mcpUrl = `${origin}/mcp`;

  const claudeDesktopConfig = JSON.stringify(
    {
      mcpServers: {
        convictioniq: { url: mcpUrl },
        // Add your IBKR MCP here alongside this entry, e.g.:
        // ibkr: { url: "http://localhost:8765/mcp" }
      },
    },
    null,
    2,
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 md:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Connect Claude to ConvictionIQ</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        ConvictionIQ exposes an MCP server so Claude (Desktop, VS Code, CLI) can read your
        scored setups, briefing, memory, and portfolio, ingest IBKR positions, record
        decisions, advance the simulated day, and answer grounded questions about a ticker.
      </p>

      <section className="mt-6 rounded-md border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">MCP endpoint</h2>
        <CopyBlock text={mcpUrl} />
        <p className="mt-2 text-xs text-muted-foreground">
          Single-user, unauthenticated by design. Use with a Claude client on the same
          machine or trusted network.
        </p>
      </section>

      <section className="mt-6 rounded-md border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Claude Desktop / VS Code config</h2>
        <CopyBlock text={claudeDesktopConfig} multiline />
        <p className="mt-2 text-xs text-muted-foreground">
          Add alongside your IBKR MCP entry so Claude has both connectors in one session.
        </p>
      </section>

      <section className="mt-6 rounded-md border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Suggested workflow with IBKR MCP</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Ask Claude to pull current positions from IBKR MCP.</li>
          <li>Have Claude call <code className="text-foreground">ingest_positions</code> to sync into ConvictionIQ.</li>
          <li>
            Ask Claude to review today's briefing (<code className="text-foreground">get_briefing</code>) and
            ask questions about specific tickers (<code className="text-foreground">ask_stock</code>).
          </li>
          <li>When ready to act, have Claude call <code className="text-foreground">record_decision</code> with a full exit plan.</li>
          <li>Click <strong>Refresh from server</strong> in the header to pull Claude's changes into the local web UI.</li>
        </ol>
      </section>

      <section className="mt-6 rounded-md border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Available tools</h2>
        <ul className="mt-2 grid grid-cols-1 gap-1 text-sm text-muted-foreground md:grid-cols-2">
          <li>list_daily_candidates</li>
          <li>get_briefing</li>
          <li>list_memory</li>
          <li>get_portfolio</li>
          <li>record_decision (write)</li>
          <li>upsert_holding (write)</li>
          <li>remove_holding (write)</li>
          <li>ingest_positions (write)</li>
          <li>advance_day (control)</li>
          <li>ask_stock (AI)</li>
        </ul>
      </section>
    </main>
  );
}

function CopyBlock({ text, multiline }: { text: string; multiline?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="mt-2 flex items-start gap-2">
      <pre
        className={
          "flex-1 overflow-x-auto rounded-md bg-background/60 px-3 py-2 text-xs " +
          (multiline ? "whitespace-pre" : "whitespace-nowrap")
        }
      >
        {text}
      </pre>
      <Button variant="outline" size="sm" onClick={copy}>
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}
