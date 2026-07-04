import { generateAllTickers } from "@/data/mock-tickers";
import { HISTORY_DAYS, OHLC_DAYS } from "./constants";
import { evaluateQualityGate } from "./quality-gate";
import { scoreTicker } from "./scoring";
import type { DailySnapshot, Holding, TickerData } from "./types";

/**
 * Compute snapshots for all tickers as of a given date.
 * Uses a slice of OHLC ending at `date` so we can time-travel for history.
 */
export function computeSnapshotsForDate(
  date: string,
  tickers: TickerData[],
  holdings: Holding[],
  portfolioValue: number,
): DailySnapshot[] {
  return tickers
    .map((t) => {
      // Find the OHLC index whose date == `date`; if not found, use last.
      const idx = t.ohlc.findIndex((b) => b.date === date);
      const historyLength = idx >= 0 ? idx + 1 : t.ohlc.length;
      if (historyLength < 53) return null;
      const baseSnap = scoreTicker(t, {
        asOfDate: date,
        historyLength,
      });
      const gate = evaluateQualityGate({
        snapshot: { ...baseSnap, date },
        ticker: t,
        holdings,
        portfolioValue,
        exitPlan: {
          reviewTrigger: "auto",
          exitAlertLevel: "auto",
          takeProfitCondition: "auto",
          avoidReEntryCondition: "auto",
        },
      });
      return { ...baseSnap, date, gate };
    })
    .filter((s): s is DailySnapshot => s !== null);
}

let cachedTickers: TickerData[] | null = null;
let cachedTickersKey: string = "";

export function getTickers(referenceDate: string): TickerData[] {
  if (cachedTickers && cachedTickersKey === referenceDate) return cachedTickers;
  // Generate OHLC ending 30 days AFTER referenceDate so we can time-travel
  // forward and still find `referenceDate` deep into the series (index >= 60).
  const endDate = new Date(referenceDate);
  endDate.setUTCDate(endDate.getUTCDate() + 30);
  cachedTickers = generateAllTickers(endDate);
  cachedTickersKey = referenceDate;
  return cachedTickers;
}

/** Return list of ISO dates for the last N sessions ending at `date`. */
export function historyDates(currentDate: string, n = HISTORY_DAYS): string[] {
  const out: string[] = [];
  const d = new Date(currentDate);
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d);
    x.setUTCDate(d.getUTCDate() - i);
    out.push(x.toISOString().slice(0, 10));
  }
  return out;
}
