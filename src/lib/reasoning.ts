import type {
  DailySnapshot,
  ExitPlan,
  Holding,
  ReasoningBullet,
  Strategy,
  TickerData,
} from "./types";

/**
 * Deterministic template-rules reasoning generator.
 * Every bullet references a named scoring input for traceability.
 * (Cleanly swappable for an LLM later.)
 */

export function generateWhyItPassed(
  snap: DailySnapshot,
): ReasoningBullet[] {
  const bullets: ReasoningBullet[] = [];

  // Regime
  if (snap.regime === "Bullish") {
    bullets.push({
      input: "Regime",
      text: "Strong uptrend regime — price is trading above the Ichimoku cloud, confirming bullish structure.",
    });
  } else if (snap.regime === "Neutral") {
    bullets.push({
      input: "Regime",
      text: "Neutral regime — price is inside the cloud, indicating consolidation with directional potential.",
    });
  }

  // Kijun pullback
  if (snap.kijunDistancePct >= 0 && snap.kijunDistancePct <= 4) {
    bullets.push({
      input: "Kijun Distance",
      text: `Controlled pullback near Kijun (${snap.kijunDistancePct.toFixed(1)}% above baseline) — classic re-entry zone within an established trend.`,
    });
  } else if (snap.kijunDistancePct > 4 && snap.kijunDistancePct <= 8) {
    bullets.push({
      input: "Kijun Distance",
      text: `Price ${snap.kijunDistancePct.toFixed(1)}% above Kijun — extended but still within acceptable range for entry.`,
    });
  }

  // Tenkan/Kijun cross
  if (snap.ichimoku.tenkan > snap.ichimoku.kijun) {
    bullets.push({
      input: "Tenkan/Kijun",
      text: "Bullish Tenkan/Kijun alignment — short-term momentum is above the mid-term baseline.",
    });
  }

  // Cloud thickness
  const thickness =
    ((snap.ichimoku.cloudTop - snap.ichimoku.cloudBottom) /
      snap.ichimoku.kijun) *
    100;
  if (thickness > 2) {
    bullets.push({
      input: "Cloud Thickness",
      text: `Thick Kumo (${thickness.toFixed(1)}% of price) — strong forward-looking support.`,
    });
  }

  // Options
  if (snap.chosenOption && snap.yieldPct >= 1.5) {
    bullets.push({
      input: "Options Yield",
      text: `Premium yield of ${snap.yieldPct.toFixed(2)}% on the $${snap.chosenOption.strike} strike meets income threshold.`,
    });
  } else if (snap.chosenOption) {
    bullets.push({
      input: "Options Yield",
      text: `Premium yield of ${snap.yieldPct.toFixed(2)}% on the $${snap.chosenOption.strike} strike is acceptable.`,
    });
  }
  if (snap.chosenOption) {
    bullets.push({
      input: "Options DTE",
      text: `${snap.dte} days to expiration — within the ideal 25–45 day window.`,
    });
  }

  // Composite context
  bullets.push({
    input: "Composite Score",
    text: `Composite score of ${snap.compositeScore} places this setup in the ${snap.colorBand} band.`,
  });

  return bullets;
}

export function generateRisks(
  snap: DailySnapshot,
  ticker: TickerData,
  holdings: Holding[],
  portfolioValue: number,
): ReasoningBullet[] {
  const risks: ReasoningBullet[] = [];

  if (snap.regime === "Bearish") {
    risks.push({
      input: "Regime",
      text: "Bearish regime — price is below the cloud, structural downtrend risk.",
    });
  }

  if (snap.exitAlertActive) {
    risks.push({
      input: "Kumo Distance",
      text: `Price has entered the cloud (${snap.kumoDistancePct.toFixed(1)}% from top) — exit alert triggered.`,
    });
  } else if (snap.kumoDistancePct < 2) {
    risks.push({
      input: "Kumo Distance",
      text: `Price is only ${snap.kumoDistancePct.toFixed(1)}% above the cloud — limited buffer if trend weakens.`,
    });
  }

  if (
    ticker.earningsInDays !== null &&
    ticker.earningsInDays >= 0 &&
    ticker.earningsInDays <= 60
  ) {
    risks.push({
      input: "Earnings Window",
      text: `Earnings in ${ticker.earningsInDays} days — event risk within the typical DTE window.`,
    });
  }

  if (snap.chosenOption) {
    const otm = ((snap.price - snap.chosenOption.strike) / snap.price) * 100;
    if (otm < 5) {
      risks.push({
        input: "Strike Proximity",
        text: `Strike is only ${otm.toFixed(1)}% below price — tight cushion if the stock pulls back.`,
      });
    }
  } else {
    risks.push({
      input: "Options Chain",
      text: "No qualifying options contract found in the DTE window.",
    });
  }

  // Sector concentration
  const sectorValue = holdings
    .filter((h) => h.sector === ticker.sector)
    .reduce((s, h) => s + h.positionSize * h.entryPrice, 0);
  const sectorPct = (sectorValue / (portfolioValue || 1)) * 100;
  if (sectorPct > 15) {
    risks.push({
      input: "Portfolio Exposure",
      text: `${ticker.sector} sector already ${sectorPct.toFixed(1)}% of portfolio — concentration risk if adding.`,
    });
  }

  // Broad market: infer from many bearish tickers — omitted; use volatility hint
  const recent = ticker.ohlc.slice(-10);
  const range = Math.max(...recent.map((r) => r.high)) - Math.min(...recent.map((r) => r.low));
  const rangePct = (range / snap.price) * 100;
  if (rangePct > 12) {
    risks.push({
      input: "Volatility",
      text: `10-day range of ${rangePct.toFixed(1)}% — elevated volatility increases assignment risk.`,
    });
  }

  if (risks.length === 0) {
    risks.push({
      input: "Baseline",
      text: "No individual risk flags triggered — standard market and assignment risk still applies.",
    });
  }

  return risks;
}

export function generateExitPlan(
  snap: DailySnapshot,
  strategy: Strategy,
): ExitPlan {
  const kijun = snap.ichimoku.kijun.toFixed(2);
  const cloudTop = snap.ichimoku.cloudTop.toFixed(2);
  const cloudBottom = snap.ichimoku.cloudBottom.toFixed(2);

  if (strategy === "Cash-Secured Put") {
    return {
      reviewTrigger: `Price touches Kijun at $${kijun}`,
      exitAlertLevel: `Price enters Kumo (top at $${cloudTop}, bottom at $${cloudBottom})`,
      takeProfitCondition:
        "Premium decays by 50% of initial credit — close and redeploy",
      avoidReEntryCondition:
        "Bearish reversal confirmed at Kijun with Tenkan crossing below",
    };
  }
  return {
    reviewTrigger: `Price touches Kijun at $${kijun}`,
    exitAlertLevel: `Price closes below cloud bottom at $${cloudBottom}`,
    takeProfitCondition: "Position gains 15% or reaches technical target",
    avoidReEntryCondition:
      "Chikou span crosses below price 26 bars ago — trend broken",
  };
}

export function generateExposureNote(
  ticker: TickerData,
  holdings: Holding[],
  portfolioValue: number,
): string {
  const sectorValue = holdings
    .filter((h) => h.sector === ticker.sector)
    .reduce((s, h) => s + h.positionSize * h.entryPrice, 0);
  const tickerValue = holdings
    .filter((h) => h.ticker === ticker.ticker)
    .reduce((s, h) => s + h.positionSize * h.entryPrice, 0);
  const pv = portfolioValue || 1;
  const sectorPct = (sectorValue / pv) * 100;
  const tickerPct = (tickerValue / pv) * 100;
  return `Current ${ticker.ticker} exposure is ${tickerPct.toFixed(1)}% and ${ticker.sector} sector exposure is ${sectorPct.toFixed(1)}% of portfolio.`;
}
