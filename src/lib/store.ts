import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ColorBand, SignalLabel, Strategy, Theme } from "./types";
import { DEFAULT_RULES } from "./constants";

interface RulesState {
  includedThemes: Theme[];
  minCompositeScore: number;
  excludedTickers: string[];
  maxDisplay: number;
  setIncludedThemes: (themes: Theme[]) => void;
  setMinCompositeScore: (n: number) => void;
  setExcludedTickers: (tickers: string[]) => void;
  setMaxDisplay: (n: number) => void;
  resetRules: () => void;
}

interface AppState extends RulesState {
  currentDate: string; // ISO date — simulated "today", can be advanced
  setCurrentDate: (d: string) => void;
  advanceDay: () => void;

  filterSignal: SignalLabel | "All";
  filterBand: ColorBand | "All";
  filterStrategy: Strategy | "All";
  setFilterSignal: (s: SignalLabel | "All") => void;
  setFilterBand: (b: ColorBand | "All") => void;
  setFilterStrategy: (s: Strategy | "All") => void;
  resetFilters: () => void;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentDate: todayISO(),
      setCurrentDate: (d) => set({ currentDate: d }),
      advanceDay: () =>
        set((s) => ({ currentDate: addDays(s.currentDate, 1) })),

      filterSignal: "All",
      filterBand: "All",
      filterStrategy: "All",
      setFilterSignal: (s) => set({ filterSignal: s }),
      setFilterBand: (b) => set({ filterBand: b }),
      setFilterStrategy: (s) => set({ filterStrategy: s }),
      resetFilters: () =>
        set({ filterSignal: "All", filterBand: "All", filterStrategy: "All" }),

      // Rules — persisted to localStorage
      includedThemes: [...DEFAULT_RULES.includedThemes],
      minCompositeScore: DEFAULT_RULES.minCompositeScore,
      excludedTickers: [...DEFAULT_RULES.excludedTickers],
      maxDisplay: DEFAULT_RULES.maxDisplay,
      setIncludedThemes: (themes) => set({ includedThemes: themes }),
      setMinCompositeScore: (n) => set({ minCompositeScore: n }),
      setExcludedTickers: (tickers) => set({ excludedTickers: tickers }),
      setMaxDisplay: (n) => set({ maxDisplay: n }),
      resetRules: () =>
        set({
          includedThemes: [...DEFAULT_RULES.includedThemes],
          minCompositeScore: DEFAULT_RULES.minCompositeScore,
          excludedTickers: [...DEFAULT_RULES.excludedTickers],
          maxDisplay: DEFAULT_RULES.maxDisplay,
        }),
    }),
    {
      name: "convictioniq_ui_v1",
      partialize: (s) => ({
        currentDate: s.currentDate,
        includedThemes: s.includedThemes,
        minCompositeScore: s.minCompositeScore,
        excludedTickers: s.excludedTickers,
        maxDisplay: s.maxDisplay,
      }),
    },
  ),
);
