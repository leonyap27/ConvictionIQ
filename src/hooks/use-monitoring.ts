import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { db } from "@/lib/db";
import { useSnapshots } from "./use-data";
import type { DailySnapshot, MonitoringLogEntry } from "@/lib/types";

/**
 * Re-evaluates all Active/Watching records against today's snapshots and
 * writes one monitoring log entry per record per day (idempotent by [recordId+date]).
 */
export function useMonitoringRunner(): void {
  const currentDate = useAppStore((s) => s.currentDate);
  const { data: snapshots } = useSnapshots();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!snapshots) return;
    (async () => {
      const snapByTicker = new Map<string, DailySnapshot>(
        snapshots.map((s) => [s.ticker, s]),
      );
      const active = await db.recommendations
        .filter((r) => r.status !== "Closed")
        .toArray();
      let wroteAny = false;
      for (const rec of active) {
        const snap = snapByTicker.get(rec.ticker);
        if (!snap) continue;
        // Idempotent by [recordId+date]
        const existing = await db.monitoringLog
          .where("[recordId+date]")
          .equals([rec.id, currentDate])
          .first();
        if (existing) continue;

        const prev = await db.monitoringLog
          .where("recordId")
          .equals(rec.id)
          .reverse()
          .sortBy("date");
        const previous = prev[0];
        const prevScore = previous?.compositeScore ?? rec.scoreAtEntry;
        const prevBand = previous?.colorBand ?? rec.colorBandAtEntry;
        const prevSignal = previous?.signalLabel ?? rec.signalLabelAtEntry;
        const prevPremium = previous?.premium ?? snap.premium;
        const scoreDelta = snap.compositeScore - prevScore;
        const premiumChangePct =
          prevPremium > 0
            ? ((snap.premium - prevPremium) / prevPremium) * 100
            : 0;

        const changes: string[] = [];
        if (scoreDelta !== 0)
          changes.push(`score ${scoreDelta > 0 ? "+" : ""}${scoreDelta}`);
        if (prevBand !== snap.colorBand)
          changes.push(`band ${prevBand} → ${snap.colorBand}`);
        if (prevSignal !== snap.signalLabel)
          changes.push(`signal ${prevSignal} → ${snap.signalLabel}`);
        if (snap.exitAlertActive) changes.push("EXIT ALERT triggered");
        const summary = changes.length
          ? changes.join(", ")
          : "No material change";

        const entry: MonitoringLogEntry = {
          id: crypto.randomUUID(),
          recordId: rec.id,
          date: currentDate,
          compositeScore: snap.compositeScore,
          scoreDelta,
          colorBand: snap.colorBand,
          colorBandChanged: prevBand !== snap.colorBand,
          signalLabel: snap.signalLabel,
          signalLabelChanged: prevSignal !== snap.signalLabel,
          kijunDistancePct: snap.kijunDistancePct,
          kumoDistancePct: snap.kumoDistancePct,
          premium: snap.premium,
          premiumChangePct,
          exitAlertActive: snap.exitAlertActive,
          summary,
        };
        await db.monitoringLog.put(entry);
        wroteAny = true;
      }
      if (wroteAny) {
        await queryClient.invalidateQueries({ queryKey: ["monitoringLog"] });
      }
    })();
  }, [currentDate, snapshots, queryClient]);
}
