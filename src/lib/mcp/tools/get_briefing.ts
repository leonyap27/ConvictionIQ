import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { readAll } from "../state";

interface Rec { id: string; ticker: string; status: string; scoreAtEntry: number; colorBandAtEntry: string; }
interface Log { recordId: string; date: string; scoreDelta: number; colorBandChanged: boolean; signalLabelChanged: boolean; exitAlertActive: boolean; summary: string; }

export default defineTool({
  name: "get_briefing",
  title: "Get briefing",
  description: "Portfolio health summary: active positions, exit alerts, and score movers for the current simulated date.",
  inputSchema: { date: z.string().optional() },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ date }) => {
    const state = await readAll();
    const recs = state.recommendations as Rec[];
    const log = state.monitoring_log as Log[];
    const targetDate = date ?? state.sim_current_date;

    const active = recs.filter((r) => r.status === "Active");
    const watching = recs.filter((r) => r.status === "Watching");
    const todaysLog = targetDate ? log.filter((l) => l.date === targetDate) : log;
    const exitAlerts = todaysLog.filter((l) => l.exitAlertActive);
    const bandChanges = todaysLog.filter((l) => l.colorBandChanged || l.signalLabelChanged);
    const movers = todaysLog
      .slice()
      .sort((a, b) => Math.abs(b.scoreDelta) - Math.abs(a.scoreDelta))
      .slice(0, 10);

    const summary = {
      date: targetDate,
      activeCount: active.length,
      watchingCount: watching.length,
      exitAlerts,
      bandChanges,
      topMovers: movers,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      structuredContent: summary,
    };
  },
});
