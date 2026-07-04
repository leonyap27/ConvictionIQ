import {
  BAND_THRESHOLDS,
  EXIT_ALERT_KUMO_DISTANCE_PCT,
  MIN_PREMIUM_YIELD_PCT,
  OPTIONS_DTE_IDEAL_MAX,
  OPTIONS_DTE_IDEAL_MIN,
  OPTIONS_DTE_MAX,
  OPTIONS_DTE_MIN,
} from "./constants";
import { computeIchimoku } from "./ichimoku";
import type {
  ColorBand,
  DailySnapshot,
  IchimokuValues,
  OptionContract,
  Regime,
  SignalLabel,
  Strategy,
  TickerData,
} from "./types";

export function classifyRegime(price: number, ichi: IchimokuValues): Regime {
  if (price > ichi.cloudTop) return "Bullish";
  if (price < ichi.cloudBottom) return "Bearish";
  return "Neutral";
}

export function chooseBestOption(
  options: OptionContract[],
  price: number,
): OptionContract | null {
  const candidates = options.filter(
    (o) =>
      o.dte >= OPTIONS_DTE_MIN &&
      o.dte <= OPTIONS_DTE_MAX &&
      o.strike < price && // OTM put
      o.premium > 0,
  );
  if (candidates.length === 0) return null;
  // Prefer highest yield within ideal DTE, then delta closest to -0.30
  const scored = candidates.map((o) => {
    const yieldPct = (o.premium / o.strike) * 100;
    const dteScore =
      o.dte >= OPTIONS_DTE_IDEAL_MIN && o.dte <= OPTIONS_DTE_IDEAL_MAX
        ? 1
        : 0.6;
    const deltaScore = 1 - Math.min(1, Math.abs(Math.abs(o.delta) - 0.3) / 0.3);
    return { o, s: yieldPct * dteScore * (0.6 + 0.4 * deltaScore) };
  });
  scored.sort((a, b) => b.s - a.s);
  return scored[0].o;
}

export function scoreTechnical(
  price: number,
  ichi: IchimokuValues,
  regime: Regime,
): number {
  let score = 0;

  // Price vs cloud
  if (regime === "Bullish") score += 30;
  else if (regime === "Neutral") score += 12;
  else score += 0;

  // Tenkan/Kijun cross
  if (ichi.tenkan > ichi.kijun) score += 20;
  else if (ichi.tenkan > ichi.kijun * 0.98) score += 10;

  // Controlled pullback near Kijun (price 0-4% above Kijun)
  const kijunAbovePct = ((price - ichi.kijun) / ichi.kijun) * 100;
  if (kijunAbovePct >= 0 && kijunAbovePct <= 4) score += 20;
  else if (kijunAbovePct > 4 && kijunAbovePct <= 8) score += 12;
  else if (kijunAbovePct < 0 && kijunAbovePct > -3) score += 6;

  // Chikou clear (above price 26 bars ago proxy): use price > cloudBottom
  if (ichi.chikou > ichi.cloudTop) score += 15;
  else if (ichi.chikou > ichi.cloudBottom) score += 8;

  // Cloud thickness = trend conviction
  const thickness = (ichi.cloudTop - ichi.cloudBottom) / ichi.kijun;
  if (thickness > 0.02) score += 15;
  else if (thickness > 0.01) score += 8;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function scoreOptions(
  option: OptionContract | null,
  price: number,
): number {
  if (!option) return 0;
  let score = 0;

  const yieldPct = (option.premium / option.strike) * 100;
  // Yield
  if (yieldPct >= 2.5) score += 40;
  else if (yieldPct >= 1.5) score += 30;
  else if (yieldPct >= MIN_PREMIUM_YIELD_PCT) score += 18;
  else score += 6;

  // DTE
  if (
    option.dte >= OPTIONS_DTE_IDEAL_MIN &&
    option.dte <= OPTIONS_DTE_IDEAL_MAX
  ) {
    score += 25;
  } else if (option.dte >= OPTIONS_DTE_MIN && option.dte <= OPTIONS_DTE_MAX) {
    score += 15;
  }

  // Strike proximity (want strike ~5-10% below price for CSP)
  const otmPct = ((price - option.strike) / price) * 100;
  if (otmPct >= 5 && otmPct <= 10) score += 20;
  else if (otmPct >= 3 && otmPct <= 15) score += 12;
  else score += 4;

  // Delta near -0.30
  const deltaDist = Math.abs(Math.abs(option.delta) - 0.3);
  if (deltaDist < 0.05) score += 15;
  else if (deltaDist < 0.12) score += 8;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function toBand(composite: number): ColorBand {
  if (composite >= BAND_THRESHOLDS.superGreen) return "SuperGreen";
  if (composite >= BAND_THRESHOLDS.lightGreen) return "LightGreen";
  if (composite >= BAND_THRESHOLDS.pink) return "Pink";
  return "SuperRed";
}

export function toSignalLabel(
  band: ColorBand,
  regime: Regime,
  optionValid: boolean,
  exitAlert: boolean,
): SignalLabel {
  if (exitAlert) return "EXIT ALERT";
  if (band === "SuperGreen" && regime !== "Bearish" && optionValid)
    return "SELL PUT";
  if (band === "LightGreen") return "WATCH";
  if (band === "Pink") return "WATCHLIST";
  return "AVOID";
}

export function toStrategy(signal: SignalLabel): Strategy {
  if (signal === "SELL PUT") return "Cash-Secured Put";
  return "Long Equity";
}

export interface ScoreOptions {
  asOfDate: string;
  historyLength?: number; // slice ohlc up to this length for time-travel
}

export function scoreTicker(
  data: TickerData,
  opts: ScoreOptions,
): Omit<DailySnapshot, "gate"> {
  const ohlc = opts.historyLength
    ? data.ohlc.slice(0, opts.historyLength)
    : data.ohlc;
  const price = ohlc[ohlc.length - 1].close;
  const ichi = computeIchimoku(ohlc);
  const regime = classifyRegime(price, ichi);

  const chosen = chooseBestOption(data.options, price);
  const technicalScore = scoreTechnical(price, ichi, regime);
  const optionsScore = scoreOptions(chosen, price);
  const composite = Math.round(0.6 * technicalScore + 0.4 * optionsScore);
  const band = toBand(composite);

  const kijunDistancePct = ((price - ichi.kijun) / price) * 100;
  const kumoDistancePct = ((price - ichi.cloudTop) / price) * 100;
  const exitAlertActive = kumoDistancePct <= EXIT_ALERT_KUMO_DISTANCE_PCT;

  const optionValid = !!chosen;
  const signalLabel = toSignalLabel(band, regime, optionValid, exitAlertActive);
  const strategy = toStrategy(signalLabel);

  return {
    ticker: data.ticker,
    date: opts.asOfDate,
    price,
    ichimoku: ichi,
    regime,
    technicalScore,
    optionsScore,
    compositeScore: composite,
    colorBand: band,
    signalLabel,
    strategy,
    chosenOption: chosen,
    premium: chosen?.premium ?? 0,
    yieldPct: chosen ? (chosen.premium / chosen.strike) * 100 : 0,
    dte: chosen?.dte ?? 0,
    kijunDistancePct,
    kumoDistancePct,
    exitAlertActive,
  };
}
