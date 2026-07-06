import { useState, useMemo, useEffect } from "react";
import { liveQuery } from "dexie";
import { db } from "@/lib/db";
import { BandChip, SignalChip } from "@/components/Chips";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ActionedRecord, AssetClass, CoWorkAnalysis, FollowUpRecord } from "@/lib/types";
import { toStrategy } from "@/lib/scoring";
import { ChevronDown, ChevronRight, Inbox, MoveRight, Bell } from "lucide-react";

const ASSET_CLASS_ORDER: AssetClass[] = [
  "US Options",
  "SG Stock",
  "HK Stock",
  "Crypto",
];

const ASSET_CLASS_LABEL: Record<AssetClass, string> = {
  "US Options": "US Options",
  "SG Stock": "SG Stocks",
  "HK Stock": "HK Stocks",
  Crypto: "Crypto",
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-SG", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function truncate(text: string, maxLen = 60): string {
  return text.length > maxLen ? text.slice(0, maxLen - 1) + "…" : text;
}

function InboxRow({
  record,
  selected,
  onToggle,
}: {
  record: CoWorkAnalysis;
  selected: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <tr
      className={cn(
        "border-b border-border transition-colors hover:bg-accent/20",
        selected && "bg-accent/30",
      )}
    >
      <td className="w-10 px-3 py-2.5">
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggle(record.id)}
          aria-label={`Select ${record.ticker}`}
        />
      </td>
      <td className="px-3 py-2.5">
        <div className="font-mono text-sm font-semibold leading-tight">
          {record.ticker}
        </div>
        <div className="text-xs text-muted-foreground">{record.exchange}</div>
      </td>
      <td className="px-3 py-2.5">
        <BandChip band={record.color_band} />
      </td>
      <td className="px-3 py-2.5">
        <SignalChip signal={record.signal_label} />
      </td>
      <td className="px-3 py-2.5 max-w-[280px]">
        <span className="text-sm text-foreground/90">
          {truncate(record.suggested_action, 70)}
        </span>
      </td>
      <td className="px-3 py-2.5 text-xs text-muted-foreground tabular">
        {formatDate(record.analysed_at)}
      </td>
    </tr>
  );
}

function AssetClassSection({
  assetClass,
  records,
  selectedIds,
  onToggle,
}: {
  assetClass: AssetClass;
  records: CoWorkAnalysis[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const allSelected = records.every((r) => selectedIds.has(r.id));
  const someSelected = records.some((r) => selectedIds.has(r.id));

  function toggleAll() {
    if (allSelected) {
      records.forEach((r) => selectedIds.has(r.id) && onToggle(r.id));
    } else {
      records.forEach((r) => !selectedIds.has(r.id) && onToggle(r.id));
    }
  }

  return (
    <div className="mb-4 overflow-hidden rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center gap-2 bg-card px-4 py-2.5 text-left hover:bg-accent/30 transition-colors"
        aria-expanded={!collapsed}
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        )}
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {ASSET_CLASS_LABEL[assetClass]}
        </span>
        <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground tabular">
          {records.length}
        </span>
      </button>

      {!collapsed && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-card/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="w-10 px-3 py-2">
                  <Checkbox
                    checked={allSelected}
                    ref={(el) => {
                      if (el) {
                        const input = el as unknown as HTMLInputElement;
                        input.indeterminate = someSelected && !allSelected;
                      }
                    }}
                    onCheckedChange={toggleAll}
                    aria-label={`Select all ${ASSET_CLASS_LABEL[assetClass]}`}
                  />
                </th>
                <th className="px-3 py-2 text-left font-medium tracking-wide">
                  Ticker
                </th>
                <th className="px-3 py-2 text-left font-medium tracking-wide">
                  Band
                </th>
                <th className="px-3 py-2 text-left font-medium tracking-wide">
                  Signal
                </th>
                <th className="px-3 py-2 text-left font-medium tracking-wide">
                  Suggested Action
                </th>
                <th className="px-3 py-2 text-left font-medium tracking-wide">
                  Analysed
                </th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <InboxRow
                  key={r.id}
                  record={r}
                  selected={selectedIds.has(r.id)}
                  onToggle={onToggle}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function InboxSkeleton() {
  return (
    <div className="space-y-4">
      {["US Options", "SG Stocks", "HK Stocks", "Crypto"].map((label) => (
        <div key={label} className="overflow-hidden rounded-lg border border-border">
          <div className="flex items-center gap-2 bg-card px-4 py-2.5">
            <Skeleton className="h-3 w-3" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="divide-y divide-border">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-3">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-5 w-20 rounded-md" />
                <Skeleton className="h-5 w-20 rounded-md" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-20 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function InboxScreen() {
  const [records, setRecords] = useState<CoWorkAnalysis[] | undefined>(undefined);
  useEffect(() => {
    const sub = liveQuery(() => db.inbox.toArray()).subscribe({
      next: (data) => setRecords(data),
      error: (err) => console.error("Inbox query error:", err),
    });
    return () => sub.unsubscribe();
  }, []);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  function toggleId(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const grouped = useMemo<Record<AssetClass, CoWorkAnalysis[]>>(() => {
    const base: Record<AssetClass, CoWorkAnalysis[]> = {
      "US Options": [],
      "SG Stock": [],
      "HK Stock": [],
      Crypto: [],
    };
    if (!records) return base;
    for (const r of records) {
      (base[r.asset_class] as CoWorkAnalysis[]).push(r);
    }
    return base;
  }, [records]);

  const selectedList = useMemo(
    () => (records ?? []).filter((r: CoWorkAnalysis) => selectedIds.has(r.id)),
    [records, selectedIds],
  );

  async function moveToLedger() {
    const now = new Date().toISOString().slice(0, 10);
    for (const r of selectedList) {
      const actioned: ActionedRecord = {
        ...r,
        actioned_at: now,
        action_type: "ledger",
        decision_notes: "",
        sub_type: toStrategy(r.signal_label),
        decision_label: "Accepted",
        score_at_decision: 0,
        price_at_decision: 0,
        notes_log: [],
      };
      await db.decisions.add(actioned);
      await db.inbox.delete(r.id);
    }
    const count = selectedList.length;
    setSelectedIds(new Set());
    setActionFeedback(`${count} record${count !== 1 ? "s" : ""} moved to Decision Ledger`);
    setTimeout(() => setActionFeedback(null), 3500);
  }

  async function addToFollowUp() {
    const raw = localStorage.getItem("convictioniq_queue_settings_v1");
    const offset = raw
      ? (JSON.parse(raw) as { defaultFollowupOffset?: number }).defaultFollowupOffset ?? 7
      : 7;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + offset);
    const followup_at = futureDate.toISOString().slice(0, 10);

    for (const r of selectedList) {
      const fu: FollowUpRecord = {
        ...r,
        followup_at,
        reminder_note: "",
        // CIQ-13: new workflow fields — undefined until CoWork supplies them
        status: "open",
        trigger_conditions: undefined,
        completion_date: undefined,
        completion_note: undefined,
        sub_type: undefined,
        strategy: undefined,
        decision_label: undefined,
        expected_outcome: undefined,
      };
      await db.followup.add(fu);
      await db.inbox.delete(r.id);
    }
    const count = selectedList.length;
    setSelectedIds(new Set());
    setActionFeedback(`${count} record${count !== 1 ? "s" : ""} added to Follow-up Queue`);
    setTimeout(() => setActionFeedback(null), 3500);
  }

  const totalPending = records?.length ?? 0;
  const nonEmptySections = ASSET_CLASS_ORDER.filter(
    (ac) => grouped[ac].length > 0,
  );

  if (records === undefined) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6">
        <div className="mb-6">
          <Skeleton className="h-7 w-56 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>
        <InboxSkeleton />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6 pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Analysis Inbox
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {totalPending > 0
            ? `${totalPending} record${totalPending !== 1 ? "s" : ""} pending review · grouped by asset class`
            : "No pending records — all analyses have been actioned"}
        </p>
      </div>

      {actionFeedback && (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm text-foreground"
        >
          <span className="h-2 w-2 rounded-full bg-primary" />
          {actionFeedback}
        </div>
      )}

      {totalPending === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
          <Inbox className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-base font-medium text-muted-foreground">
            Inbox is clear
          </p>
          <p className="mt-1 text-sm text-muted-foreground/70">
            All analyses have been moved to the Ledger or Follow-up Queue.
          </p>
        </div>
      ) : (
        <div>
          {nonEmptySections.map((ac) => (
            <AssetClassSection
              key={ac}
              assetClass={ac}
              records={grouped[ac]}
              selectedIds={selectedIds}
              onToggle={toggleId}
            />
          ))}
        </div>
      )}

      {/* Sticky bulk action bar */}
      {selectedIds.size > 0 && (
        <div
          role="toolbar"
          aria-label="Bulk actions"
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur"
        >
          <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3 md:px-6">
            <span className="text-sm font-medium text-foreground">
              {selectedIds.size} selected
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear selection
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={addToFollowUp}
                className="gap-1.5"
              >
                <Bell className="h-3.5 w-3.5" />
                Add to Follow-up ({selectedIds.size})
              </Button>
              <Button
                size="sm"
                onClick={moveToLedger}
                className="gap-1.5"
              >
                <MoveRight className="h-3.5 w-3.5" />
                Move to Ledger ({selectedIds.size})
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
