import { useMemo, useState, useEffect } from "react";
import { liveQuery } from "dexie";
import { db } from "@/lib/db";
import type { ActionedRecord } from "@/lib/types";
import type { ActionType, AssetClass, DecisionLabel, Strategy } from "@/lib/types";
import { BandChip, SignalChip, DecisionChip } from "@/components/Chips";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { BAND_ROW_CLASS } from "@/lib/constants";
import { BookOpen, Eye } from "lucide-react";
import { DecisionDetail } from "./DecisionDetail";

// ── Filter options ────────────────────────────────────────────────────────────

const ASSET_CLASS_OPTIONS: Array<AssetClass | "All"> = [
  "All",
  "US Options",
  "SG Stock",
  "HK Stock",
  "Crypto",
];

const ACTION_TYPE_OPTIONS: Array<ActionType | "All"> = [
  "All",
  "ledger",
  "followup",
];

const DECISION_LABEL_OPTIONS: Array<DecisionLabel | "All"> = [
  "All",
  "Accepted",
  "Modified",
  "Watch Only",
  "Rejected",
  "Closed",
  "Lesson Learned",
];

const SUB_TYPE_OPTIONS: Array<Strategy | "All"> = [
  "All",
  "Cash-Secured Put",
  "Long Equity",
  "Covered Call",
];

type FollowupStatus = "All" | "N/A" | "Pending" | "Overdue";
const FOLLOWUP_STATUS_OPTIONS: FollowupStatus[] = ["All", "N/A", "Pending", "Overdue"];

const ACTION_TYPE_LABEL: Record<ActionType, string> = {
  ledger: "Ledger",
  followup: "Follow-up",
};

const SUB_TYPE_SHORT: Record<Strategy, string> = {
  "Cash-Secured Put": "CSP",
  "Long Equity": "Equity",
  "Covered Call": "CC",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function computeFollowupStatus(r: ActionedRecord): "N/A" | "Pending" | "Overdue" {
  if (!r.followup_at) return "N/A";
  const due = new Date(r.followup_at);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today ? "Overdue" : "Pending";
}

function FollowupBadge({ status }: { status: "N/A" | "Pending" | "Overdue" }) {
  if (status === "N/A") {
    return <span className="text-xs text-muted-foreground/50">—</span>;
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium",
        status === "Overdue"
          ? "bg-destructive/15 text-destructive border border-destructive/30"
          : "bg-primary/10 text-primary border border-primary/30",
      )}
    >
      {status}
    </span>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground border border-border",
      )}
    >
      {children}
    </button>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function LedgerSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-card text-xs uppercase text-muted-foreground">
          <tr>
            {["Ticker", "Asset Class", "Band", "Signal", "Strategy", "Decision", "Score", "Price", "Notes", "Follow-up", "Actioned", ""].map(
              (col) => (
                <th key={col} className="px-3 py-2.5 text-left font-medium tracking-wide">
                  {col}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <tr key={i}>
              <td className="px-3 py-3"><Skeleton className="h-4 w-14" /></td>
              <td className="px-3 py-3"><Skeleton className="h-4 w-20" /></td>
              <td className="px-3 py-3"><Skeleton className="h-5 w-20 rounded-md" /></td>
              <td className="px-3 py-3"><Skeleton className="h-5 w-20 rounded-md" /></td>
              <td className="px-3 py-3"><Skeleton className="h-4 w-10" /></td>
              <td className="px-3 py-3"><Skeleton className="h-5 w-20 rounded-md" /></td>
              <td className="px-3 py-3"><Skeleton className="h-4 w-10" /></td>
              <td className="px-3 py-3"><Skeleton className="h-4 w-16" /></td>
              <td className="px-3 py-3"><Skeleton className="h-4 w-36" /></td>
              <td className="px-3 py-3"><Skeleton className="h-4 w-16" /></td>
              <td className="px-3 py-3"><Skeleton className="h-4 w-20" /></td>
              <td className="px-3 py-3"><Skeleton className="h-6 w-6 rounded" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function LedgerScreen() {
  const [records, setRecords] = useState<ActionedRecord[] | undefined>(undefined);
  useEffect(() => {
    const sub = liveQuery(() =>
      db.decisions.orderBy("actioned_at").reverse().toArray(),
    ).subscribe({
      next: (data) => setRecords(data),
      error: (err) => console.error("Ledger query error:", err),
    });
    return () => sub.unsubscribe();
  }, []);

  const [assetFilter, setAssetFilter] = useState<AssetClass | "All">("All");
  const [actionFilter, setActionFilter] = useState<ActionType | "All">("All");
  const [labelFilter, setLabelFilter] = useState<DecisionLabel | "All">("All");
  const [subTypeFilter, setSubTypeFilter] = useState<Strategy | "All">("All");
  const [followupFilter, setFollowupFilter] = useState<FollowupStatus>("All");

  const [selectedRecord, setSelectedRecord] = useState<ActionedRecord | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!records) return [];
    return records.filter((r: ActionedRecord) => {
      if (assetFilter !== "All" && r.asset_class !== assetFilter) return false;
      if (actionFilter !== "All" && r.action_type !== actionFilter) return false;
      if (labelFilter !== "All" && r.decision_label !== labelFilter) return false;
      if (subTypeFilter !== "All" && r.sub_type !== subTypeFilter) return false;
      if (followupFilter !== "All" && computeFollowupStatus(r) !== followupFilter) return false;
      return true;
    });
  }, [records, assetFilter, actionFilter, labelFilter, subTypeFilter, followupFilter]);

  if (records === undefined) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6">
        <Skeleton className="mb-2 h-7 w-44" />
        <Skeleton className="mb-6 h-4 w-64" />
        <LedgerSkeleton />
      </div>
    );
  }

  const hasActiveFilter =
    assetFilter !== "All" ||
    actionFilter !== "All" ||
    labelFilter !== "All" ||
    subTypeFilter !== "All" ||
    followupFilter !== "All";

  return (
    <>
      <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Decision Ledger</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All actioned analyses — your decision history across every asset class.
          </p>
        </div>

        {/* Filter rows */}
        <div className="mb-4 space-y-2">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground mr-1 w-20 shrink-0">Asset class:</span>
              {ASSET_CLASS_OPTIONS.map((ac) => (
                <FilterPill key={ac} active={assetFilter === ac} onClick={() => setAssetFilter(ac)}>
                  {ac}
                </FilterPill>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground mr-1 w-20 shrink-0">Type:</span>
              {ACTION_TYPE_OPTIONS.map((at) => (
                <FilterPill key={at} active={actionFilter === at} onClick={() => setActionFilter(at)}>
                  {at === "All" ? "All" : ACTION_TYPE_LABEL[at]}
                </FilterPill>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground mr-1 w-20 shrink-0">Decision:</span>
              {DECISION_LABEL_OPTIONS.map((dl) => (
                <FilterPill key={dl} active={labelFilter === dl} onClick={() => setLabelFilter(dl)}>
                  {dl}
                </FilterPill>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground mr-1 w-20 shrink-0">Strategy:</span>
              {SUB_TYPE_OPTIONS.map((st) => (
                <FilterPill key={st} active={subTypeFilter === st} onClick={() => setSubTypeFilter(st)}>
                  {st === "All" ? "All" : SUB_TYPE_SHORT[st]}
                </FilterPill>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground mr-1 w-20 shrink-0">Follow-up:</span>
              {FOLLOWUP_STATUS_OPTIONS.map((fs) => (
                <FilterPill key={fs} active={followupFilter === fs} onClick={() => setFollowupFilter(fs)}>
                  {fs}
                </FilterPill>
              ))}
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
            <BookOpen className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-base font-medium text-muted-foreground">
              No records match your filters
            </p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              Analyses you move from the Inbox will appear here.
              {hasActiveFilter ? " Try clearing your filters." : ""}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-card text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2.5 text-left font-medium tracking-wide">Ticker</th>
                    <th className="px-3 py-2.5 text-left font-medium tracking-wide">Asset Class</th>
                    <th className="px-3 py-2.5 text-left font-medium tracking-wide">Band</th>
                    <th className="px-3 py-2.5 text-left font-medium tracking-wide">Signal</th>
                    <th className="px-3 py-2.5 text-left font-medium tracking-wide">Strategy</th>
                    <th className="px-3 py-2.5 text-left font-medium tracking-wide">Decision</th>
                    <th className="px-3 py-2.5 text-right font-medium tracking-wide">Score</th>
                    <th className="px-3 py-2.5 text-right font-medium tracking-wide">Price</th>
                    <th className="px-3 py-2.5 text-left font-medium tracking-wide">Notes</th>
                    <th className="px-3 py-2.5 text-left font-medium tracking-wide">Follow-up</th>
                    <th className="px-3 py-2.5 text-left font-medium tracking-wide">Actioned</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((r: ActionedRecord) => {
                    const fuStatus = computeFollowupStatus(r);
                    return (
                      <tr
                        key={r.id}
                        className={cn(
                          "transition-colors hover:brightness-110",
                          BAND_ROW_CLASS[r.color_band],
                        )}
                      >
                        <td className="px-3 py-3">
                          <div className="font-mono text-sm font-semibold">{r.ticker}</div>
                          <div className="text-xs text-muted-foreground">{r.exchange}</div>
                        </td>
                        <td className="px-3 py-3 text-sm text-muted-foreground">{r.asset_class}</td>
                        <td className="px-3 py-3">
                          <BandChip band={r.color_band} />
                        </td>
                        <td className="px-3 py-3">
                          <SignalChip signal={r.signal_label} />
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {SUB_TYPE_SHORT[r.sub_type] ?? r.sub_type}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <DecisionChip label={r.decision_label} />
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className="tabular-nums text-sm font-medium">{r.score_at_decision}</span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className="tabular-nums text-xs text-muted-foreground">
                            {r.price_at_decision > 0
                              ? r.price_at_decision >= 1000
                                ? r.price_at_decision.toLocaleString()
                                : r.price_at_decision.toFixed(2)
                              : "—"}
                          </span>
                        </td>
                        <td className="px-3 py-3 max-w-[200px]">
                          <span className="text-xs text-foreground/70 line-clamp-2">
                            {r.decision_notes || (
                              <span className="italic text-muted-foreground/50">no notes</span>
                            )}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <FollowupBadge status={fuStatus} />
                        </td>
                        <td className="px-3 py-3 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                          {formatDate(r.actioned_at)}
                        </td>
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            aria-label={`View details for ${r.ticker}`}
                            onClick={() => {
                              setSelectedRecord(r);
                              setSheetOpen(true);
                            }}
                            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border bg-card/50 px-4 py-2 text-xs text-muted-foreground">
              {filtered.length} record{filtered.length !== 1 ? "s" : ""}
              {hasActiveFilter && records ? ` · filtered from ${records.length} total` : ""}
            </div>
          </div>
        )}
      </div>

      <DecisionDetail
        record={selectedRecord}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
}
