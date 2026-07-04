import { createFileRoute } from "@tanstack/react-router";
import { DailyScreen } from "@/components/DailyScreen/DailyScreen";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Daily Screen — ConvictionIQ" },
      {
        name: "description",
        content:
          "Ranked opportunities scored through the Ichimoku + options engine.",
      },
      { property: "og:title", content: "ConvictionIQ — Daily Screen" },
      {
        property: "og:description",
        content:
          "AI-powered portfolio decision-support platform for disciplined discretionary investors.",
      },
    ],
  }),
  component: () => (
    <ErrorBoundary>
      <DailyScreen />
    </ErrorBoundary>
  ),
});
