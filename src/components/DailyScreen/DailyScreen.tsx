import { useMemo, useState } from "react";
import { useSnapshots, useTickers, useHoldings, portfolioValue } from "@/hooks/use-data";
import { useAppStore } from "@/lib/store";
import { BAND_ROW_CLASS } from "@/lib/constants";
import { GATE_CHECK_LABELS_MAP } from "@/components/gate-labels";
import { BandChip, SignalChip } from "@/components/Chips";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StudyCardDrawer } from "./StudyCardDrawer";
import { FilterBar } from "./FilterBar";
import { RulesSettings } from "./RulesSettings";
import type { DailySnapshot } from "@/lib/types";

export function DailyScreen() {
  const { data: snapshots, isLoading } = useSnapshots();
  const tickers = useTickers();

  const filterSignal = useAppStore((s) => s.filterSignal);
  const filterBand = useAppStore((s) => s.filterBand);
  const filterStrategy = useAppStore((s) => s.filterStrategy);
  const includedThemes = useAppStore((s) => s.includedThemes);
  const minCompositeScore = useAppStore((s) => s.minCompositeScore);
  const excludedTickers = useAppStore((s) => s.excludedTickers);
  const maxDisplay = useAppStore((s) => s.maxDisplay);

  const [openTicker, setOpenTicker] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Build a ticker -> theme map from TickerData for the rules-layer filter
  const themeByTicker = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of tickers) m.set(t.ticker, t.theme);
    return m;
  }, [tickers]);

  const filtered = useMemo(() => {
    if (!snapshots) return [];

    // Rules layer: theme, score floor, exclusions, capped count
    const rulesFiltered = snapshots
      .filter((s) => {
        if (includedThemes.length > 0) {
          const theme = themeByTicker.get(s.ticker);
          if (!theme || !includedThemes.includes(theme as never)) return false;
        }
        return true;
      })
      .filter((s) => s.compositeScore >= minCompositeScore)
      .filter((s) => !excludedTickers.includes(s.ticker))
      .sort((a, b) => b.compositeScore - a.compositeScore)
      .slice(0, maxDisplay);

    // Quick-filter chips on top of the smart list
    return rulesFiltered
      .filter((s) => filterSignal === "All" || s.signalLabel === filterSignal)
      .filter((s) => filterBand === "All" || s.colorBand === filterBand)
      .filter((s) => filterStrategy === "All" || s.strategy === filterStrategy);
  }, [
    snapshots,
    themeByTicker,
    includedThemes,
    minCompositeScore,
    excludedTickers,
    maxDisplay,
    filterSignal,
    filterBand,
    filterStrategy,
  ]);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 md:px-6">
      <div className="mb-4 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Daily Screen — Opportunity Hunt
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ranked opportunities scored through the Ichimoku + options engine.
            Click any qualifying row to open its Study Card.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FilterBar />
          <Button
            variant={settingsOpen ? "secondary" : "outline"}
            size="sm"
            onClick={() => setSettingsOpen((v) => !v)}
            aria-expanded={settingsOpen}
            aria-controls="rules-settings-panel"
            title="Smart-list rules"
          >
            <Settings className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Rules</span>
          </Button>
        </div>
      </div>

      {settingsOpen && (
        <div id="rules-settings-panel" className="mb-4">
          <RulesSettings />
        </div>
      )}

      {isLoading ? (
        <TableSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-card text-xs uppercase text-muted-foreground">
                <tr>
                  <Th>Ticker</Th>
                  <Th>Regime</Th>
                  <Th className="text-right">Tech</Th>
                  <Th className="text-right">Options</Th>
                  <Th className="text-right">Composite</Th>
                  <Th>Band</Th>
                  <Th>Signal</Th>
                  <Th className="text-right">Premium</Th>
                  <Th className="text-right">Yield %</Th>
                  <Th className="text-right">DTE</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((snap) => (
                  <Row
                    key={snap.ticker}
                    snap={snap}
                    onOpen={() => setOpenTicker(snap.ticker)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <StudyCardDrawer
        ticker={openTicker}
        onClose={() => setOpenTicker(null)}
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
      className={cn(
        "px-3 py-2.5 text-left font-medium tracking-wide",
        className,
      )}
    >
      {children}
    </th>
  );
}

function Row({
  snap,
  onOpen,
}: {
  snap: DailySnapshot;
  onOpen: () => void;
}) {
  const tickers = useTickers();
  const { data: holdings = [] } = useHoldings();
  const pv = portfolioValue(holdings);
  const ticker = tickers.find((t) => t.ticker === snap.ticker)!;
  // Real gate — exit plan will be auto-generated in study card, so we consider it complete.
  // Failed checks excluding exit plan:
  const failedChecks = Object.entries(snap.gate.checks)
    .filter(([k, v]) => !v.passed && k !== "exitPlanCompleteness")
    .map(([k, v]) => ({
      key: k as keyof typeof snap.gate.checks,
      msg: v.message,
    }));

  const clickable = failedChecks.length === 0;

  return (
    <tr
      className={cn(
        BAND_ROW_CLASS[snap.colorBand],
        "transition-colors",
        clickable
          ? "cursor-pointer"
          : "cursor-not-allowed opacity-90",
      )}
      onClick={() => {
        if (clickable) onOpen();
      }}
    >
      <td className="px-3 py-2.5">
        <div className="font-mono font-semibold">{snap.ticker}</div>
        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
          {ticker?.companyName}
          {holdings.some((h) => h.ticker === snap.ticker) ? " · held" : ""}
          {" · "}
          {ticker?.sector}
        </div>
      </td>
      <td className="px-3 py-2.5 text-xs">{snap.regime}</td>
      <td className="px-3 py-2.5 text-right tabular">{snap.technicalScore}</td>
      <td className="px-3 py-2.5 text-right tabular">{snap.optionsScore}</td>
      <td className="px-3 py-2.5 text-right font-semibold tabular">
        {snap.compositeScore}
      </td>
      <td className="px-3 py-2.5">
        <BandChip band={snap.colorBand} />
      </td>
      <td className="px-3 py-2.5">
        <SignalChip signal={snap.signalLabel} />
      </td>
      <td className="px-3 py-2.5 text-right tabular">
        {snap.chosenOption ? `$${snap.premium.toFixed(2)}` : "—"}
      </td>
      <td className="px-3 py-2.5 text-right tabular">
        {snap.chosenOption ? snap.yieldPct.toFixed(2) : "—"}
      </td>
      <td className="px-3 py-2.5 text-right tabular">
        {snap.chosenOption ? snap.dte : "—"}
      </td>
      <td className="px-3 py-2.5">
        {!clickable && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1 rounded-md border border-warning/40 bg-warning/15 px-2 py-0.5 text-xs text-warning">
                  <AlertCircle className="h-3 w-3" />
                  Incomplete
                </span>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <div className="text-xs font-semibold mb-1">Failed checks:</div>
                <ul className="space-y-1">
                  {failedChecks.map((c) => (
                    <li key={c.key} className="text-xs">
                      <span className="font-medium">
                        {GATE_CHECK_LABELS_MAP[c.key]}:
                      </span>{" "}
                      {c.msg}
                    </li>
                  ))}
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </td>
    </tr>
  );
}

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-card text-xs uppercase text-muted-foreground">
            <tr>
              {["Ticker", "Regime", "Tech", "Options", "Composite", "Band", "Signal", "Premium", "Yield %", "DTE", ""].map(
                (col, i) => (
                  <th key={i} className="px-3 py-2.5 text-left font-medium tracking-wide">
                    {col}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {Array.from({ length: 10 }).map((_, i) => (
              <tr key={i} className="transition-colors">
                <td className="px-3 py-2.5">
                  <Skeleton className="h-4 w-12 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </td>
                <td className="px-3 py-2.5"><Skeleton className="h-4 w-16" /></td>
                <td className="px-3 py-2.5 text-right"><Skeleton className="h-4 w-8 ml-auto" /></td>
                <td className="px-3 py-2.5 text-right"><Skeleton className="h-4 w-8 ml-auto" /></td>
                <td className="px-3 py-2.5 text-right"><Skeleton className="h-4 w-10 ml-auto" /></td>
                <td className="px-3 py-2.5"><Skeleton className="h-5 w-20 rounded-md" /></td>
                <td className="px-3 py-2.5"><Skeleton className="h-5 w-20 rounded-md" /></td>
                <td className="px-3 py-2.5 text-right"><Skeleton className="h-4 w-12 ml-auto" /></td>
                <td className="px-3 py-2.5 text-right"><Skeleton className="h-4 w-10 ml-auto" /></td>
                <td className="px-3 py-2.5 text-right"><Skeleton className="h-4 w-8 ml-auto" /></td>
                <td className="px-3 py-2.5" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
      No opportunities match your current rules — adjust the settings above.
    </div>
  );
}
