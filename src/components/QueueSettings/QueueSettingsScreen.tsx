import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { AssetClass } from "@/lib/types";
import { Settings2, CheckCircle2, XCircle, ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";

const ASSET_CLASSES: AssetClass[] = ["US Options", "SG Stock", "HK Stock", "Crypto"];
const SETTINGS_KEY = "convictioniq_queue_settings_v1";
const VIEW_KEY = "convictioniq_queue_view_v1";

interface QueueSettings {
  enabledAssetClasses: AssetClass[];
  defaultView: "grouped" | "flat";
  localDirectoryPath: string;
  defaultFollowupOffset: number;
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
    localDirectoryPath: "",
    defaultFollowupOffset: 7,
  };
}

function saveSettings(settings: QueueSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  // Also persist the view preference under its own key for easy reading by InboxScreen
  localStorage.setItem(VIEW_KEY, settings.defaultView);
}

const COWORK_SCHEMA = `{
  "id": "string — unique record ID (e.g. \\"cw-001\\")",
  "ticker": "string — ticker symbol (e.g. \\"AAPL\\")",
  "asset_class": "\\"US Options\\" | \\"SG Stock\\" | \\"HK Stock\\" | \\"Crypto\\"",
  "exchange": "string — exchange name (e.g. \\"NASDAQ\\", \\"SGX\\", \\"HKEX\\", \\"Global\\")",
  "color_band": "\\"SuperGreen\\" | \\"LightGreen\\" | \\"Pink\\" | \\"SuperRed\\"",
  "signal_label": "\\"SELL PUT\\" | \\"WATCH\\" | \\"WATCHLIST\\" | \\"AVOID\\" | \\"EXIT ALERT\\"",
  "suggested_action": "string — analyst's recommended action",
  "analyst_note": "string — supporting rationale",
  "analysed_at": "string — ISO date (e.g. \\"2026-07-03\\")"
}`;

export function QueueSettingsScreen() {
  const [settings, setSettings] = useState<QueueSettings>(loadSettings);
  const [saved, setSaved] = useState(false);
  const [schemaOpen, setSchemaOpen] = useState(false);

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

        {/* Local directory path */}
        <section
          aria-labelledby="local-dir-heading"
          className="rounded-lg border border-border bg-card p-5"
        >
          <h2
            id="local-dir-heading"
            className="mb-1 text-sm font-semibold text-foreground"
          >
            Local CoWork directory
          </h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Path to the folder where CoWork writes its JSON analysis files.
          </p>
          <div className="space-y-2">
            <Label htmlFor="local-dir-input" className="sr-only">
              Local CoWork directory path
            </Label>
            <Input
              id="local-dir-input"
              type="text"
              placeholder="/path/to/cowork/output"
              value={settings.localDirectoryPath}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  localDirectoryPath: e.target.value,
                }))
              }
              aria-describedby="local-dir-feedback"
            />
            <div
              id="local-dir-feedback"
              aria-live="polite"
              className="flex items-center gap-1.5 text-xs"
            >
              {settings.localDirectoryPath.trim() !== "" ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-500 flex-shrink-0" />
                  <span className="text-green-600 dark:text-green-500">Path saved</span>
                </>
              ) : (
                <>
                  <XCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                  <span className="text-destructive">Path is required</span>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Default follow-up offset */}
        <section
          aria-labelledby="followup-offset-heading"
          className="rounded-lg border border-border bg-card p-5"
        >
          <h2
            id="followup-offset-heading"
            className="mb-1 text-sm font-semibold text-foreground"
          >
            Default follow-up offset (days)
          </h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Number of days ahead to pre-fill the follow-up date when sending records to the
            Follow-up Queue.
          </p>
          <div className="w-32">
            <Label htmlFor="followup-offset-input" className="sr-only">
              Follow-up offset in days
            </Label>
            <Input
              id="followup-offset-input"
              type="number"
              min={1}
              max={365}
              value={settings.defaultFollowupOffset}
              onChange={(e) => {
                const parsed = parseInt(e.target.value, 10);
                if (!isNaN(parsed)) {
                  setSettings((prev) => ({
                    ...prev,
                    defaultFollowupOffset: parsed,
                  }));
                }
              }}
            />
          </div>
        </section>

        {/* CoWork JSON schema reference */}
        <Collapsible open={schemaOpen} onOpenChange={setSchemaOpen}>
          <section
            aria-labelledby="schema-heading"
            className="rounded-lg border border-border bg-card p-5"
          >
            <CollapsibleTrigger
              className="flex w-full items-center gap-2 text-left"
              aria-expanded={schemaOpen}
            >
              {schemaOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
              <h2
                id="schema-heading"
                className="text-sm font-semibold text-foreground"
              >
                CoWork JSON schema reference
              </h2>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-4">
                <pre className="bg-muted rounded-md p-4 text-xs font-mono overflow-x-auto leading-relaxed">
                  <code>{COWORK_SCHEMA}</code>
                </pre>
              </div>
            </CollapsibleContent>
          </section>
        </Collapsible>

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
