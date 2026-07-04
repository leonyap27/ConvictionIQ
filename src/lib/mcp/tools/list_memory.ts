import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { readAll } from "../state";

interface Rec {
  id: string;
  ticker: string;
  status: string;
  decision: { label: string; notes: string; decidedAt: string } | null;
  updatedAt: string;
}

export default defineTool({
  name: "list_memory",
  title: "List memory (decisions)",
  description: "Return recorded decisions (Act/Watch/Skip/Modified/etc.) with optional filters.",
  inputSchema: {
    ticker: z.string().optional(),
    decision: z.string().optional(),
    since: z.string().optional(),
    limit: z.number().int().min(1).max(500).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ ticker, decision, since, limit }) => {
    const state = await readAll();
    let items = (state.recommendations as Rec[]).filter((r) => r.decision !== null);
    if (ticker) items = items.filter((r) => r.ticker.toUpperCase() === ticker.toUpperCase());
    if (decision) items = items.filter((r) => r.decision?.label === decision);
    if (since) items = items.filter((r) => (r.decision?.decidedAt ?? "") >= since);
    items = items
      .slice()
      .sort((a, b) => (b.decision?.decidedAt ?? "").localeCompare(a.decision?.decidedAt ?? ""))
      .slice(0, limit ?? 100);
    return {
      content: [{ type: "text", text: JSON.stringify({ count: items.length, items }, null, 2) }],
      structuredContent: { items },
    };
  },
});
