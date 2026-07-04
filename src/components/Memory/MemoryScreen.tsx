import { useMemo, useState } from "react";
import { useRecommendations, useSnapshots, useMonitoringLog } from "@/hooks/use-data";
import { BandChip, SignalChip } from "@/components/Chips";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  ColorBand,
  RecommendationRecord,
  RecommendationStatus,
  SignalLabel,
} from "@/lib/types";
import { format } from "date-fns";
import { BAND_LABEL } from "@/lib/constants";
import { updateRecommendationNotes } from "@/lib/db";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function MemoryScreen() {
  const { data: recommendations = [], isLoading } = useRecommendations();
  const { data: snapshots } = useSnapshots();
  const [openRecord, setOpenRecord] = useState<RecommendationRecord | null>(
    null,
  );
  const [status, setStatus] = useState<RecommendationStatus | "All">("All");
  const [band, setBand] = useState<ColorBand | "All">("All");
  const [signal, setSignal] = useState<SignalLabel | "All">("All");

  const snapByTicker = useMemo(
    () => new Map((snapshots ?? []).map((s) => [s.ticker, s])),
    [snapshots],
  );

  const filtered = useMemo(() => {
    return recommendations
      .filter((r) => status === "All" || r.status === status)
      .filter((r) => {
        if (band === "All") return true;
        const snap = snapByTicker.get(r.ticker);
        return (snap?.colorBand ?? r.colorBandAtEntry) === band;
      })
      .filter((r) => {
        if (signal === "All") return true;
        const snap = snapByTicker.get(r.ticker);
        return (snap?.signalLabel ?? r.signalLabelAtEntry) === signal;
      });
  }, [recommendations, status, band, signal, snapByTicker]);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 md:px-6">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Recommendation Memory
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every saved decision, with the score delta since entry.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={status} onValueChange={(v) => setStatus(v as never)}>
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["All", "Active", "Watching", "Closed"].map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "All" ? "All statuses" : s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={band} onValueChange={(v) => setBand(v as never)}>
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All bands</SelectItem>
              {(
                ["SuperGreen", "LightGreen", "Pink", "SuperRed"] as ColorBand[]
              ).map((b) => (
                <SelectItem key={b} value={b}>
                  {BAND_LABEL[b]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={signal} onValueChange={(v) => setSignal(v as never)}>
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(
                [
                  "All",
                  "SELL PUT",
                  "WATCH",
                  "WATCHLIST",
                  "AVOID",
                  "EXIT ALERT",
                ] as (SignalLabel | "All")[]
              ).map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "All" ? "All signals" : s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No recommendations saved yet — start from the Daily Screen.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-card text-xs uppercase text-muted-foreground">
                <tr>
                  <Th>Ticker</Th>
                  <Th>Date</Th>
                  <Th>Strategy</Th>
                  <Th className="text-right">Entry Score</Th>
                  <Th className="text-right">Current</Th>
                  <Th className="text-right">Δ</Th>
                  <Th>Band</Th>
                  <Th>Signal</Th>
                  <Th>Status</Th>
                  <Th>Decision</Th>
                  <Th>Updated</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((rec) => {
                  const snap = snapByTicker.get(rec.ticker);
                  const delta = snap
                    ? snap.compositeScore - rec.scoreAtEntry
                    : 0;
                  return (
                    <tr
                      key={rec.id}
                      className="cursor-pointer hover:bg-accent/40"
                      onClick={() => setOpenRecord(rec)}
                    >
                      <td className="px-3 py-2.5 font-mono font-semibold">
                        {rec.ticker}
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        {format(new Date(rec.createdAt), "MMM d yyyy")}
                      </td>
                      <td className="px-3 py-2.5 text-xs">{rec.strategy}</td>
                      <td className="px-3 py-2.5 text-right tabular">
                        {rec.scoreAtEntry}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular">
                        {snap?.compositeScore ?? "—"}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2.5 text-right tabular font-semibold",
                          delta > 0 && "text-band-lightgreen-fg",
                          delta < 0 && "text-band-pink-fg",
                        )}
                      >
                        {delta > 0 ? "+" : ""}
                        {delta}
                      </td>
                      <td className="px-3 py-2.5">
                        <BandChip
                          band={snap?.colorBand ?? rec.colorBandAtEntry}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <SignalChip
                          signal={snap?.signalLabel ?? rec.signalLabelAtEntry}
                        />
                      </td>
                      <td className="px-3 py-2.5 text-xs">{rec.status}</td>
                      <td className="px-3 py-2.5 text-xs">
                        {rec.decision?.label ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {format(new Date(rec.updatedAt), "MMM d, HH:mm")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <RecordDetailDialog
        record={openRecord}
        onClose={() => setOpenRecord(null)}
      />
    </div>
  );
}

function Th({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn("px-3 py-2.5 text-left font-medium tracking-wide", className)}
    >
      {children}
    </th>
  );
}

function RecordDetailDialog({
  record,
  onClose,
}: {
  record: RecommendationRecord | null;
  onClose: () => void;
}) {
  const { data: log = [] } = useMonitoringLog(record?.id ?? null);
  const [notes, setNotes] = useState(record?.notes ?? "");
  const queryClient = useQueryClient();

  useMemo(() => {
    setNotes(record?.notes ?? "");
  }, [record]);

  if (!record) return null;
  const sc = record.originalStudyCard;

  const save = async () => {
    await updateRecommendationNotes(record.id, notes);
    await queryClient.invalidateQueries({ queryKey: ["recommendations"] });
    toast.success("Notes saved");
  };

  return (
    <Dialog open={!!record} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono">
            {record.ticker} — {record.strategy}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <section>
            <div className="flex items-baseline gap-3">
              <div className="text-3xl font-bold tabular">
                {sc.snapshot.compositeScore}
              </div>
              <BandChip band={sc.snapshot.colorBand} />
              <SignalChip signal={sc.snapshot.signalLabel} />
              <span className="ml-auto text-xs text-muted-foreground">
                Entered {format(new Date(record.createdAt), "MMM d yyyy")}
              </span>
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Why it passed
            </h3>
            <ul className="space-y-1.5">
              {sc.whyItPassed.map((b, i) => (
                <li
                  key={i}
                  className="rounded-md border border-border/60 bg-card/40 p-2 text-sm"
                >
                  <span className="mr-2 text-xs font-medium uppercase text-muted-foreground">
                    {b.input}:
                  </span>
                  {b.text}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Risks
            </h3>
            <ul className="space-y-1.5">
              {sc.risks.map((b, i) => (
                <li
                  key={i}
                  className="rounded-md border border-border/60 bg-card/40 p-2 text-sm"
                >
                  <span className="mr-2 text-xs font-medium uppercase text-muted-foreground">
                    {b.input}:
                  </span>
                  {b.text}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Exit Plan
            </h3>
            <dl className="grid gap-1.5 text-sm">
              {(
                [
                  ["Review Trigger", sc.exitPlan.reviewTrigger],
                  ["Exit Alert Level", sc.exitPlan.exitAlertLevel],
                  ["Take-Profit", sc.exitPlan.takeProfitCondition],
                  ["Avoid Re-Entry", sc.exitPlan.avoidReEntryCondition],
                ] as const
              ).map(([k, v]) => (
                <div
                  key={k}
                  className="grid grid-cols-[160px_1fr] gap-3 rounded-md border border-border/60 bg-card/40 p-2"
                >
                  <dt className="text-xs uppercase text-muted-foreground">
                    {k}
                  </dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Daily change log
            </h3>
            {log.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-4 text-xs text-muted-foreground">
                No monitoring entries yet.
              </div>
            ) : (
              <ul className="space-y-1.5">
                {log.map((entry) => (
                  <li
                    key={entry.id}
                    className="grid grid-cols-[100px_60px_1fr_auto] items-center gap-2 rounded-md border border-border/60 bg-card/40 p-2 text-xs"
                  >
                    <span className="text-muted-foreground">{entry.date}</span>
                    <span className="tabular font-semibold">
                      {entry.compositeScore}
                    </span>
                    <span>{entry.summary}</span>
                    <BandChip band={entry.colorBand} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Notes
            </h3>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add or edit notes..."
            />
            <div className="mt-2 flex justify-end">
              <Button size="sm" onClick={save}>
                Save notes
              </Button>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
