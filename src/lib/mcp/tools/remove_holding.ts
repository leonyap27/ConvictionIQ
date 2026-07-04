import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { readAll, writeKey } from "../state";

interface Holding { id: string; ticker: string; }

export default defineTool({
  name: "remove_holding",
  title: "Remove holding",
  description: "Remove a portfolio holding by ticker.",
  inputSchema: { ticker: z.string().min(1) },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ ticker }) => {
    const state = await readAll();
    const holdings = state.holdings as Holding[];
    const filtered = holdings.filter((h) => h.ticker.toUpperCase() !== ticker.toUpperCase());
    await writeKey("holdings", filtered);
    return {
      content: [{ type: "text", text: `Removed ${holdings.length - filtered.length} holding(s) for ${ticker}.` }],
    };
  },
});
