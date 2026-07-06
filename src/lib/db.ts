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
    // CIQ-13: add status index on followup table for Open/Completed queries
    this.version(5)
      .stores({
        recommendations: "id, ticker, status, createdAt, updatedAt",
        monitoringLog: "id, recordId, date, [recordId+date]",
        holdings: "id, ticker, sector",
        rules: "id",
        inbox: "id, ticker, asset_class, analysed_at",
        decisions:
          "id, ticker, asset_class, actioned_at, action_type, decision_label, sub_type",
        followup: "id, ticker, asset_class, followup_at, status",
      })
      .upgrade((tx) =>
        tx
          .table("followup")
          .toCollection()
          .modify((rec: Record<string, unknown>) => {
            // Existing records without status are treated as open
            if (rec["status"] === undefined) rec["status"] = "open";
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

// ── Follow-up Queue workflow helpers (CIQ-13) ────────────────────────────────

/**
 * Mark Reviewed with Reschedule ON:
 * item stays Open, next review date and trigger conditions updated.
 */
export async function markReviewedReschedule(
  id: string,
  newFollowupAt: string,
  triggerConditions: string,
): Promise<void> {
  const rec = await db.followup.get(id);
  if (!rec) return;
  await db.followup.put({
    ...rec,
    status: "open",
    followup_at: newFollowupAt,
    trigger_conditions: triggerConditions,
  });
}

/**
 * Mark Reviewed with Reschedule OFF:
 * item moves to Completed with today's date as completion date.
 */
export async function markReviewedComplete(id: string): Promise<void> {
  const rec = await db.followup.get(id);
  if (!rec) return;
  const today = new Date().toISOString().slice(0, 10);
  await db.followup.put({
    ...rec,
    status: "completed",
    completion_date: today,
  });
}

/**
 * Close: requires a mandatory completion note.
 * Sets status to "completed" and records the note.
 */
export async function closeFollowUp(
  id: string,
  completionNote: string,
): Promise<void> {
  const rec = await db.followup.get(id);
  if (!rec) return;
  const today = new Date().toISOString().slice(0, 10);
  await db.followup.put({
    ...rec,
    status: "completed",
    completion_date: today,
    completion_note: completionNote,
  });
}

/**
 * Update completion note inline (Completed tab editable field).
 */
export async function updateFollowUpCompletionNote(
  id: string,
  note: string,
): Promise<void> {
  const rec = await db.followup.get(id);
  if (!rec) return;
  await db.followup.put({ ...rec, completion_note: note });
}

// ── Queue App Shell seed ─────────────────────────────────────────────────────

const COWORK_SEED_KEY = "convictioniq_cowork_seed_v3";

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
