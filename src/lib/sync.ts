// Bidirectional sync between local Dexie DB and the `app_state` JSONB store on
// Lovable Cloud. The web UI keeps writing to Dexie for instant feedback; sync
// pushes the current state to the server so Claude (via /mcp) sees the same
// data, and pull refreshes Dexie from whatever Claude wrote.
import { supabase } from "@/integrations/supabase/client";
import { db } from "./db";
import type {
  Holding,
  MonitoringLogEntry,
  RecommendationRecord,
} from "./types";

export const STATE_KEYS = {
  recommendations: "recommendations",
  monitoringLog: "monitoring_log",
  holdings: "holdings",
  simDate: "sim_current_date",
} as const;

interface AppStateRow {
  key: string;
  value: unknown;
}

async function getAll(): Promise<Record<string, unknown>> {
  const { data, error } = await supabase
    .from("app_state")
    .select("key,value");
  if (error) throw error;
  const out: Record<string, unknown> = {};
  for (const row of (data ?? []) as AppStateRow[]) out[row.key] = row.value;
  return out;
}

async function setKey(key: string, value: unknown): Promise<void> {
  const { error } = await supabase
    .from("app_state")
    .upsert({ key, value: value as never, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function pushLocalToServer(simDate: string): Promise<void> {
  const [recs, log, holds] = await Promise.all([
    db.recommendations.toArray(),
    db.monitoringLog.toArray(),
    db.holdings.toArray(),
  ]);
  await Promise.all([
    setKey(STATE_KEYS.recommendations, recs),
    setKey(STATE_KEYS.monitoringLog, log),
    setKey(STATE_KEYS.holdings, holds),
    setKey(STATE_KEYS.simDate, simDate),
  ]);
}

export interface PulledState {
  simDate: string | null;
  counts: { recommendations: number; monitoringLog: number; holdings: number };
}

export async function pullServerToLocal(): Promise<PulledState> {
  const state = await getAll();
  const recs = (state[STATE_KEYS.recommendations] as RecommendationRecord[] | undefined) ?? [];
  const log = (state[STATE_KEYS.monitoringLog] as MonitoringLogEntry[] | undefined) ?? [];
  const holds = (state[STATE_KEYS.holdings] as Holding[] | undefined) ?? [];
  const simDate = (state[STATE_KEYS.simDate] as string | undefined) ?? null;

  await db.transaction(
    "rw",
    [db.recommendations, db.monitoringLog, db.holdings],
    async () => {
      await Promise.all([
        db.recommendations.clear(),
        db.monitoringLog.clear(),
        db.holdings.clear(),
      ]);
      if (recs.length) await db.recommendations.bulkPut(recs);
      if (log.length) await db.monitoringLog.bulkPut(log);
      if (holds.length) await db.holdings.bulkPut(holds);
    },
  );

  return {
    simDate,
    counts: {
      recommendations: recs.length,
      monitoringLog: log.length,
      holdings: holds.length,
    },
  };
}
