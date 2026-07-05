import { useState, useEffect } from "react";
import { liveQuery } from "dexie";
import { db } from "@/lib/db";
import type { FollowUpRecord } from "@/lib/types";
import { BandChip, SignalChip } from "@/components/Chips";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Bell, CheckCircle2 } from "lucide-react";

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

function daysUntil(iso: string): number {
  const target = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function urgencyClass(followupAt: string): string {
  const today = new Date().toISOString().split("T")[0];
  if (followupAt < today) return "urgency-overdue";
  const soonDate = new Date();
  soonDate.setDate(soonDate.getDate() + 3);
  const soon = soonDate.toISOString().split("T")[0];
  if (followupAt <= soon) return "urgency-soon";
  return "";
}

function DueLabel({ iso }: { iso: string }) {
  const days = daysUntil(iso);
  if (days < 0) {
    return (
      <span className="text-xs font-medium text-destructive-foreground bg-destructive/80 rounded px-1.5 py-0.5">
        Overdue {Math.abs(days)}d
      </span>
    );
  }
  if (days === 0) {
    return (
      <span className="text-xs font-medium text-warning-foreground bg-warning/80 rounded px-1.5 py-0.5">
        Due today
      </span>
    );
  }
  if (days <= 3) {
    return (
      <span className="text-xs font-medium text-warning bg-warning/15 rounded px-1.5 py-0.5">
        Due in {days}d
      </span>
    );
  }
  return (
    <span className="text-xs text-muted-foreground">{formatDate(iso)}</span>
  );
}

function FollowUpSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-4 rounded-lg border border-border bg-card p-4"
        >
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-5 w-20 rounded-md" />
              <Skeleton className="h-5 w-20 rounded-md" />
            </div>
            <Skeleton className="h-3.5 w-64" />
          </div>
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function FollowUpScreen() {
  const [records, setRecords] = useState<FollowUpRecord[] | undefined>(undefined);
  useEffect(() => {
    const sub = liveQuery(() =>
      db.followup.orderBy("followup_at").toArray(),
    ).subscribe({
      next: (data) => setRecords(data),
      error: (err) => console.error("FollowUp query error:", err),
    });
    return () => sub.unsubscribe();
  }, []);

  async function markDone(id: string) {
    await db.followup.delete(id);
  }

  if (records === undefined) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6">
        <Skeleton className="mb-2 h-7 w-44" />
        <Skeleton className="mb-6 h-4 w-64" />
        <FollowUpSkeleton />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Follow-up Queue
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {records.length > 0
            ? `${records.length} ticker${records.length !== 1 ? "s" : ""} pending follow-up · sorted by due date`
            : "No pending follow-ups — queue is clear"}
        </p>
      </div>

      {records.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
          <Bell className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-base font-medium text-muted-foreground">
            Follow-up queue is empty
          </p>
          <p className="mt-1 text-sm text-muted-foreground/70">
            When you add analyses from the Inbox to Follow-up, they appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((r: FollowUpRecord) => (
            <div
              key={r.id}
              className={cn(
                "flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-start transition-colors",
                urgencyClass(r.followup_at),
              )}
            >
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold">
                    {r.ticker}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {r.exchange}
                  </span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">
                    {r.asset_class}
                  </span>
                  <BandChip band={r.color_band} />
                  <SignalChip signal={r.signal_label} />
                </div>

                {r.reminder_note && (
                  <p className="text-sm text-foreground/80">{r.reminder_note}</p>
                )}

                <div className="flex items-center gap-2">
                  <DueLabel iso={r.followup_at} />
                  <span className="text-xs text-muted-foreground">
                    · Analysed {formatDate(r.analysed_at)}
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => markDone(r.id)}
                className="gap-1.5 shrink-0"
                aria-label={`Mark ${r.ticker} follow-up as done`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Mark done
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
