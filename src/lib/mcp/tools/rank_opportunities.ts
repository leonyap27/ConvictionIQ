import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { readKey } from "../state";
import { generateAllTickers } from "@/data/mock-tickers";
import { scoreTicker } from "@/lib/scoring";
import type { Theme } from "@/lib/types";

export default defineTool({
  name: "rank_opportunities",
  title: "Rank daily opportunities",
  description:
    "Score and rank the full ticker pool for today's opportunity shortlist. Applies optional theme, minimum score, and exclusion filters. Returns up to maxDisplay tickers sorted by composite score descending.",
  inputSchema: {
    themes: z.array(z.string()).optional(),
    minScore: z.number().int().min(0).max(100).optional(),
    excludeTickers: z.array(z.string()).optional(),
    maxDisplay: z.number().int().min(1).max(50).optional(),
    asOfDate: z.string().optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ themes, minScore, excludeTickers, maxDisplay, asOfDate }) => {
    const simDate = (await readKey("sim_current_date")) as string | null;
    const date = asOfDate ?? simDate ?? new Date().toISOString().slice(0, 10);
    const referenceDate = new Date(date);

    const allTickers = generateAllTickers(referenceDate);
    const excluded = new Set((excludeTickers ?? []).map((t) => t.toUpperCase()));
    const themeSet = themes && themes.length > 0 ? new Set(themes as Theme[]) : null;
    const min = minScore ?? 0;
    const limit = maxDisplay ?? 15;

    const scored = allTickers
      .filter((td) => !excluded.has(td.ticker))
      .filter((td) => !themeSet || themeSet.has(td.theme))
      .map((td) => {
        const snap = scoreTicker(td, { asOfDate: date });
        return { companyName: td.companyName, theme: td.theme, ...snap };
      })
      .filter((s) => s.compositeScore >= min)
      .sort((a, b) => b.compositeScore - a.compositeScore)
      .slice(0, limit)
      .map(({ ticker, companyName, theme, compositeScore, colorBand, signalLabel, price, regime }) => ({
        ticker,
        companyName,
        theme,
        compositeScore,
        colorBand,
        signalLabel,
        price,
        regime,
      }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ date, count: scored.length, opportunities: scored }, null, 2),
        },
      ],
      structuredContent: { date, opportunities: scored },
    };
  },
});
