import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { readAll, writeKey } from "../state";

interface Holding { id: string; ticker: string; positionSize: number; sector: string; entryPrice: number; }

export default defineTool({
  name: "upsert_holding",
  title: "Upsert holding",
  description: "Add or update a single portfolio holding. Matches existing by ticker.",
  inputSchema: {
    ticker: z.string().min(1),
    positionSize: z.number().nonnegative(),
    entryPrice: z.number().nonnegative(),
    sector: z.string().default("Unknown"),
  },
  annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ ticker, positionSize, entryPrice, sector }) => {
    const state = await readAll();
    const holdings = state.holdings as Holding[];
    const idx = holdings.findIndex((h) => h.ticker.toUpperCase() === ticker.toUpperCase());
    if (idx >= 0) {
      holdings[idx] = { ...holdings[idx], positionSize, entryPrice, sector };
    } else {
      holdings.push({
        id: `h_${ticker.toUpperCase()}_${Date.now()}`,
        ticker: ticker.toUpperCase(),
        positionSize,
        entryPrice,
        sector,
      });
    }
    await writeKey("holdings", holdings);
    return { content: [{ type: "text", text: `Upserted ${ticker} (${positionSize} @ ${entryPrice}).` }] };
  },
});
