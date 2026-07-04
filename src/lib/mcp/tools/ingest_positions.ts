import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { readAll, writeKey } from "../state";

interface Holding { id: string; ticker: string; positionSize: number; sector: string; entryPrice: number; }

export default defineTool({
  name: "ingest_positions",
  title: "Ingest IBKR positions",
  description:
    "Bulk-ingest positions (typically from an IBKR MCP round-trip). Set `replace: true` to overwrite the entire portfolio; default merges by ticker.",
  inputSchema: {
    replace: z.boolean().default(false),
    positions: z
      .array(
        z.object({
          ticker: z.string().min(1),
          positionSize: z.number().nonnegative(),
          entryPrice: z.number().nonnegative(),
          sector: z.string().default("Unknown"),
        }),
      )
      .min(1),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ replace, positions }) => {
    const state = await readAll();
    const existing = replace ? [] : (state.holdings as Holding[]);
    const byTicker = new Map(existing.map((h) => [h.ticker.toUpperCase(), h]));
    for (const p of positions) {
      const key = p.ticker.toUpperCase();
      const prev = byTicker.get(key);
      byTicker.set(key, {
        id: prev?.id ?? `h_${key}_${Date.now()}`,
        ticker: key,
        positionSize: p.positionSize,
        entryPrice: p.entryPrice,
        sector: p.sector,
      });
    }
    const merged = Array.from(byTicker.values());
    await writeKey("holdings", merged);
    return {
      content: [{ type: "text", text: `Ingested ${positions.length} positions (${merged.length} total, replace=${replace}).` }],
      structuredContent: { total: merged.length, ingested: positions.length, replace },
    };
  },
});
