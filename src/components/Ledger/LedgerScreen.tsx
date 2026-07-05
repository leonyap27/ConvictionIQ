import { useMemo, useState, useEffect } from "react";
import { liveQuery } from "dexie";
import { db } from "@/lib/db";
import type { ActionedRecord } from "@/lib/types";
import { BandChip, SignalChip } from "@/components/Chips";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ActionType, AssetClass } from "@/lib/types";
import { BAND_ROW_CLASS } from "@/lib/constants";
import { BookOpen } from "lucide-react";

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

const ACTION_TYPE_LABEL: Record<ActionType, string> = {
  ledger: "Ledger",
  followup: "Follow-up",
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

function LedgerSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-card text-xs uppercase text-muted-foreground">
          <tr>
            {["Ticker", "Asset Class", "Band", "Signal", "Action", "Analyst Note", "Decision Notes", "Actioned"].map(
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
              <td className="px-3 py-3"><Skeleton className="h-4 w-14" /></td>
              <td className="px-3 py-3"><Skeleton className="h-4 w-36" /></td>
              <td className="px-3 py-3"><Skeleton className="h-4 w-40" /></td>
              <td className="px-3 py-3"><Skeleton className="h-4 w-20" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

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

  const filtered = useMemo(() => {
    if (!records) return [];
    return records.filter((r: ActionedRecord) => {
      if (assetFilter !== "All" && r.asset_class !== assetFilter) return false;
      if (actionFilter !== "All" && r.action_type !== actionFilter) return false;
      return true;
    });
  }, [records, assetFilter, actionFilter]);

  if (records === undefined) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6">
        <Skeleton className="mb-2 h-7 w-44" />
        <Skeleton className="mb-6 h-4 w-64" />
        <LedgerSkeleton />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Decision Ledger</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All actioned analyses — your decision history across every asset class.
        </p>
      </div>

      {/* Filter row */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground mr-1">Asset class:</span>
          {ASSET_CLASS_OPTIONS.map((ac) => (
            <FilterPill
              key={ac}
              active={assetFilter === ac}
              onClick={() => setAssetFilter(ac)}
            >
              {ac}
            </FilterPill>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground mr-1">Type:</span>
          {ACTION_TYPE_OPTIONS.map((at) => (
            <FilterPill
              key={at}
              active={actionFilter === at}
              onClick={() => setActionFilter(at)}
            >
              {at === "All" ? "All" : ACTION_TYPE_LABEL[at]}
            </FilterPill>
          ))}
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
            {assetFilter !== "All" || actionFilter !== "All"
              ? " Try clearing your filters."
              : ""}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-card text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 text-left font-medium tracking-wide">
                    Ticker
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium tracking-wide">
                    Asset Class
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium tracking-wide">
                    Band
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium tracking-wide">
                    Signal
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium tracking-wide">
                    Action Type
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium tracking-wide">
                    Analyst Note
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium tracking-wide">
                    Decision Notes
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium tracking-wide">
                    Actioned
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((r: ActionedRecord) => (
                  <tr
                    key={r.id}
                    className={cn(
                      "transition-colors hover:brightness-110",
                      BAND_ROW_CLASS[r.color_band],
                    )}
                  >
                    <td className="px-3 py-3">
                      <div className="font-mono text-sm font-semibold">
                        {r.ticker}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {r.exchange}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm text-muted-foreground">
                      {r.asset_class}
                    </td>
                    <td className="px-3 py-3">
                      <BandChip band={r.color_band} />
                    </td>
                    <td className="px-3 py-3">
                      <SignalChip signal={r.signal_label} />
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                          r.action_type === "ledger"
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {ACTION_TYPE_LABEL[r.action_type as ActionType]}
                      </span>
                    </td>
                    <td className="px-3 py-3 max-w-[240px]">
                      <span className="text-sm text-foreground/70">
                        {(r.analyst_note === "Baseline" || r.analyst_note === "") && (
                          <span className="text-warning mr-1" aria-label="Baseline note">⚠</span>
                        )}
                        {r.analyst_note || (
                          <span className="italic text-muted-foreground/50">—</span>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-3 max-w-[240px]">
                      <span className="text-sm text-foreground/80">
                        {r.decision_notes || (
                          <span className="italic text-muted-foreground/60">
                            no notes
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground tabular">
                      {formatDate(r.actioned_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border bg-card/50 px-4 py-2 text-xs text-muted-foreground">
            {filtered.length} record{filtered.length !== 1 ? "s" : ""}
            {(assetFilter !== "All" || actionFilter !== "All") &&
              ` · filtered from ${records.length} total`}
          </div>
        </div>
      )}
    </div>
  );
}
