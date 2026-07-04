import {
  MAX_SECTOR_EXPOSURE_PCT,
  OPTIONS_DTE_MAX,
  OPTIONS_DTE_MIN,
} from "./constants";
import type {
  DailySnapshot,
  ExitPlan,
  Holding,
  QualityGateResult,
  TickerData,
} from "./types";

interface GateInput {
  snapshot: Omit<DailySnapshot, "gate">;
  ticker: TickerData;
  holdings: Holding[];
  portfolioValue: number;
  exitPlan: ExitPlan | null;
}

export function evaluateQualityGate(input: GateInput): QualityGateResult {
  const { snapshot, ticker, holdings, portfolioValue, exitPlan } = input;

  // 1. Data freshness — OHLC must include a bar for the snapshot date
  const hasBarForDate = ticker.ohlc.some((b) => b.date === snapshot.date);
  const dataFreshness = {
    passed: hasBarForDate,
    message: hasBarForDate
      ? "Market data current as of today"
      : `No OHLC bar available for ${snapshot.date}`,
  };

  // 2. Regime validity — not Bearish, and no exit alert
  const regimeValidity = {
    passed: snapshot.regime !== "Bearish" && !snapshot.exitAlertActive,
    message: snapshot.exitAlertActive
      ? "Exit alert active — price entered Kumo"
      : snapshot.regime === "Bearish"
        ? "Bearish regime — price below cloud"
        : `${snapshot.regime} regime confirmed`,
  };

  // 3. Risk filter — no earnings within DTE window
  const dte = snapshot.dte || OPTIONS_DTE_MAX;
  const earningsRisk =
    ticker.earningsInDays !== null &&
    ticker.earningsInDays >= 0 &&
    ticker.earningsInDays <= dte;
  const riskFilter = {
    passed: !earningsRisk,
    message: earningsRisk
      ? `Earnings in ${ticker.earningsInDays} days — within DTE window`
      : "No earnings within DTE window",
  };

  // 4. Options validity
  const opt = snapshot.chosenOption;
  const optionsValid =
    !!opt &&
    opt.dte >= OPTIONS_DTE_MIN &&
    opt.dte <= OPTIONS_DTE_MAX &&
    opt.premium > 0 &&
    opt.strike < snapshot.price;
  const optionsValidity = {
    passed: optionsValid,
    message: optionsValid
      ? `Strike $${opt!.strike} @ $${opt!.premium.toFixed(2)}, ${opt!.dte} DTE`
      : "No valid options contract available in DTE window",
  };

  // 5. Portfolio exposure
  const sectorValue = holdings
    .filter((h) => h.sector === ticker.sector)
    .reduce((s, h) => s + h.positionSize * h.entryPrice, 0);
  const pv = portfolioValue > 0 ? portfolioValue : 1;
  const sectorPct = (sectorValue / pv) * 100;
  const exposureOk = sectorPct <= MAX_SECTOR_EXPOSURE_PCT;
  const portfolioExposure = {
    passed: exposureOk,
    message: exposureOk
      ? `${ticker.sector} exposure ${sectorPct.toFixed(1)}% — within ${MAX_SECTOR_EXPOSURE_PCT}% limit`
      : `${ticker.sector} exposure ${sectorPct.toFixed(1)}% exceeds ${MAX_SECTOR_EXPOSURE_PCT}% limit`,
  };

  // 6. Exit plan completeness
  const planComplete =
    !!exitPlan &&
    !!exitPlan.reviewTrigger.trim() &&
    !!exitPlan.exitAlertLevel.trim() &&
    !!exitPlan.takeProfitCondition.trim() &&
    !!exitPlan.avoidReEntryCondition.trim();
  const exitPlanCompleteness = {
    passed: planComplete,
    message: planComplete
      ? "All four exit plan fields populated"
      : "Exit plan is missing one or more required fields",
  };

  const checks = {
    dataFreshness,
    regimeValidity,
    riskFilter,
    optionsValidity,
    portfolioExposure,
    exitPlanCompleteness,
  };

  const passed = Object.values(checks).every((c) => c.passed);

  return { passed, checks };
}

export const GATE_CHECK_LABELS: Record<
  keyof QualityGateResult["checks"],
  string
> = {
  dataFreshness: "Data freshness",
  regimeValidity: "Regime validity",
  riskFilter: "Risk filter",
  optionsValidity: "Options validity",
  portfolioExposure: "Portfolio exposure",
  exitPlanCompleteness: "Exit plan completeness",
};
