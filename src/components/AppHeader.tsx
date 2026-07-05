import { Link, useRouterState } from "@tanstack/react-router";
import { NAV_ITEMS } from "@/lib/constants";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar, FastForward, Activity, CloudUpload, CloudDownload } from "lucide-react";
import { format } from "date-fns";
import { useIsClient } from "@/hooks/use-is-client";

export function AppHeader() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const currentDate = useAppStore((s) => s.currentDate);
  const advanceDay = useAppStore((s) => s.advanceDay);
  const setCurrentDate = useAppStore((s) => s.setCurrentDate);
  const isClient = useIsClient();

  const displayDate = (() => {
    if (!isClient) return "";
    try {
      return format(new Date(currentDate), "EEE, MMM d yyyy");
    } catch {
      return currentDate;
    }
  })();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-6 px-4 md:px-6">
        <Link
          to="/inbox"
          className="flex items-center gap-2 text-sm font-semibold tracking-tight"
        >
          <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/20 text-primary">
            <Activity className="h-4 w-4" />
          </span>
          <span className="hidden sm:inline">ConvictionIQ</span>
        </Link>
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground md:flex">
            <Calendar className="h-3.5 w-3.5" />
            <span className="tabular">{displayDate}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => advanceDay()}
            title="Advance simulated day"
          >
            <FastForward className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Advance day</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled
            title="Not available in local mode"
          >
            <CloudUpload className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Sync</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled
            title="Not available in local mode"
          >
            <CloudDownload className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Refresh</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setCurrentDate(new Date().toISOString().slice(0, 10))
            }
            title="Reset to today"
            className="text-muted-foreground"
          >
            Reset
          </Button>
        </div>
      </div>
    </header>
  );
}
