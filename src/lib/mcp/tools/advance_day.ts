import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { readAll, writeKey } from "../state";

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default defineTool({
  name: "advance_day",
  title: "Advance simulated day",
  description:
    "Advance ConvictionIQ's simulated 'today' by N days. The web UI's monitoring runner will append log entries next time it loads.",
  inputSchema: { days: z.number().int().min(1).max(30).default(1) },
  annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ days }) => {
    const state = await readAll();
    const current = state.sim_current_date ?? new Date().toISOString().slice(0, 10);
    const next = addDays(current, days);
    await writeKey("sim_current_date", next);
    return {
      content: [{ type: "text", text: `Advanced simulated date from ${current} to ${next}.` }],
      structuredContent: { previous: current, current: next },
    };
  },
});
