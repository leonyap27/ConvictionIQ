// Domain types for ConvictionIQ

// ── Queue App Shell types ──────────────────────────────────────────────────

export type AssetClass = "US Options" | "SG Stock" | "HK Stock" | "Crypto";
export type ActionType = "ledger" | "followup";

export interface CoWorkAnalysis {
  id: string;
  ticker: string;
  asset_class: AssetClass;
  exchange: string; // "NASDAQ", "SGX", "HKEX", "Global"
  color_band: ColorBand;
  signal_label: SignalLabel;
  suggested_action: string;
  analyst_note: string;
  analysed_at: string; // ISO date
}

export interface ActionedRecord extends CoWorkAnalysis {
  actioned_at: string; // ISO date
  action_type: ActionType;
  decision_notes: string;
}

export interface FollowUpRecord extends CoWorkAnalysis {
  followup_at: string; // ISO date when to revisit
  reminder_note: string;
}

// ── End Queue App Shell types ──────────────────────────────────────────────

export type ColorBand = "SuperGreen" | "LightGreen" | "Pink" | "SuperRed";
export type SignalLabel =
  "SELL PUT" | "WATCH" | "WATCHLIST" | "AVOID" | "EXIT ALERT" | "HOLD";

export type Theme =
  | "US Mega Cap"
  | "US Tech & AI"
  | "US Financials"
  | "US Healthcare"
  | "US Energy"
  | "US Consumer"
  | "US Industrials"
  | "US ETFs"
  | "SG Blue Chip"
  | "SG REITs"
  | "SG Financials";

export interface RuleSet {
  id: string;
  includedThemes: Theme[];
  minCompositeScore: number;
  excludedTickers: string[];
  maxDisplay: number;
}
export type Strategy = "Cash-Secured Put" | "Long Equity" | "Covered Call";
export type Regime = "Bullish" | "Neutral" | "Bearish";
export type DecisionLabel =
  | "Accepted"
  | "Rejected"
  | "Modified"
  | "Watch Only"
  | "Closed"
  | "Lesson Learned";
export type RecommendationStatus = "Active" | "Watching" | "Closed";

export interface OHLC {
  date: string; // ISO date
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IchimokuValues {
  tenkan: number;
  kijun: number;
  senkouA: number;
  senkouB: number;
  chikou: number;
  cloudTop: number;
  cloudBottom: number;
}

export interface OptionContract {
  strike: number;
  premium: number;
  dte: number;
  openInterest: number;
  delta: number; // proxy
}

export interface TickerData {
  ticker: string;
  companyName: string;
  sector: string;
  theme: Theme;
  ohlc: OHLC[]; // 60+ days
  options: OptionContract[];
  earningsInDays: number | null; // days until next earnings, null if unknown/none soon
}

export interface DailySnapshot {
  ticker: string;
  date: string; // ISO date
  price: number;
  ichimoku: IchimokuValues;
  regime: Regime;
  technicalScore: number;
  optionsScore: number;
  compositeScore: number;
  colorBand: ColorBand;
  signalLabel: SignalLabel;
  strategy: Strategy;
  chosenOption: OptionContract | null;
  premium: number;
  yieldPct: number;
  dte: number;
  kijunDistancePct: number;
  kumoDistancePct: number;
  exitAlertActive: boolean;
  // Quality gate
  gate: QualityGateResult;
}

export interface QualityGateResult {
  passed: boolean;
  checks: {
    dataFreshness: { passed: boolean; message: string };
    regimeValidity: { passed: boolean; message: string };
    riskFilter: { passed: boolean; message: string };
    optionsValidity: { passed: boolean; message: string };
    portfolioExposure: { passed: boolean; message: string };
    exitPlanCompleteness: { passed: boolean; message: string };
  };
}

export interface ExitPlan {
  reviewTrigger: string;
  exitAlertLevel: string;
  takeProfitCondition: string;
  avoidReEntryCondition: string;
}

export interface StudyCard {
  ticker: string;
  strategy: Strategy;
  generatedAt: string;
  snapshot: DailySnapshot;
  whyItPassed: ReasoningBullet[];
  risks: ReasoningBullet[];
  exitPlan: ExitPlan;
  exposureNote: string;
}

export interface ReasoningBullet {
  input: string; // named scoring input
  text: string;
}

export interface Holding {
  id: string;
  ticker: string;
  positionSize: number; // shares
  sector: string;
  entryPrice: number;
}

export interface Decision {
  label: DecisionLabel;
  notes: string;
  decidedAt: string;
}

export interface RecommendationRecord {
  id: string;
  ticker: string;
  strategy: Strategy;
  createdAt: string;
  updatedAt: string;
  status: RecommendationStatus;
  scoreAtEntry: number;
  colorBandAtEntry: ColorBand;
  signalLabelAtEntry: SignalLabel;
  originalStudyCard: StudyCard;
  decision: Decision | null;
  notes: string;
}

export interface MonitoringLogEntry {
  id: string;
  recordId: string;
  date: string;
  compositeScore: number;
  scoreDelta: number;
  colorBand: ColorBand;
  colorBandChanged: boolean;
  signalLabel: SignalLabel;
  signalLabelChanged: boolean;
  kijunDistancePct: number;
  kumoDistancePct: number;
  premium: number;
  premiumChangePct: number;
  exitAlertActive: boolean;
  summary: string;
}

// Scoring inputs (price, regime, ichimoku, options) are already embedded in
// DailySnapshot — no separate ScoringInputs type is needed for the prototype.

export type BriefingCategory =
  | "new-setup"
  | "improved"
  | "weakened"
  | "review-trigger"
  | "exit-alert"
  | "income";

export type BriefingItem =
  | { category: "new-setup"; snapshot: DailySnapshot }
  | { category: "income"; snapshot: DailySnapshot }
  | {
      category: "improved";
      snapshot: DailySnapshot;
      recommendation: RecommendationRecord;
      scoreDelta: number;
    }
  | {
      category: "weakened";
      snapshot: DailySnapshot;
      recommendation: RecommendationRecord;
      scoreDelta: number;
    }
  | {
      category: "review-trigger";
      snapshot: DailySnapshot;
      recommendation: RecommendationRecord;
    }
  | {
      category: "exit-alert";
      snapshot: DailySnapshot;
      recommendation: RecommendationRecord;
    };
