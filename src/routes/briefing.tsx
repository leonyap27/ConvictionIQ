import { createFileRoute } from "@tanstack/react-router";
import { BriefingScreen } from "@/components/Briefing/BriefingScreen";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const Route = createFileRoute("/briefing")({
  head: () => ({
    meta: [
      { title: "Daily Briefing — ConvictionIQ" },
      {
        name: "description",
        content:
          "Portfolio health, new setups, improved and weakened recommendations, exit alerts, and income opportunities.",
      },
      { property: "og:title", content: "ConvictionIQ — Daily Briefing" },
      {
        property: "og:description",
        content: "End-of-day briefing across active recommendations.",
      },
    ],
  }),
  component: () => (
    <ErrorBoundary>
      <BriefingScreen />
    </ErrorBoundary>
  ),
});
