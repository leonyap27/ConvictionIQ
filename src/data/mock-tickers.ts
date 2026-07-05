import { OHLC_DAYS } from "@/lib/constants";
import type { OHLC, OptionContract, TickerData, Theme } from "@/lib/types";

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
  theme: Theme;
  startPrice: number;
  drift: number; // per-day expected return %
  vol: number; // daily volatility %
  earningsInDays: number | null;
}

const TICKERS: TickerSpec[] = [
  // US Mega Cap
  { ticker: "AAPL", companyName: "Apple Inc.", sector: "Technology", theme: "US Mega Cap", startPrice: 175, drift: 0.08, vol: 1.4, earningsInDays: 55 },
  { ticker: "MSFT", companyName: "Microsoft Corp.", sector: "Technology", theme: "US Mega Cap", startPrice: 385, drift: 0.09, vol: 1.3, earningsInDays: 48 },
  { ticker: "GOOGL", companyName: "Alphabet Inc.", sector: "Technology", theme: "US Mega Cap", startPrice: 140, drift: 0.06, vol: 1.6, earningsInDays: 65 },
  { ticker: "AMZN", companyName: "Amazon.com Inc.", sector: "Consumer Discretionary", theme: "US Mega Cap", startPrice: 145, drift: 0.05, vol: 1.8, earningsInDays: 33 },
  { ticker: "META", companyName: "Meta Platforms", sector: "Communication", theme: "US Mega Cap", startPrice: 340, drift: 0.10, vol: 2.0, earningsInDays: 40 },
  { ticker: "TSLA", companyName: "Tesla Inc.", sector: "Consumer Discretionary", theme: "US Mega Cap", startPrice: 240, drift: -0.05, vol: 3.5, earningsInDays: 18 },
  { ticker: "BRK", companyName: "Berkshire Hathaway B", sector: "Financials", theme: "US Mega Cap", startPrice: 370, drift: 0.04, vol: 1.0, earningsInDays: null },
  { ticker: "LLY", companyName: "Eli Lilly & Co.", sector: "Healthcare", theme: "US Mega Cap", startPrice: 620, drift: 0.11, vol: 1.8, earningsInDays: 63 },

  // US Tech & AI
  { ticker: "NVDA", companyName: "NVIDIA Corp.", sector: "Technology", theme: "US Tech & AI", startPrice: 480, drift: 0.15, vol: 2.8, earningsInDays: 22 },
  { ticker: "AMD", companyName: "Advanced Micro Devices", sector: "Technology", theme: "US Tech & AI", startPrice: 145, drift: 0.09, vol: 2.7, earningsInDays: 28 },
  { ticker: "ORCL", companyName: "Oracle Corp.", sector: "Technology", theme: "US Tech & AI", startPrice: 115, drift: 0.07, vol: 1.5, earningsInDays: 70 },
  { ticker: "CRM", companyName: "Salesforce Inc.", sector: "Technology", theme: "US Tech & AI", startPrice: 260, drift: 0.05, vol: 1.9, earningsInDays: 44 },
  { ticker: "ADBE", companyName: "Adobe Inc.", sector: "Technology", theme: "US Tech & AI", startPrice: 510, drift: 0.06, vol: 1.8, earningsInDays: 35 },
  { ticker: "INTC", companyName: "Intel Corp.", sector: "Technology", theme: "US Tech & AI", startPrice: 35, drift: -0.08, vol: 2.2, earningsInDays: 25 },
  { ticker: "QCOM", companyName: "Qualcomm Inc.", sector: "Technology", theme: "US Tech & AI", startPrice: 165, drift: 0.05, vol: 2.0, earningsInDays: 31 },
  { ticker: "AMAT", companyName: "Applied Materials", sector: "Technology", theme: "US Tech & AI", startPrice: 185, drift: 0.07, vol: 2.2, earningsInDays: 50 },
  { ticker: "MU", companyName: "Micron Technology", sector: "Technology", theme: "US Tech & AI", startPrice: 95, drift: 0.06, vol: 2.6, earningsInDays: 20 },
  { ticker: "AVGO", companyName: "Broadcom Inc.", sector: "Technology", theme: "US Tech & AI", startPrice: 870, drift: 0.08, vol: 1.9, earningsInDays: 58 },
  { ticker: "NOW", companyName: "ServiceNow Inc.", sector: "Technology", theme: "US Tech & AI", startPrice: 720, drift: 0.09, vol: 2.0, earningsInDays: 42 },
  { ticker: "SNOW", companyName: "Snowflake Inc.", sector: "Technology", theme: "US Tech & AI", startPrice: 160, drift: 0.04, vol: 3.2, earningsInDays: 30 },
  { ticker: "PLTR", companyName: "Palantir Technologies", sector: "Technology", theme: "US Tech & AI", startPrice: 22, drift: 0.06, vol: 3.8, earningsInDays: 38 },

  // US Financials
  { ticker: "JPM", companyName: "JPMorgan Chase", sector: "Financials", theme: "US Financials", startPrice: 175, drift: 0.05, vol: 1.2, earningsInDays: 50 },
  { ticker: "GS", companyName: "Goldman Sachs", sector: "Financials", theme: "US Financials", startPrice: 380, drift: 0.04, vol: 1.4, earningsInDays: 60 },
  { ticker: "BAC", companyName: "Bank of America", sector: "Financials", theme: "US Financials", startPrice: 34, drift: 0.03, vol: 1.5, earningsInDays: 52 },
  { ticker: "V", companyName: "Visa Inc.", sector: "Financials", theme: "US Financials", startPrice: 265, drift: 0.06, vol: 1.1, earningsInDays: 38 },
  { ticker: "MA", companyName: "Mastercard Inc.", sector: "Financials", theme: "US Financials", startPrice: 430, drift: 0.07, vol: 1.2, earningsInDays: 42 },
  { ticker: "WFC", companyName: "Wells Fargo & Co.", sector: "Financials", theme: "US Financials", startPrice: 48, drift: 0.04, vol: 1.4, earningsInDays: 55 },
  { ticker: "MS", companyName: "Morgan Stanley", sector: "Financials", theme: "US Financials", startPrice: 88, drift: 0.04, vol: 1.5, earningsInDays: 48 },
  { ticker: "AXP", companyName: "American Express", sector: "Financials", theme: "US Financials", startPrice: 185, drift: 0.05, vol: 1.3, earningsInDays: 43 },
  { ticker: "BLK", companyName: "BlackRock Inc.", sector: "Financials", theme: "US Financials", startPrice: 790, drift: 0.05, vol: 1.3, earningsInDays: 40 },

  // US Healthcare
  { ticker: "JNJ", companyName: "Johnson & Johnson", sector: "Healthcare", theme: "US Healthcare", startPrice: 158, drift: 0.02, vol: 0.9, earningsInDays: 58 },
  { ticker: "UNH", companyName: "UnitedHealth Group", sector: "Healthcare", theme: "US Healthcare", startPrice: 520, drift: 0.05, vol: 1.4, earningsInDays: 34 },
  { ticker: "PFE", companyName: "Pfizer Inc.", sector: "Healthcare", theme: "US Healthcare", startPrice: 28, drift: -0.06, vol: 1.5, earningsInDays: 25 },
  { ticker: "ABBV", companyName: "AbbVie Inc.", sector: "Healthcare", theme: "US Healthcare", startPrice: 165, drift: 0.04, vol: 1.2, earningsInDays: 47 },
  { ticker: "MRK", companyName: "Merck & Co.", sector: "Healthcare", theme: "US Healthcare", startPrice: 110, drift: 0.03, vol: 1.1, earningsInDays: 62 },
  { ticker: "TMO", companyName: "Thermo Fisher Scientific", sector: "Healthcare", theme: "US Healthcare", startPrice: 540, drift: 0.04, vol: 1.3, earningsInDays: 50 },
  { ticker: "DHR", companyName: "Danaher Corp.", sector: "Healthcare", theme: "US Healthcare", startPrice: 230, drift: 0.03, vol: 1.4, earningsInDays: 56 },
  { ticker: "ISRG", companyName: "Intuitive Surgical", sector: "Healthcare", theme: "US Healthcare", startPrice: 380, drift: 0.07, vol: 1.8, earningsInDays: 29 },

  // US Energy
  { ticker: "XOM", companyName: "Exxon Mobil", sector: "Energy", theme: "US Energy", startPrice: 110, drift: 0.02, vol: 1.7, earningsInDays: 46 },
  { ticker: "CVX", companyName: "Chevron Corp.", sector: "Energy", theme: "US Energy", startPrice: 155, drift: -0.02, vol: 1.6, earningsInDays: 39 },
  { ticker: "COP", companyName: "ConocoPhillips", sector: "Energy", theme: "US Energy", startPrice: 115, drift: -0.03, vol: 1.9, earningsInDays: 55 },
  { ticker: "SLB", companyName: "Schlumberger", sector: "Energy", theme: "US Energy", startPrice: 52, drift: -0.05, vol: 2.1, earningsInDays: 30 },
  { ticker: "MPC", companyName: "Marathon Petroleum", sector: "Energy", theme: "US Energy", startPrice: 175, drift: 0.01, vol: 2.0, earningsInDays: 44 },
  { ticker: "PSX", companyName: "Phillips 66", sector: "Energy", theme: "US Energy", startPrice: 140, drift: 0.00, vol: 1.8, earningsInDays: 52 },

  // US Consumer
  { ticker: "WMT", companyName: "Walmart Inc.", sector: "Consumer Staples", theme: "US Consumer", startPrice: 165, drift: 0.06, vol: 1.0, earningsInDays: 41 },
  { ticker: "PG", companyName: "Procter & Gamble", sector: "Consumer Staples", theme: "US Consumer", startPrice: 155, drift: 0.03, vol: 0.9, earningsInDays: 68 },
  { ticker: "KO", companyName: "Coca-Cola Co.", sector: "Consumer Staples", theme: "US Consumer", startPrice: 60, drift: 0.02, vol: 0.8, earningsInDays: 36 },
  { ticker: "PEP", companyName: "PepsiCo Inc.", sector: "Consumer Staples", theme: "US Consumer", startPrice: 170, drift: 0.03, vol: 0.9, earningsInDays: 45 },
  { ticker: "COST", companyName: "Costco Wholesale", sector: "Consumer Staples", theme: "US Consumer", startPrice: 680, drift: 0.08, vol: 1.1, earningsInDays: 52 },
  { ticker: "HD", companyName: "Home Depot", sector: "Consumer Discretionary", theme: "US Consumer", startPrice: 340, drift: 0.05, vol: 1.3, earningsInDays: 43 },
  { ticker: "NKE", companyName: "Nike Inc.", sector: "Consumer Discretionary", theme: "US Consumer", startPrice: 105, drift: -0.04, vol: 1.6, earningsInDays: 29 },
  { ticker: "MCD", companyName: "McDonald's Corp.", sector: "Consumer Discretionary", theme: "US Consumer", startPrice: 285, drift: 0.03, vol: 1.0, earningsInDays: 51 },
  { ticker: "SBUX", companyName: "Starbucks Corp.", sector: "Consumer Discretionary", theme: "US Consumer", startPrice: 95, drift: -0.02, vol: 1.7, earningsInDays: 37 },
  { ticker: "LOW", companyName: "Lowe's Companies", sector: "Consumer Discretionary", theme: "US Consumer", startPrice: 225, drift: 0.04, vol: 1.3, earningsInDays: 48 },
  { ticker: "TGT", companyName: "Target Corp.", sector: "Consumer Discretionary", theme: "US Consumer", startPrice: 145, drift: -0.01, vol: 1.8, earningsInDays: 40 },

  // US Industrials
  { ticker: "BA", companyName: "Boeing Co.", sector: "Industrials", theme: "US Industrials", startPrice: 195, drift: -0.06, vol: 2.4, earningsInDays: 32 },
  { ticker: "CAT", companyName: "Caterpillar Inc.", sector: "Industrials", theme: "US Industrials", startPrice: 285, drift: 0.06, vol: 1.5, earningsInDays: 40 },
  { ticker: "GE", companyName: "GE Aerospace", sector: "Industrials", theme: "US Industrials", startPrice: 155, drift: 0.08, vol: 1.6, earningsInDays: 54 },
  { ticker: "UPS", companyName: "United Parcel Service", sector: "Industrials", theme: "US Industrials", startPrice: 148, drift: -0.02, vol: 1.3, earningsInDays: 46 },
  { ticker: "RTX", companyName: "RTX Corp.", sector: "Industrials", theme: "US Industrials", startPrice: 105, drift: 0.04, vol: 1.2, earningsInDays: 38 },
  { ticker: "HON", companyName: "Honeywell International", sector: "Industrials", theme: "US Industrials", startPrice: 195, drift: 0.03, vol: 1.1, earningsInDays: 55 },
  { ticker: "DE", companyName: "Deere & Co.", sector: "Industrials", theme: "US Industrials", startPrice: 380, drift: 0.05, vol: 1.6, earningsInDays: 45 },
  { ticker: "LMT", companyName: "Lockheed Martin", sector: "Industrials", theme: "US Industrials", startPrice: 470, drift: 0.03, vol: 1.1, earningsInDays: 50 },

  // US Communication
  { ticker: "DIS", companyName: "Walt Disney Co.", sector: "Communication", theme: "US Consumer", startPrice: 92, drift: -0.03, vol: 1.7, earningsInDays: 37 },
  { ticker: "NFLX", companyName: "Netflix Inc.", sector: "Communication", theme: "US Tech & AI", startPrice: 490, drift: 0.09, vol: 2.1, earningsInDays: 26 },
  { ticker: "T", companyName: "AT&T Inc.", sector: "Communication", theme: "US Consumer", startPrice: 17, drift: -0.02, vol: 1.2, earningsInDays: 49 },
  { ticker: "VZ", companyName: "Verizon Communications", sector: "Communication", theme: "US Consumer", startPrice: 40, drift: 0.01, vol: 1.1, earningsInDays: 44 },
  { ticker: "CMCSA", companyName: "Comcast Corp.", sector: "Communication", theme: "US Consumer", startPrice: 42, drift: 0.01, vol: 1.3, earningsInDays: 58 },

  // US ETFs
  { ticker: "SPY", companyName: "SPDR S&P 500 ETF", sector: "Index ETF", theme: "US ETFs", startPrice: 445, drift: 0.05, vol: 0.9, earningsInDays: null },
  { ticker: "QQQ", companyName: "Invesco QQQ Trust", sector: "Index ETF", theme: "US ETFs", startPrice: 380, drift: 0.07, vol: 1.1, earningsInDays: null },
  { ticker: "IWM", companyName: "iShares Russell 2000", sector: "Index ETF", theme: "US ETFs", startPrice: 195, drift: 0.02, vol: 1.4, earningsInDays: null },
  { ticker: "DIA", companyName: "SPDR Dow Jones ETF", sector: "Index ETF", theme: "US ETFs", startPrice: 355, drift: 0.04, vol: 0.8, earningsInDays: null },
  { ticker: "GLD", companyName: "SPDR Gold Trust", sector: "Commodity ETF", theme: "US ETFs", startPrice: 190, drift: 0.03, vol: 0.9, earningsInDays: null },
  { ticker: "XLF", companyName: "Financial Select Sector SPDR", sector: "Index ETF", theme: "US ETFs", startPrice: 38, drift: 0.04, vol: 1.0, earningsInDays: null },
  { ticker: "XLK", companyName: "Technology Select Sector SPDR", sector: "Index ETF", theme: "US ETFs", startPrice: 195, drift: 0.07, vol: 1.2, earningsInDays: null },
  { ticker: "XLE", companyName: "Energy Select Sector SPDR", sector: "Index ETF", theme: "US ETFs", startPrice: 88, drift: 0.01, vol: 1.5, earningsInDays: null },
  { ticker: "ARKK", companyName: "ARK Innovation ETF", sector: "Index ETF", theme: "US ETFs", startPrice: 48, drift: -0.02, vol: 2.8, earningsInDays: null },

  // SG Blue Chip
  { ticker: "D05", companyName: "DBS Group Holdings", sector: "Financials", theme: "SG Blue Chip", startPrice: 36, drift: 0.04, vol: 1.2, earningsInDays: 60 },
  { ticker: "O39", companyName: "OCBC Bank", sector: "Financials", theme: "SG Blue Chip", startPrice: 14, drift: 0.03, vol: 1.1, earningsInDays: 55 },
  { ticker: "U11", companyName: "UOB (United Overseas Bank)", sector: "Financials", theme: "SG Blue Chip", startPrice: 30, drift: 0.03, vol: 1.0, earningsInDays: 58 },
  { ticker: "Z74", companyName: "Singapore Telecommunications", sector: "Communication", theme: "SG Blue Chip", startPrice: 2.5, drift: 0.01, vol: 1.0, earningsInDays: 45 },
  { ticker: "S68", companyName: "Singapore Exchange (SGX)", sector: "Financials", theme: "SG Blue Chip", startPrice: 11, drift: 0.03, vol: 0.9, earningsInDays: 40 },
  { ticker: "G13", companyName: "Genting Singapore", sector: "Consumer Discretionary", theme: "SG Blue Chip", startPrice: 0.95, drift: 0.02, vol: 1.5, earningsInDays: 50 },
  { ticker: "Y92", companyName: "Thai Beverage PCL", sector: "Consumer Staples", theme: "SG Blue Chip", startPrice: 0.60, drift: 0.01, vol: 1.2, earningsInDays: null },
  { ticker: "BN4", companyName: "Keppel Corp.", sector: "Industrials", theme: "SG Blue Chip", startPrice: 7.0, drift: 0.03, vol: 1.3, earningsInDays: 52 },
  { ticker: "C6L", companyName: "Singapore Airlines", sector: "Industrials", theme: "SG Blue Chip", startPrice: 6.5, drift: 0.02, vol: 1.6, earningsInDays: 48 },

  // SG REITs
  { ticker: "A17U", companyName: "Ascendas REIT", sector: "Real Estate", theme: "SG REITs", startPrice: 2.80, drift: 0.02, vol: 1.0, earningsInDays: null },
  { ticker: "M44U", companyName: "Mapletree Logistics Trust", sector: "Real Estate", theme: "SG REITs", startPrice: 1.50, drift: 0.01, vol: 1.1, earningsInDays: null },
  { ticker: "J69U", companyName: "Frasers Centrepoint Trust", sector: "Real Estate", theme: "SG REITs", startPrice: 2.20, drift: 0.02, vol: 0.9, earningsInDays: null },
  { ticker: "C38U", companyName: "CapitaLand Integrated Commercial Trust", sector: "Real Estate", theme: "SG REITs", startPrice: 2.10, drift: 0.02, vol: 1.0, earningsInDays: null },
  { ticker: "N2IU", companyName: "Mapletree PanAsia Commercial Trust", sector: "Real Estate", theme: "SG REITs", startPrice: 1.30, drift: 0.01, vol: 1.2, earningsInDays: null },

  // SG Financials
  { ticker: "9CI", companyName: "CapitaLand Investment", sector: "Real Estate", theme: "SG Financials", startPrice: 2.90, drift: 0.02, vol: 1.3, earningsInDays: 60 },
  { ticker: "AIY", companyName: "AIA Group (SGX-listed)", sector: "Financials", theme: "SG Financials", startPrice: 8.20, drift: 0.03, vol: 1.2, earningsInDays: 50 },
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
      theme: spec.theme,
      ohlc,
      options,
      earningsInDays: spec.earningsInDays,
    };
  });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
