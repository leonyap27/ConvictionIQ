import { useAppStore } from "@/lib/store";
import type { ColorBand, SignalLabel, Strategy } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { BAND_LABEL } from "@/lib/constants";
import { X } from "lucide-react";

const SIGNALS: (SignalLabel | "All")[] = [
  "All",
  "SELL PUT",
  "WATCH",
  "WATCHLIST",
  "AVOID",
  "EXIT ALERT",
];
const BANDS: (ColorBand | "All")[] = [
  "All",
  "SuperGreen",
  "LightGreen",
  "Pink",
  "SuperRed",
];
const STRATEGIES: (Strategy | "All")[] = [
  "All",
  "Cash-Secured Put",
  "Long Equity",
  "Covered Call",
];

export function FilterBar() {
  const {
    filterSignal,
    filterBand,
    filterStrategy,
    setFilterSignal,
    setFilterBand,
    setFilterStrategy,
    resetFilters,
  } = useAppStore();

  const hasFilters =
    filterSignal !== "All" || filterBand !== "All" || filterStrategy !== "All";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={filterSignal}
        onValueChange={(v) => setFilterSignal(v as SignalLabel | "All")}
      >
        <SelectTrigger className="h-9 w-[140px]">
          <SelectValue placeholder="Signal" />
        </SelectTrigger>
        <SelectContent>
          {SIGNALS.map((s) => (
            <SelectItem key={s} value={s}>
              {s === "All" ? "All signals" : s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filterBand}
        onValueChange={(v) => setFilterBand(v as ColorBand | "All")}
      >
        <SelectTrigger className="h-9 w-[140px]">
          <SelectValue placeholder="Band" />
        </SelectTrigger>
        <SelectContent>
          {BANDS.map((b) => (
            <SelectItem key={b} value={b}>
              {b === "All" ? "All bands" : BAND_LABEL[b]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filterStrategy}
        onValueChange={(v) => setFilterStrategy(v as Strategy | "All")}
      >
        <SelectTrigger className="h-9 w-[170px]">
          <SelectValue placeholder="Strategy" />
        </SelectTrigger>
        <SelectContent>
          {STRATEGIES.map((s) => (
            <SelectItem key={s} value={s}>
              {s === "All" ? "All strategies" : s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => resetFilters()}
          className="text-muted-foreground"
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      )}
    </div>
  );
}
