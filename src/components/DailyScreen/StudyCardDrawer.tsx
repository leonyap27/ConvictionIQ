import { useMemo, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSnapshots, useTickers, useHoldings, portfolioValue, useRecommendations } from "@/hooks/use-data";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { BandChip, SignalChip } from "@/components/Chips";
import { evaluateQualityGate, GATE_CHECK_LABELS } from "@/lib/quality-gate";
import {
  generateExitPlan,
  generateExposureNote,
  generateRisks,
  generateWhyItPassed,
} from "@/lib/reasoning";
import { DECISION_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import type { DecisionLabel, ExitPlan, Strategy, StudyCard } from "@/lib/types";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { db, saveRecommendation, updateRecommendationDecision } from "@/lib/db";
import { toast } from "sonner";

interface Props {
  ticker: string | null;
  onClose: () => void;
}

export function StudyCardDrawer({ ticker, onClose }: Props) {
  const { data: snapshots } = useSnapshots();
  const tickers = useTickers();
  const { data: holdings = [] } = useHoldings();
  const { data: recommendations = [] } = useRecommendations();
  const queryClient = useQueryClient();

  const [strategy] = useState<Strategy>("Cash-Secured Put");
  const [exitPlan, setExitPlan] = useState<ExitPlan | null>(null);
  const [notes, setNotes] = useState("");
  const [savingDecision, setSavingDecision] = useState<DecisionLabel | null>(null);

  const snap = snapshots?.find((s) => s.ticker === ticker) ?? null;
  const tickerData = tickers.find((t) => t.ticker === ticker) ?? null;
  const pv = portfolioValue(holdings);

  // Auto-generate exit plan when snapshot loads
  useEffect(() => {
    if (snap && !exitPlan) {
      setExitPlan(generateExitPlan(snap, strategy));
    }
    if (!ticker) {
      setExitPlan(null);
      setNotes("");
    }
  }, [snap, exitPlan, strategy, ticker]);

  const gate = useMemo(() => {
    if (!snap || !tickerData) return null;
    return evaluateQualityGate({
      snapshot: snap,
      ticker: tickerData,
      holdings,
      portfolioValue: pv,
      exitPlan,
    });
  }, [snap, tickerData, holdings, pv, exitPlan]);

  const studyCard: StudyCard | null = useMemo(() => {
    if (!snap || !tickerData || !exitPlan) return null;
    return {
      ticker: snap.ticker,
      strategy,
      generatedAt: new Date().toISOString(),
      snapshot: snap,
      whyItPassed: generateWhyItPassed(snap),
      risks: generateRisks(snap, tickerData, holdings, pv),
      exitPlan,
      exposureNote: generateExposureNote(tickerData, holdings, pv),
    };
  }, [snap, tickerData, exitPlan, strategy, holdings, pv]);

  const existingRecord = recommendations.find(
    (r) => r.ticker === ticker && r.status !== "Closed",
  );
  const alreadyDecided = !!existingRecord?.decision;

  const planComplete =
    !!exitPlan &&
    !!exitPlan.reviewTrigger.trim() &&
    !!exitPlan.exitAlertLevel.trim() &&
    !!exitPlan.takeProfitCondition.trim() &&
    !!exitPlan.avoidReEntryCondition.trim();

  const handleDecision = async (label: DecisionLabel) => {
    if (!studyCard || !snap) return;
    if (!planComplete) return;
    setSavingDecision(label);
    try {
      const id = existingRecord?.id ?? crypto.randomUUID();
      if (!existingRecord) {
        await saveRecommendation({
          id,
          ticker: snap.ticker,
          strategy,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: "Active",
          scoreAtEntry: snap.compositeScore,
          colorBandAtEntry: snap.colorBand,
          signalLabelAtEntry: snap.signalLabel,
          originalStudyCard: studyCard,
          decision: null,
          notes,
        });
      }
      await updateRecommendationDecision(id, {
        label,
        notes,
        decidedAt: new Date().toISOString(),
      });
      // seed initial monitoring log entry
      const existingLogs = await db.monitoringLog
        .where("recordId")
        .equals(id)
        .count();
      if (existingLogs === 0) {
        await db.monitoringLog.put({
          id: crypto.randomUUID(),
          recordId: id,
          date: snap.date,
          compositeScore: snap.compositeScore,
          scoreDelta: 0,
          colorBand: snap.colorBand,
          colorBandChanged: false,
          signalLabel: snap.signalLabel,
          signalLabelChanged: false,
          kijunDistancePct: snap.kijunDistancePct,
          kumoDistancePct: snap.kumoDistancePct,
          premium: snap.premium,
          premiumChangePct: 0,
          exitAlertActive: snap.exitAlertActive,
          summary: "Recommendation created",
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      await queryClient.invalidateQueries({ queryKey: ["monitoringLog", id] });
      toast.success(`Decision saved: ${label}`);
      setSavingDecision(null);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      toast.error("Failed to save decision");
      setSavingDecision(null);
    }
  };

  const open = !!ticker;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-2xl"
      >
        <SheetHeader>
          <SheetTitle className="sr-only">Study Card {ticker}</SheetTitle>
        </SheetHeader>
        {!snap || !tickerData ? (
          <div className="p-6 text-sm text-muted-foreground">
            Study card could not be generated — check data freshness and retry.
          </div>
        ) : (
          <div className="space-y-6 p-1">
            {/* SECTION 1 — HEADER */}
            <section>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-mono text-3xl font-bold tracking-tight">
                    {snap.ticker}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {tickerData.companyName} · {strategy}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Generated{" "}
                    {new Date().toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold tabular">
                    {snap.compositeScore}
                  </div>
                  <div className="mt-1 flex justify-end gap-1.5">
                    <BandChip band={snap.colorBand} />
                    <SignalChip signal={snap.signalLabel} />
                  </div>
                </div>
              </div>
              <div className="mt-3 rounded-md border border-border bg-card/50 px-3 py-2 text-xs text-muted-foreground">
                {generateExposureNote(tickerData, holdings, pv)}
              </div>
              <GateSummary gate={gate} />
            </section>

            {/* SECTION 2 — Why it passed */}
            <Section title="Why it passed">
              <ul className="space-y-2">
                {generateWhyItPassed(snap).map((b, i) => (
                  <li
                    key={i}
                    className="flex gap-3 rounded-md border border-border/60 bg-card/40 p-3"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-band-lightgreen-fg mt-0.5" />
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {b.input}
                      </div>
                      <div className="text-sm text-foreground">{b.text}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </Section>

            {/* SECTION 3 — Risks */}
            <Section title="Risks">
              <ul className="space-y-2">
                {generateRisks(snap, tickerData, holdings, pv).map((b, i) => (
                  <li
                    key={i}
                    className="flex gap-3 rounded-md border border-border/60 bg-card/40 p-3"
                  >
                    <AlertTriangle className="h-4 w-4 shrink-0 text-band-pink-fg mt-0.5" />
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {b.input}
                      </div>
                      <div className="text-sm text-foreground">{b.text}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </Section>

            {/* SECTION 4 — Exit Plan */}
            <Section title="Exit Plan">
              {!planComplete && (
                <div className="mb-3 flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/15 px-3 py-2 text-sm text-destructive">
                  <XCircle className="h-4 w-4" />
                  Exit plan incomplete — recommendation blocked
                </div>
              )}
              <div className="space-y-3">
                <ExitField
                  label="Review Trigger"
                  value={exitPlan?.reviewTrigger ?? ""}
                  onChange={(v) =>
                    setExitPlan((p) => (p ? { ...p, reviewTrigger: v } : p))
                  }
                />
                <ExitField
                  label="Exit Alert Level"
                  value={exitPlan?.exitAlertLevel ?? ""}
                  onChange={(v) =>
                    setExitPlan((p) => (p ? { ...p, exitAlertLevel: v } : p))
                  }
                />
                <ExitField
                  label="Take-Profit Condition"
                  value={exitPlan?.takeProfitCondition ?? ""}
                  onChange={(v) =>
                    setExitPlan((p) =>
                      p ? { ...p, takeProfitCondition: v } : p,
                    )
                  }
                />
                <ExitField
                  label="Avoid Re-Entry Condition"
                  value={exitPlan?.avoidReEntryCondition ?? ""}
                  onChange={(v) =>
                    setExitPlan((p) =>
                      p ? { ...p, avoidReEntryCondition: v } : p,
                    )
                  }
                />
              </div>
            </Section>

            {/* SECTION 5 — Decision */}
            <Section title="Decision">
              {existingRecord?.decision && (
                <div className="mb-3 rounded-md border border-band-lightgreen-fg/30 bg-band-lightgreen px-3 py-2 text-sm text-band-lightgreen-fg">
                  Saved as{" "}
                  <span className="font-semibold">
                    {existingRecord.decision.label}
                  </span>{" "}
                  on{" "}
                  {new Date(
                    existingRecord.decision.decidedAt,
                  ).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {DECISION_LABELS.map((label) => (
                  <Button
                    key={label}
                    variant="outline"
                    disabled={!planComplete || savingDecision !== null}
                    onClick={() => {
                      if (confirm(`Save decision "${label}"?`)) {
                        handleDecision(label);
                      }
                    }}
                    className={cn(
                      "justify-start",
                      savingDecision === label && "opacity-60",
                      alreadyDecided &&
                        existingRecord?.decision?.label === label &&
                        "border-band-lightgreen-fg/60 bg-band-lightgreen",
                    )}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <div className="mt-4 space-y-1.5">
                <Label htmlFor="notes" className="text-xs text-muted-foreground">
                  Notes / Lesson learned (optional)
                </Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reasoning, observations, or lessons to remember..."
                  rows={3}
                />
              </div>
            </Section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function ExitField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-[180px_1fr] items-center gap-3">
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(!value.trim() && "border-destructive/60")}
      />
    </div>
  );
}

function GateSummary({
  gate,
}: {
  gate: ReturnType<typeof evaluateQualityGate> | null;
}) {
  if (!gate) return null;
  const entries = Object.entries(gate.checks) as [
    keyof typeof gate.checks,
    (typeof gate.checks)[keyof typeof gate.checks],
  ][];
  return (
    <div className="mt-3 grid grid-cols-2 gap-1.5 text-xs md:grid-cols-3">
      {entries.map(([k, v]) => (
        <div
          key={k}
          className={cn(
            "flex items-center gap-1.5 rounded-md border px-2 py-1",
            v.passed
              ? "border-band-lightgreen-fg/30 bg-band-lightgreen/50 text-band-lightgreen-fg"
              : "border-warning/40 bg-warning/15 text-warning",
          )}
          title={v.message}
        >
          {v.passed ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <AlertTriangle className="h-3 w-3" />
          )}
          <span className="truncate">{GATE_CHECK_LABELS[k]}</span>
        </div>
      ))}
    </div>
  );
}
