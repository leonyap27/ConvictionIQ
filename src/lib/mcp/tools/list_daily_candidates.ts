import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { readAll } from "../state";

interface Rec {
  id: string;
  ticker: string;
  status: string;
  scoreAtEntry: number;
  colorBandAtEntry: string;
  signalLabelAtEntry: string;
  createdAt: string;
  updatedAt: string;
  originalStudyCard?: { snapshot?: { compositeScore?: number; colorBand?: string; signalLabel?: string } };
}

export default defineTool({
  name: "list_daily_candidates",
  title: "List daily candidates",
  description:
    "Return the current ranked list of scored setups (recommendations) from ConvictionIQ, optionally filtered by band, signal, or status.",
  inputSchema: {
    band: z.enum(["SuperGreen", "LightGreen", "Pink", "SuperRed"]).optional(),
    signal: z.string().optional(),
    status: z.enum(["Active", "Watching", "Closed"]).optional(),
    limit: z.number().int().min(1).max(200).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ band, signal, status, limit }) => {
    const state = await readAll();
    let recs = state.recommendations as Rec[];
    if (band) recs = recs.filter((r) => r.colorBandAtEntry === band);
    if (signal) recs = recs.filter((r) => r.signalLabelAtEntry === signal);
    if (status) recs = recs.filter((r) => r.status === status);
    recs = recs
      .slice()
      .sort((a, b) => (b.scoreAtEntry ?? 0) - (a.scoreAtEntry ?? 0))
      .slice(0, limit ?? 50);
    return {
      content: [{ type: "text", text: JSON.stringify({ count: recs.length, items: recs }, null, 2) }],
      structuredContent: { items: recs },
    };
  },
});
