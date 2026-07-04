import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { readAll, writeKey } from "../state";

interface Rec {
  id: string;
  ticker: string;
  status: string;
  decision: unknown;
  notes: string;
  updatedAt: string;
  originalStudyCard?: { exitPlan?: Record<string, string> };
}

const DECISION_LABELS = ["Accepted", "Rejected", "Modified", "Watch Only", "Closed", "Lesson Learned"] as const;

export default defineTool({
  name: "record_decision",
  title: "Record decision",
  description:
    "Record a decision on a ConvictionIQ recommendation with a mandatory exit plan. Matches the recommendation by ticker (latest open first).",
  inputSchema: {
    ticker: z.string().min(1),
    label: z.enum(DECISION_LABELS),
    notes: z.string().default(""),
    exit_plan: z.object({
      reviewTrigger: z.string().min(1),
      exitAlertLevel: z.string().min(1),
      takeProfitCondition: z.string().min(1),
      avoidReEntryCondition: z.string().min(1),
    }),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ ticker, label, notes, exit_plan }) => {
    const state = await readAll();
    const recs = state.recommendations as Rec[];
    const target = recs
      .filter((r) => r.ticker.toUpperCase() === ticker.toUpperCase())
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    if (!target) {
      return {
        content: [{ type: "text", text: `No recommendation found for ticker ${ticker}` }],
        isError: true,
      };
    }
    const now = new Date().toISOString();
    target.decision = { label, notes, decidedAt: now };
    target.notes = notes;
    target.updatedAt = now;
    if (target.originalStudyCard) target.originalStudyCard.exitPlan = exit_plan;
    if (label === "Closed") target.status = "Closed";
    else if (label === "Watch Only") target.status = "Watching";
    else if (label === "Accepted" || label === "Modified") target.status = "Active";

    await writeKey("recommendations", recs);
    return {
      content: [{ type: "text", text: `Recorded ${label} on ${target.ticker} (id=${target.id}).` }],
      structuredContent: { id: target.id, ticker: target.ticker, label, decidedAt: now },
    };
  },
});
