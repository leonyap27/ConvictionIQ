import Dexie, { type Table } from "dexie";
import type {
  ActionedRecord,
  CoWorkAnalysis,
  Decision,
  FollowUpRecord,
  Holding,
  MonitoringLogEntry,
  RecommendationRecord,
  RuleSet,
} from "./types";

class ConvictionDB extends Dexie {
  recommendations!: Table<RecommendationRecord, string>;
  monitoringLog!: Table<MonitoringLogEntry, string>;
  holdings!: Table<Holding, string>;
  rules!: Table<RuleSet, string>;
  // Queue App Shell tables (v3)
  inbox!: Table<CoWorkAnalysis, string>;
  decisions!: Table<ActionedRecord, string>;
  followup!: Table<FollowUpRecord, string>;

  constructor() {
    super("convictioniq");
    this.version(1).stores({
      recommendations: "id, ticker, status, createdAt, updatedAt",
      monitoringLog: "id, recordId, date, [recordId+date]",
      holdings: "id, ticker, sector",
    });
    this.version(2).stores({
      recommendations: "id, ticker, status, createdAt, updatedAt",
      monitoringLog: "id, recordId, date, [recordId+date]",
      holdings: "id, ticker, sector",
      rules: "id",
    });
    this.version(3).stores({
      recommendations: "id, ticker, status, createdAt, updatedAt",
      monitoringLog: "id, recordId, date, [recordId+date]",
      holdings: "id, ticker, sector",
      rules: "id",
      inbox: "id, ticker, asset_class, analysed_at",
      decisions: "id, ticker, asset_class, actioned_at, action_type",
      followup: "id, ticker, asset_class, followup_at",
    });
    this.version(4)
      .stores({
        recommendations: "id, ticker, status, createdAt, updatedAt",
        monitoringLog: "id, recordId, date, [recordId+date]",
        holdings: "id, ticker, sector",
        rules: "id",
        inbox: "id, ticker, asset_class, analysed_at",
        decisions:
          "id, ticker, asset_class, actioned_at, action_type, decision_label, sub_type",
        followup: "id, ticker, asset_class, followup_at",
      })
      .upgrade((tx) =>
        tx
          .table("decisions")
          .toCollection()
          .modify((rec: Record<string, unknown>) => {
            if (rec["sub_type"] === undefined) rec["sub_type"] = "Long Equity";
            if (rec["decision_label"] === undefined)
              rec["decision_label"] = "Accepted";
            if (rec["score_at_decision"] === undefined)
              rec["score_at_decision"] = 0;
            if (rec["price_at_decision"] === undefined)
              rec["price_at_decision"] = 0;
            if (rec["notes_log"] === undefined) rec["notes_log"] = [];
          }),
      );
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

export async function updateDecisionNotes(
  id: string,
  note: string,
): Promise<void> {
  const rec = await db.decisions.get(id);
  if (!rec) return;
  const entry = `${new Date().toISOString()}: ${note}`;
  rec.notes_log = [...(rec.notes_log ?? []), entry];
  rec.decision_notes = note;
  await db.decisions.put(rec);
}

// ── Queue App Shell seed ─────────────────────────────────────────────────────

const COWORK_SEED_KEY = "convictioniq_cowork_seed_v2";

export async function seedCoWorkData(): Promise<void> {
  if (localStorage.getItem(COWORK_SEED_KEY)) return;

  const { MOCK_INBOX, MOCK_DECISIONS, MOCK_FOLLOWUP } = await import(
    "@/data/mock-cowork"
  );

  await db.inbox.bulkPut(MOCK_INBOX);
  await db.decisions.bulkPut(MOCK_DECISIONS);
  await db.followup.bulkPut(MOCK_FOLLOWUP);

  localStorage.setItem(COWORK_SEED_KEY, "1");
}
