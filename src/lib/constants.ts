import type { ColorBand, SignalLabel } from "./types";

export const ROUTES = {
  daily: "/",
  briefing: "/briefing",
  memory: "/memory",
  portfolio: "/portfolio",
  mcpSetup: "/mcp-setup",
} as const;

export const NAV_ITEMS = [
  { path: ROUTES.daily, label: "Daily Screen" },
  { path: ROUTES.briefing, label: "Briefing" },
  { path: ROUTES.memory, label: "Memory" },
  { path: ROUTES.portfolio, label: "Portfolio" },
  { path: ROUTES.mcpSetup, label: "MCP" },
] as const;

// Scoring thresholds
export const BAND_THRESHOLDS = {
  superGreen: 80,
  lightGreen: 65,
  pink: 45,
} as const;

export const OPTIONS_DTE_MIN = 20;
export const OPTIONS_DTE_MAX = 50;
export const OPTIONS_DTE_IDEAL_MIN = 25;
export const OPTIONS_DTE_IDEAL_MAX = 45;
export const MIN_PREMIUM_YIELD_PCT = 0.8;
export const MAX_SECTOR_EXPOSURE_PCT = 30;
export const EXIT_ALERT_KUMO_DISTANCE_PCT = -1.0; // price entered cloud from above

export const HISTORY_DAYS = 14; // seeded historical snapshots
export const OHLC_DAYS = 200;

export const BAND_ROW_CLASS: Record<ColorBand, string> = {
  SuperGreen: "band-supergreen hover:brightness-110",
  LightGreen: "band-lightgreen hover:brightness-110",
  Pink: "band-pink hover:brightness-110",
  SuperRed: "band-superred hover:brightness-110",
};

export const BAND_LABEL: Record<ColorBand, string> = {
  SuperGreen: "Super Green",
  LightGreen: "Light Green",
  Pink: "Pink",
  SuperRed: "Super Red",
};

export const BAND_CHIP_CLASS: Record<ColorBand, string> = {
  SuperGreen: "bg-band-supergreen text-band-supergreen-fg border border-band-supergreen-fg/30",
  LightGreen: "bg-band-lightgreen text-band-lightgreen-fg border border-band-lightgreen-fg/30",
  Pink: "bg-band-pink text-band-pink-fg border border-band-pink-fg/30",
  SuperRed: "bg-band-superred text-band-superred-fg border border-band-superred-fg/30",
};

export const SIGNAL_CHIP_CLASS: Record<SignalLabel, string> = {
  "SELL PUT": "bg-signal-sellput text-white",
  WATCH: "bg-signal-watch text-primary-foreground",
  WATCHLIST: "bg-signal-watchlist text-white",
  AVOID: "bg-signal-avoid text-white",
  "EXIT ALERT": "bg-signal-exit text-white",
};

export const DECISION_LABELS = [
  "Accepted",
  "Rejected",
  "Modified",
  "Watch Only",
  "Closed",
  "Lesson Learned",
] as const;

export const STORAGE_KEYS = {
  seededVersion: "convictioniq_seed_v1",
  currentDate: "convictioniq_current_date_v1",
} as const;
