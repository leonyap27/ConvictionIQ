import { defineTool } from "@lovable.dev/mcp-js";
import { readAll } from "../state";

interface Holding { id: string; ticker: string; positionSize: number; sector: string; entryPrice: number; }

export default defineTool({
  name: "get_portfolio",
  title: "Get portfolio",
  description: "Return current holdings plus sector exposure breakdown.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async () => {
    const state = await readAll();
    const holdings = state.holdings as Holding[];
    const exposureBySector: Record<string, number> = {};
    let totalValue = 0;
    for (const h of holdings) {
      const v = (h.positionSize ?? 0) * (h.entryPrice ?? 0);
      totalValue += v;
      exposureBySector[h.sector] = (exposureBySector[h.sector] ?? 0) + v;
    }
    const pct: Record<string, number> = {};
    for (const [s, v] of Object.entries(exposureBySector)) {
      pct[s] = totalValue > 0 ? Math.round((v / totalValue) * 1000) / 10 : 0;
    }
    const result = { holdings, totalCostBasis: totalValue, sectorExposurePct: pct };
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  },
});
