import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "../../ai-gateway.server";
import { readAll } from "../state";

interface Rec {
  ticker: string;
  status: string;
  scoreAtEntry: number;
  colorBandAtEntry: string;
  signalLabelAtEntry: string;
  originalStudyCard?: {
    snapshot?: Record<string, unknown>;
    whyItPassed?: { text: string }[];
    risks?: { text: string }[];
    exitPlan?: Record<string, string>;
  };
}
interface Log { recordId: string; ticker?: string; date: string; scoreDelta: number; summary: string; }

export default defineTool({
  name: "ask_stock",
  title: "Ask about a stock",
  description:
    "Ask a natural-language question about a ticker. Answered by Lovable AI grounded in the ConvictionIQ study card (scores, ichimoku, quality gate, deterministic reasoning bullets) and recent monitoring log.",
  inputSchema: {
    ticker: z.string().min(1),
    question: z.string().min(3),
  },
  annotations: { readOnlyHint: true, idempotentHint: false, openWorldHint: true },
  handler: async ({ ticker, question }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { content: [{ type: "text", text: "LOVABLE_API_KEY not configured." }], isError: true };
    }
    const state = await readAll();
    const recs = (state.recommendations as Rec[]).filter(
      (r) => r.ticker.toUpperCase() === ticker.toUpperCase(),
    );
    if (!recs.length) {
      return {
        content: [{ type: "text", text: `No ConvictionIQ data for ${ticker}. Ask about a scored ticker.` }],
        isError: true,
      };
    }
    const rec = recs.sort((a, b) => (b.scoreAtEntry ?? 0) - (a.scoreAtEntry ?? 0))[0];
    const log = (state.monitoring_log as Log[])
      .filter((l) => (l.ticker ?? "").toUpperCase() === ticker.toUpperCase() || l.recordId === (rec as unknown as { id: string }).id)
      .slice(-14);

    const context = {
      ticker: rec.ticker,
      status: rec.status,
      scoreAtEntry: rec.scoreAtEntry,
      band: rec.colorBandAtEntry,
      signal: rec.signalLabelAtEntry,
      snapshot: rec.originalStudyCard?.snapshot,
      whyItPassed: rec.originalStudyCard?.whyItPassed?.map((b) => b.text),
      risks: rec.originalStudyCard?.risks?.map((b) => b.text),
      exitPlan: rec.originalStudyCard?.exitPlan,
      recentLog: log,
    };

    const gateway = createLovableAiGatewayProvider(apiKey);
    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      messages: [
        {
          role: "system",
          content:
            "You are the ConvictionIQ analyst. Answer only using the JSON context provided. Be concise, cite the specific score/ichimoku/gate inputs, and never invent live prices or news. If the context is insufficient, say so.",
        },
        {
          role: "user",
          content: `Question about ${ticker}: ${question}\n\nContext JSON:\n${JSON.stringify(context, null, 2)}`,
        },
      ],
    });

    return {
      content: [{ type: "text", text }],
      structuredContent: { answer: text, contextUsed: context },
    };
  },
});
