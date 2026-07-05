import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { AssetClass } from "@/lib/types";
import { Settings2 } from "lucide-react";

const ASSET_CLASSES: AssetClass[] = ["US Options", "SG Stock", "HK Stock", "Crypto"];
const SETTINGS_KEY = "convictioniq_queue_settings_v1";
const VIEW_KEY = "convictioniq_queue_view_v1";

interface QueueSettings {
  enabledAssetClasses: AssetClass[];
  defaultView: "grouped" | "flat";
}

function loadSettings(): QueueSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw) as QueueSettings;
  } catch {
    // ignore parse errors
  }
  return {
    enabledAssetClasses: [...ASSET_CLASSES],
    defaultView: "grouped",
  };
}

function saveSettings(settings: QueueSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  // Also persist the view preference under its own key for easy reading by InboxScreen
  localStorage.setItem(VIEW_KEY, settings.defaultView);
}

export function QueueSettingsScreen() {
  const [settings, setSettings] = useState<QueueSettings>(loadSettings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    saveSettings(settings);
    setSaved(true);
    const t = setTimeout(() => setSaved(false), 1500);
    return () => clearTimeout(t);
  }, [settings]);

  function toggleAssetClass(ac: AssetClass) {
    setSettings((prev) => {
      const enabled = prev.enabledAssetClasses.includes(ac)
        ? prev.enabledAssetClasses.filter((x) => x !== ac)
        : [...prev.enabledAssetClasses, ac];
      return { ...prev, enabledAssetClasses: enabled };
    });
  }

  function setView(view: "grouped" | "flat") {
    setSettings((prev) => ({ ...prev, defaultView: view }));
  }

  return (
    <div className="mx-auto max-w-[640px] px-4 py-6 md:px-6">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Settings2 className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight">Queue Settings</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Customize how the Analysis Inbox displays and filters your queue.
        </p>
      </div>

      <div className="space-y-6">
        {/* Asset class filters */}
        <section
          aria-labelledby="asset-class-heading"
          className="rounded-lg border border-border bg-card p-5"
        >
          <h2
            id="asset-class-heading"
            className="mb-1 text-sm font-semibold text-foreground"
          >
            Asset class visibility
          </h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Choose which asset classes appear in the Inbox grouped view.
          </p>
          <div className="space-y-3">
            {ASSET_CLASSES.map((ac) => {
              const enabled = settings.enabledAssetClasses.includes(ac);
              const checkboxId = `ac-${ac.replace(/\s+/g, "-").toLowerCase()}`;
              return (
                <label
                  key={ac}
                  htmlFor={checkboxId}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 transition-colors",
                    enabled
                      ? "bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:bg-accent/30",
                  )}
                >
                  <input
                    id={checkboxId}
                    type="checkbox"
                    checked={enabled}
                    onChange={() => toggleAssetClass(ac)}
                    className="h-4 w-4 rounded border-border accent-primary"
                    aria-label={`Show ${ac} in inbox`}
                  />
                  <span className="text-sm font-medium">{ac}</span>
                </label>
              );
            })}
          </div>
        </section>

        {/* Default view toggle */}
        <section
          aria-labelledby="view-heading"
          className="rounded-lg border border-border bg-card p-5"
        >
          <h2
            id="view-heading"
            className="mb-1 text-sm font-semibold text-foreground"
          >
            Default inbox view
          </h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Whether the Inbox groups records by asset class or shows a flat list.
          </p>
          <div className="flex gap-2">
            {(["grouped", "flat"] as const).map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => setView(view)}
                className={cn(
                  "flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition-colors capitalize",
                  settings.defaultView === view
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground border border-border",
                )}
                aria-pressed={settings.defaultView === view}
              >
                {view}
              </button>
            ))}
          </div>
        </section>

        {/* Save feedback */}
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "text-xs text-muted-foreground transition-opacity duration-300",
            saved ? "opacity-100" : "opacity-0",
          )}
        >
          Settings saved automatically
        </div>
      </div>
    </div>
  );
}
