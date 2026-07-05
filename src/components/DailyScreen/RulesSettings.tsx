import { useState, KeyboardEvent } from "react";
import { useAppStore } from "@/lib/store";
import { ALL_THEMES } from "@/lib/constants";
import type { Theme } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { X, RotateCcw } from "lucide-react";

export function RulesSettings() {
  const includedThemes = useAppStore((s) => s.includedThemes);
  const minCompositeScore = useAppStore((s) => s.minCompositeScore);
  const excludedTickers = useAppStore((s) => s.excludedTickers);
  const maxDisplay = useAppStore((s) => s.maxDisplay);
  const setIncludedThemes = useAppStore((s) => s.setIncludedThemes);
  const setMinCompositeScore = useAppStore((s) => s.setMinCompositeScore);
  const setExcludedTickers = useAppStore((s) => s.setExcludedTickers);
  const setMaxDisplay = useAppStore((s) => s.setMaxDisplay);
  const resetRules = useAppStore((s) => s.resetRules);

  const [tickerInput, setTickerInput] = useState("");

  function toggleTheme(theme: Theme) {
    if (includedThemes.includes(theme)) {
      setIncludedThemes(includedThemes.filter((t) => t !== theme));
    } else {
      setIncludedThemes([...includedThemes, theme]);
    }
  }

  function commitTickerInput() {
    const raw = tickerInput.trim();
    if (!raw) return;
    const parsed = raw
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    const merged = Array.from(new Set([...excludedTickers, ...parsed]));
    setExcludedTickers(merged);
    setTickerInput("");
  }

  function handleTickerKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitTickerInput();
    }
  }

  function removeTicker(ticker: string) {
    setExcludedTickers(excludedTickers.filter((t) => t !== ticker));
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 text-sm">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">

        {/* Theme selector */}
        <div className="lg:col-span-2">
          <Label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Themes
            {includedThemes.length === 0 && (
              <span className="ml-2 font-normal normal-case text-muted-foreground/60">
                — all themes
              </span>
            )}
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {ALL_THEMES.map((theme) => {
              const active = includedThemes.includes(theme);
              return (
                <button
                  key={theme}
                  type="button"
                  onClick={() => toggleTheme(theme)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground",
                  )}
                  aria-pressed={active}
                >
                  {theme}
                </button>
              );
            })}
          </div>
        </div>

        {/* Min composite score */}
        <div>
          <Label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Min score:{" "}
            <span className="font-mono text-foreground">{minCompositeScore}</span>
          </Label>
          <Slider
            min={0}
            max={100}
            step={5}
            value={[minCompositeScore]}
            onValueChange={([v]) => setMinCompositeScore(v)}
            className="mt-3"
            aria-label="Minimum composite score"
          />
          <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground/60">
            <span>0</span>
            <span>50</span>
            <span>100</span>
          </div>
        </div>

        {/* Max display + excluded tickers */}
        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="maxDisplay" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Max rows
            </Label>
            <Input
              id="maxDisplay"
              type="number"
              min={5}
              max={50}
              step={5}
              value={maxDisplay}
              onChange={(e) => {
                const v = Math.max(5, Math.min(50, Number(e.target.value)));
                setMaxDisplay(v);
              }}
              className="h-8 w-24 tabular"
            />
          </div>

          <div>
            <Label htmlFor="excludedTickers" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Exclude tickers
            </Label>
            <Input
              id="excludedTickers"
              placeholder="AMZN, TSLA…"
              value={tickerInput}
              onChange={(e) => setTickerInput(e.target.value)}
              onBlur={commitTickerInput}
              onKeyDown={handleTickerKeyDown}
              className="h-8"
            />
            {excludedTickers.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {excludedTickers.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => removeTicker(t)}
                      className="ml-0.5 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      aria-label={`Remove ${t} from exclusions`}
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end border-t border-border pt-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={resetRules}
          className="text-muted-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset rules
        </Button>
      </div>
    </div>
  );
}
