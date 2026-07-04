import { useMemo, useState } from "react";
import { useSnapshots, useRecommendations, useTickers } from "@/hooks/use-data";
import { BandChip, SignalChip } from "@/components/Chips";
import { StudyCardDrawer } from "@/components/DailyScreen/StudyCardDrawer";
import { Skeleton } from "@/components/ui/skeleton";
import type { BriefingItem } from "@/lib/types";
import {
  TrendingUp,
  TrendingDown,
  AlertOctagon,
  Sparkles,
  DollarSign,
  Eye,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { format } from "date-fns";

export function BriefingScreen() {
  const { data: snapshots, isLoading } = useSnapshots();
  const { data: recommendations = [] } = useRecommendations();
  const tickers = useTickers();
  const currentDate = useAppStore((s) => s.currentDate);
  const [openTicker, setOpenTicker] = useState<string | null>(null);

  const briefing = useMemo(() => {
    if (!snapshots)
      return {
        health: null,
        newSetups: [] as Extract<BriefingItem, { category: "new-setup" }>[],
        improved: [] as Extract<BriefingItem, { category: "improved" }>[],
        weakened: [] as Extract<BriefingItem, { category: "weakened" }>[],
        review: [] as Extract<BriefingItem, { category: "review-trigger" }>[],
        exitAlerts: [] as Extract<BriefingItem, { category: "exit-alert" }>[],
        income: [] as Extract<BriefingItem, { category: "income" }>[],
      };
    const snapByTicker = new Map(snapshots.map((s) => [s.ticker, s]));
    const active = recommendations.filter((r) => r.status !== "Closed");
    const savedTickers = new Set(active.map((r) => r.ticker));

    const newSetups: Extract<BriefingItem, { category: "new-setup" }>[] =
      snapshots
        .filter(
          (s) =>
            (s.colorBand === "SuperGreen" || s.colorBand === "LightGreen") &&
            !savedTickers.has(s.ticker),
        )
        .sort((a, b) => b.compositeScore - a.compositeScore)
        .slice(0, 10)
        .map((snapshot) => ({ category: "new-setup" as const, snapshot }));

    const improved: Extract<BriefingItem, { category: "improved" }>[] = [];
    const weakened: Extract<BriefingItem, { category: "weakened" }>[] = [];
    const review: Extract<BriefingItem, { category: "review-trigger" }>[] = [];
    const exitAlerts: Extract<BriefingItem, { category: "exit-alert" }>[] = [];

    for (const recommendation of active) {
      const snapshot = snapByTicker.get(recommendation.ticker);
      if (!snapshot) continue;
      const scoreDelta = snapshot.compositeScore - recommendation.scoreAtEntry;
      if (scoreDelta > 3)
        improved.push({
          category: "improved" as const,
          snapshot,
          recommendation,
          scoreDelta,
        });
      if (scoreDelta < -3)
        weakened.push({
          category: "weakened" as const,
          snapshot,
          recommendation,
          scoreDelta,
        });
      if (snapshot.exitAlertActive)
        exitAlerts.push({
          category: "exit-alert" as const,
          snapshot,
          recommendation,
        });
      // Review trigger: price within 1% of Kijun
      const nearKijun = Math.abs(snapshot.kijunDistancePct) < 1;
      if (nearKijun)
        review.push({
          category: "review-trigger" as const,
          snapshot,
          recommendation,
        });
    }

    const income: Extract<BriefingItem, { category: "income" }>[] = snapshots
      .filter((s) => s.signalLabel === "SELL PUT")
      .sort((a, b) => b.yieldPct - a.yieldPct)
      .slice(0, 8)
      .map((snapshot) => ({ category: "income" as const, snapshot }));

    return {
      health: {
        active: active.length,
        improved: improved.length,
        weakened: weakened.length,
        exitAlerts: exitAlerts.length,
      },
      newSetups,
      improved,
      weakened,
      review,
      exitAlerts,
      income,
    };
  }, [snapshots, recommendations]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1200px] space-y-6 px-4 py-6 md:px-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    );
  }

  const noActive =
    recommendations.filter((r) => r.status !== "Closed").length === 0;
  const displayDate = (() => {
    try {
      return format(new Date(currentDate), "EEEE, MMMM d yyyy");
    } catch {
      return currentDate;
    }
  })();

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 md:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Daily Briefing
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{displayDate}</p>
      </div>

      {/* Health */}
      {briefing.health && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <HealthTile
            icon={<Activity className="h-4 w-4" />}
            label="Active"
            value={briefing.health.active}
          />
          <HealthTile
            icon={<TrendingUp className="h-4 w-4 text-band-lightgreen-fg" />}
            label="Improved"
            value={briefing.health.improved}
          />
          <HealthTile
            icon={<TrendingDown className="h-4 w-4 text-band-pink-fg" />}
            label="Weakened"
            value={briefing.health.weakened}
          />
          <HealthTile
            icon={<AlertOctagon className="h-4 w-4 text-signal-exit" />}
            label="Exit alerts"
            value={briefing.health.exitAlerts}
          />
        </div>
      )}

      {noActive && (
        <div className="mb-6 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No active recommendations to monitor yet. Head to the Daily Screen to
          save your first setup.
        </div>
      )}

      <div className="grid gap-4">
        <BriefSection
          title="Exit Alerts"
          icon={<AlertOctagon className="h-4 w-4" />}
          highlight
          empty="No exit alerts."
          items={briefing.exitAlerts.map(({ snapshot, recommendation }) => ({
            key: recommendation.id,
            onClick: () => setOpenTicker(snapshot.ticker),
            content: (
              <>
                <span className="font-mono font-semibold">
                  {snapshot.ticker}
                </span>
                <span className="text-xs text-muted-foreground">
                  {snapshot.kumoDistancePct.toFixed(1)}% from cloud top
                </span>
                <BandChip band={snapshot.colorBand} />
                <SignalChip signal="EXIT ALERT" />
              </>
            ),
          }))}
        />

        <BriefSection
          title="New High-Quality Setups"
          icon={<Sparkles className="h-4 w-4" />}
          empty="No new SuperGreen or LightGreen setups today."
          items={briefing.newSetups.map(({ snapshot }) => ({
            key: snapshot.ticker,
            onClick: () => setOpenTicker(snapshot.ticker),
            content: (
              <>
                <span className="font-mono font-semibold">
                  {snapshot.ticker}
                </span>
                <span className="text-xs text-muted-foreground">
                  {
                    tickers.find((t) => t.ticker === snapshot.ticker)
                      ?.companyName
                  }
                </span>
                <span className="text-sm tabular">
                  Score {snapshot.compositeScore}
                </span>
                <BandChip band={snapshot.colorBand} />
                <SignalChip signal={snapshot.signalLabel} />
              </>
            ),
          }))}
        />

        <BriefSection
          title="Improved Recommendations"
          icon={<TrendingUp className="h-4 w-4" />}
          empty="No improved records vs. entry."
          items={briefing.improved.map(
            ({ snapshot, recommendation, scoreDelta }) => ({
              key: recommendation.id,
              onClick: () => setOpenTicker(snapshot.ticker),
              content: (
                <>
                  <span className="font-mono font-semibold">
                    {recommendation.ticker}
                  </span>
                  <span className="text-sm tabular text-band-lightgreen-fg">
                    +{scoreDelta} vs entry
                  </span>
                  <BandChip band={snapshot.colorBand} />
                  <SignalChip signal={snapshot.signalLabel} />
                </>
              ),
            }),
          )}
        />

        <BriefSection
          title="Weakened Recommendations"
          icon={<TrendingDown className="h-4 w-4" />}
          empty="No weakened records."
          items={briefing.weakened.map(
            ({ snapshot, recommendation, scoreDelta }) => ({
              key: recommendation.id,
              onClick: () => setOpenTicker(snapshot.ticker),
              content: (
                <>
                  <span className="font-mono font-semibold">
                    {recommendation.ticker}
                  </span>
                  <span className="text-sm tabular text-band-pink-fg">
                    {scoreDelta} vs entry
                  </span>
                  <BandChip band={snapshot.colorBand} />
                  <SignalChip signal={snapshot.signalLabel} />
                </>
              ),
            }),
          )}
        />

        <BriefSection
          title="Positions Requiring Review"
          icon={<Eye className="h-4 w-4" />}
          empty="No positions at review trigger."
          items={briefing.review.map(({ snapshot, recommendation }) => ({
            key: recommendation.id,
            onClick: () => setOpenTicker(snapshot.ticker),
            content: (
              <>
                <span className="font-mono font-semibold">
                  {recommendation.ticker}
                </span>
                <span className="text-xs text-muted-foreground">
                  Price at Kijun ({snapshot.kijunDistancePct.toFixed(1)}%)
                </span>
                <BandChip band={snapshot.colorBand} />
              </>
            ),
          }))}
        />

        <BriefSection
          title="Income Opportunities"
          icon={<DollarSign className="h-4 w-4" />}
          empty="No SELL PUT signals today."
          items={briefing.income.map(({ snapshot }) => ({
            key: snapshot.ticker,
            onClick: () => setOpenTicker(snapshot.ticker),
            content: (
              <>
                <span className="font-mono font-semibold">
                  {snapshot.ticker}
                </span>
                <span className="text-sm tabular">
                  ${snapshot.premium.toFixed(2)} @{" "}
                  {snapshot.yieldPct.toFixed(2)}%
                </span>
                <span className="text-xs text-muted-foreground">
                  {snapshot.dte} DTE
                </span>
                <SignalChip signal="SELL PUT" />
              </>
            ),
          }))}
        />
      </div>

      <StudyCardDrawer
        ticker={openTicker}
        onClose={() => setOpenTicker(null)}
      />
    </div>
  );
}

function HealthTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular">{value}</div>
    </div>
  );
}

interface BriefItem {
  key: string;
  onClick: () => void;
  content: React.ReactNode;
}
function BriefSection({
  title,
  icon,
  items,
  empty,
  highlight,
}: {
  title: string;
  icon: React.ReactNode;
  items: BriefItem[];
  empty: string;
  highlight?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-lg border border-border bg-card",
        highlight && "border-signal-exit/40 bg-signal-exit/5",
      )}
    >
      <header className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-semibold">
        {icon}
        {title}
        <span className="ml-auto text-xs font-normal text-muted-foreground">
          {items.length}
        </span>
      </header>
      {items.length === 0 ? (
        <div className="px-4 py-3 text-xs text-muted-foreground">{empty}</div>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.key}>
              <button
                onClick={item.onClick}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-accent/40"
              >
                {item.content}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
