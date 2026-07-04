import Dexie, { type Table } from "dexie";
import type {
  Decision,
  Holding,
  MonitoringLogEntry,
  RecommendationRecord,
} from "./types";

class ConvictionDB extends Dexie {
  recommendations!: Table<RecommendationRecord, string>;
  monitoringLog!: Table<MonitoringLogEntry, string>;
  holdings!: Table<Holding, string>;

  constructor() {
    super("convictioniq");
    this.version(1).stores({
      recommendations: "id, ticker, status, createdAt, updatedAt",
      monitoringLog: "id, recordId, date, [recordId+date]",
      holdings: "id, ticker, sector",
    });
  }
}

export const db = new ConvictionDB();

export async function saveRecommendation(
  record: RecommendationRecord,
): Promise<void> {
  await db.recommendations.put(record);
}

export async function updateRecommendationDecision(
  id: string,
  decision: Decision,
): Promise<void> {
  const rec = await db.recommendations.get(id);
  if (!rec) return;
  rec.decision = decision;
  rec.updatedAt = new Date().toISOString();
  if (decision.label === "Closed") rec.status = "Closed";
  else if (decision.label === "Watch Only") rec.status = "Watching";
  else if (decision.label === "Accepted" || decision.label === "Modified")
    rec.status = "Active";
  await db.recommendations.put(rec);
}

export async function updateRecommendationNotes(
  id: string,
  notes: string,
): Promise<void> {
  const rec = await db.recommendations.get(id);
  if (!rec) return;
  rec.notes = notes;
  rec.updatedAt = new Date().toISOString();
  await db.recommendations.put(rec);
}

export async function appendMonitoringLog(
  entry: MonitoringLogEntry,
): Promise<void> {
  await db.monitoringLog.put(entry);
}
