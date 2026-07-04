import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/db";
import {
  computeSnapshotsForDate,
  getTickers,
  historyDates,
} from "@/lib/snapshots";
import { useAppStore } from "@/lib/store";
import type { DailySnapshot, Holding, TickerData } from "@/lib/types";

export function portfolioValue(holdings: Holding[]): number {
  return holdings.reduce((s, h) => s + h.positionSize * h.entryPrice, 0);
}

export function useHoldings() {
  return useQuery({
    queryKey: ["holdings"],
    queryFn: async () => (await db.holdings.toArray()) as Holding[],
  });
}

export function useTickers(): TickerData[] {
  const currentDate = useAppStore((s) => s.currentDate);
  // Deterministic, so we can compute synchronously and memoize via cache.
  return getTickers(currentDate);
}

export function useSnapshots() {
  const currentDate = useAppStore((s) => s.currentDate);
  const tickers = useTickers();
  const { data: holdings = [] } = useHoldings();
  const pv = portfolioValue(holdings);
  return useQuery({
    queryKey: ["snapshots", currentDate, holdings.length, pv],
    queryFn: async (): Promise<DailySnapshot[]> => {
      return computeSnapshotsForDate(currentDate, tickers, holdings, pv);
    },
  });
}

export function useSnapshotHistory(ticker: string, days: number) {
  const currentDate = useAppStore((s) => s.currentDate);
  const tickers = useTickers();
  const { data: holdings = [] } = useHoldings();
  const pv = portfolioValue(holdings);
  return useQuery({
    queryKey: ["snapshotHistory", ticker, currentDate, days],
    queryFn: async (): Promise<DailySnapshot[]> => {
      const dates = historyDates(currentDate, days);
      const singleTicker = tickers.filter((t) => t.ticker === ticker);
      const out: DailySnapshot[] = [];
      for (const d of dates) {
        const snaps = computeSnapshotsForDate(d, singleTicker, holdings, pv);
        if (snaps[0]) out.push(snaps[0]);
      }
      return out;
    },
    enabled: !!ticker,
  });
}

export function useRecommendations() {
  return useQuery({
    queryKey: ["recommendations"],
    queryFn: async () =>
      (await db.recommendations.orderBy("updatedAt").reverse().toArray()),
  });
}

export function useRecommendation(id: string | null) {
  return useQuery({
    queryKey: ["recommendation", id],
    queryFn: async () => (id ? await db.recommendations.get(id) : null),
    enabled: !!id,
  });
}

export function useMonitoringLog(recordId: string | null) {
  return useQuery({
    queryKey: ["monitoringLog", recordId],
    queryFn: async () => {
      if (!recordId) return [];
      return await db.monitoringLog
        .where("recordId")
        .equals(recordId)
        .sortBy("date");
    },
    enabled: !!recordId,
  });
}
