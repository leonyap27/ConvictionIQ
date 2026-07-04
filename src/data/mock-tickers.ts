import { OHLC_DAYS } from "@/lib/constants";
import type { OHLC, OptionContract, TickerData } from "@/lib/types";

// Seeded PRNG for reproducibility
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

interface TickerSpec {
  ticker: string;
  companyName: string;
  sector: string;
  startPrice: number;
  drift: number; // per-day expected return %
  vol: number; // daily volatility %
  earningsInDays: number | null;
}

const TICKERS: TickerSpec[] = [
  { ticker: "AAPL", companyName: "Apple Inc.", sector: "Technology", startPrice: 175, drift: 0.08, vol: 1.4, earningsInDays: 55 },
  { ticker: "MSFT", companyName: "Microsoft Corp.", sector: "Technology", startPrice: 385, drift: 0.09, vol: 1.3, earningsInDays: 48 },
  { ticker: "NVDA", companyName: "NVIDIA Corp.", sector: "Technology", startPrice: 480, drift: 0.15, vol: 2.8, earningsInDays: 22 },
  { ticker: "GOOGL", companyName: "Alphabet Inc.", sector: "Technology", startPrice: 140, drift: 0.06, vol: 1.6, earningsInDays: 65 },
  { ticker: "META", companyName: "Meta Platforms", sector: "Technology", startPrice: 340, drift: 0.10, vol: 2.0, earningsInDays: 40 },
  { ticker: "AMZN", companyName: "Amazon.com Inc.", sector: "Consumer Discretionary", startPrice: 145, drift: 0.05, vol: 1.8, earningsInDays: 33 },
  { ticker: "TSLA", companyName: "Tesla Inc.", sector: "Consumer Discretionary", startPrice: 240, drift: -0.05, vol: 3.5, earningsInDays: 18 },
  { ticker: "ORCL", companyName: "Oracle Corp.", sector: "Technology", startPrice: 115, drift: 0.07, vol: 1.5, earningsInDays: 70 },
  { ticker: "CRM", companyName: "Salesforce Inc.", sector: "Technology", startPrice: 260, drift: 0.05, vol: 1.9, earningsInDays: 44 },
  { ticker: "AMD", companyName: "Advanced Micro Devices", sector: "Technology", startPrice: 145, drift: 0.09, vol: 2.7, earningsInDays: 28 },
  { ticker: "JPM", companyName: "JPMorgan Chase", sector: "Financials", startPrice: 175, drift: 0.05, vol: 1.2, earningsInDays: 50 },
  { ticker: "GS", companyName: "Goldman Sachs", sector: "Financials", startPrice: 380, drift: 0.04, vol: 1.4, earningsInDays: 60 },
  { ticker: "BAC", companyName: "Bank of America", sector: "Financials", startPrice: 34, drift: 0.03, vol: 1.5, earningsInDays: 52 },
  { ticker: "V", companyName: "Visa Inc.", sector: "Financials", startPrice: 265, drift: 0.06, vol: 1.1, earningsInDays: 38 },
  { ticker: "MA", companyName: "Mastercard Inc.", sector: "Financials", startPrice: 430, drift: 0.07, vol: 1.2, earningsInDays: 42 },
  { ticker: "XOM", companyName: "Exxon Mobil", sector: "Energy", startPrice: 110, drift: 0.02, vol: 1.7, earningsInDays: 46 },
  { ticker: "CVX", companyName: "Chevron Corp.", sector: "Energy", startPrice: 155, drift: -0.02, vol: 1.6, earningsInDays: 39 },
  { ticker: "COP", companyName: "ConocoPhillips", sector: "Energy", startPrice: 115, drift: -0.03, vol: 1.9, earningsInDays: 55 },
  { ticker: "SLB", companyName: "Schlumberger", sector: "Energy", startPrice: 52, drift: -0.05, vol: 2.1, earningsInDays: 30 },
  { ticker: "JNJ", companyName: "Johnson & Johnson", sector: "Healthcare", startPrice: 158, drift: 0.02, vol: 0.9, earningsInDays: 58 },
  { ticker: "UNH", companyName: "UnitedHealth Group", sector: "Healthcare", startPrice: 520, drift: 0.05, vol: 1.4, earningsInDays: 34 },
  { ticker: "PFE", companyName: "Pfizer Inc.", sector: "Healthcare", startPrice: 28, drift: -0.06, vol: 1.5, earningsInDays: 25 },
  { ticker: "LLY", companyName: "Eli Lilly & Co.", sector: "Healthcare", startPrice: 620, drift: 0.11, vol: 1.8, earningsInDays: 63 },
  { ticker: "ABBV", companyName: "AbbVie Inc.", sector: "Healthcare", startPrice: 165, drift: 0.04, vol: 1.2, earningsInDays: 47 },
  { ticker: "WMT", companyName: "Walmart Inc.", sector: "Consumer Staples", startPrice: 165, drift: 0.06, vol: 1.0, earningsInDays: 41 },
  { ticker: "PG", companyName: "Procter & Gamble", sector: "Consumer Staples", startPrice: 155, drift: 0.03, vol: 0.9, earningsInDays: 68 },
  { ticker: "KO", companyName: "Coca-Cola Co.", sector: "Consumer Staples", startPrice: 60, drift: 0.02, vol: 0.8, earningsInDays: 36 },
  { ticker: "PEP", companyName: "PepsiCo Inc.", sector: "Consumer Staples", startPrice: 170, drift: 0.03, vol: 0.9, earningsInDays: 45 },
  { ticker: "COST", companyName: "Costco Wholesale", sector: "Consumer Staples", startPrice: 680, drift: 0.08, vol: 1.1, earningsInDays: 52 },
  { ticker: "HD", companyName: "Home Depot", sector: "Consumer Discretionary", startPrice: 340, drift: 0.05, vol: 1.3, earningsInDays: 43 },
  { ticker: "NKE", companyName: "Nike Inc.", sector: "Consumer Discretionary", startPrice: 105, drift: -0.04, vol: 1.6, earningsInDays: 29 },
  { ticker: "MCD", companyName: "McDonald's Corp.", sector: "Consumer Discretionary", startPrice: 285, drift: 0.03, vol: 1.0, earningsInDays: 51 },
  { ticker: "DIS", companyName: "Walt Disney Co.", sector: "Communication", startPrice: 92, drift: -0.03, vol: 1.7, earningsInDays: 37 },
  { ticker: "NFLX", companyName: "Netflix Inc.", sector: "Communication", startPrice: 490, drift: 0.09, vol: 2.1, earningsInDays: 26 },
  { ticker: "T", companyName: "AT&T Inc.", sector: "Communication", startPrice: 17, drift: -0.02, vol: 1.2, earningsInDays: 49 },
  { ticker: "VZ", companyName: "Verizon Communications", sector: "Communication", startPrice: 40, drift: 0.01, vol: 1.1, earningsInDays: 44 },
  { ticker: "BA", companyName: "Boeing Co.", sector: "Industrials", startPrice: 195, drift: -0.06, vol: 2.4, earningsInDays: 32 },
  { ticker: "CAT", companyName: "Caterpillar Inc.", sector: "Industrials", startPrice: 285, drift: 0.06, vol: 1.5, earningsInDays: 40 },
  { ticker: "GE", companyName: "General Electric", sector: "Industrials", startPrice: 155, drift: 0.08, vol: 1.6, earningsInDays: 54 },
  { ticker: "UPS", companyName: "United Parcel Service", sector: "Industrials", startPrice: 148, drift: -0.02, vol: 1.3, earningsInDays: 46 },
  { ticker: "SPY", companyName: "SPDR S&P 500 ETF", sector: "Index ETF", startPrice: 445, drift: 0.05, vol: 0.9, earningsInDays: null },
  { ticker: "QQQ", companyName: "Invesco QQQ Trust", sector: "Index ETF", startPrice: 380, drift: 0.07, vol: 1.1, earningsInDays: null },
  { ticker: "IWM", companyName: "iShares Russell 2000", sector: "Index ETF", startPrice: 195, drift: 0.02, vol: 1.4, earningsInDays: null },
  { ticker: "DIA", companyName: "SPDR Dow Jones ETF", sector: "Index ETF", startPrice: 355, drift: 0.04, vol: 0.8, earningsInDays: null },
  { ticker: "GLD", companyName: "SPDR Gold Trust", sector: "Commodity ETF", startPrice: 190, drift: 0.03, vol: 0.9, earningsInDays: null },
];

function generateOHLC(spec: TickerSpec, days: number, endDate: Date): OHLC[] {
  const rand = mulberry32(hashSeed(spec.ticker));
  const bars: OHLC[] = [];
  let price = spec.startPrice;
  for (let i = 0; i < days; i++) {
    const shock = (rand() - 0.5) * 2 * spec.vol;
    const dailyReturn = spec.drift / 100 + shock / 100;
    const close = price * (1 + dailyReturn);
    const range = Math.abs(shock) * price * 0.7;
    const open = price;
    const high = Math.max(open, close) + rand() * range * 0.5;
    const low = Math.min(open, close) - rand() * range * 0.5;
    const volume = Math.round(1e6 + rand() * 5e7);
    const date = new Date(endDate);
    date.setUTCDate(endDate.getUTCDate() - (days - 1 - i));
    bars.push({
      date: date.toISOString().slice(0, 10),
      open: round2(open),
      high: round2(high),
      low: round2(low),
      close: round2(close),
      volume,
    });
    price = close;
  }
  return bars;
}

function generateOptions(spec: TickerSpec, price: number): OptionContract[] {
  const rand = mulberry32(hashSeed(spec.ticker + "opt"));
  const chain: OptionContract[] = [];
  const dtes = [7, 14, 21, 28, 35, 42, 49, 56];
  for (const dte of dtes) {
    for (let pct = 3; pct <= 15; pct += 2) {
      const strike = round2(price * (1 - pct / 100));
      // simplistic Black-Scholes-esque premium proxy
      const ivFactor = spec.vol / 100;
      const timeFactor = Math.sqrt(dte / 365);
      const premium = round2(price * ivFactor * timeFactor * (0.4 + rand() * 0.5));
      const delta = -Math.max(0.05, 0.5 - (pct / 100) * 4 + (rand() - 0.5) * 0.05);
      chain.push({
        strike,
        premium,
        dte,
        openInterest: Math.round(100 + rand() * 5000),
        delta: round2(delta),
      });
    }
  }
  return chain;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function generateAllTickers(referenceDate: Date): TickerData[] {
  return TICKERS.map((spec) => {
    const ohlc = generateOHLC(spec, OHLC_DAYS, referenceDate);
    const lastPrice = ohlc[ohlc.length - 1].close;
    const options = generateOptions(spec, lastPrice);
    return {
      ticker: spec.ticker,
      companyName: spec.companyName,
      sector: spec.sector,
      ohlc,
      options,
      earningsInDays: spec.earningsInDays,
    };
  });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
