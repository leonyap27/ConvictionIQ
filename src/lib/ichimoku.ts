import type { IchimokuValues, OHLC } from "./types";

// Standard Ichimoku periods
const TENKAN_PERIOD = 9;
const KIJUN_PERIOD = 26;
const SENKOU_B_PERIOD = 52;
const SHIFT = 26;

function highLowMidpoint(bars: OHLC[]): number {
  const highs = bars.map((b) => b.high);
  const lows = bars.map((b) => b.low);
  return (Math.max(...highs) + Math.min(...lows)) / 2;
}

/**
 * Compute Ichimoku for the LAST bar in the series.
 * Requires at least 52+26 bars for full accuracy; falls back gracefully otherwise.
 */
export function computeIchimoku(ohlc: OHLC[]): IchimokuValues {
  const n = ohlc.length;
  const slice = (period: number) =>
    ohlc.slice(Math.max(0, n - period), n);

  const tenkan = highLowMidpoint(slice(TENKAN_PERIOD));
  const kijun = highLowMidpoint(slice(KIJUN_PERIOD));
  // For a "current" view of the cloud in front of price, use the leading spans
  // computed from data ending SHIFT bars ago (they were projected forward).
  const projectedEnd = Math.max(1, n - SHIFT);
  const projSlice = (period: number) =>
    ohlc.slice(Math.max(0, projectedEnd - period), projectedEnd);
  const senkouA =
    (highLowMidpoint(projSlice(TENKAN_PERIOD)) +
      highLowMidpoint(projSlice(KIJUN_PERIOD))) /
    2;
  const senkouB = highLowMidpoint(projSlice(SENKOU_B_PERIOD));
  const chikou = ohlc[n - 1].close; // simplified

  return {
    tenkan,
    kijun,
    senkouA,
    senkouB,
    cloudTop: Math.max(senkouA, senkouB),
    cloudBottom: Math.min(senkouA, senkouB),
    chikou,
  };
}
