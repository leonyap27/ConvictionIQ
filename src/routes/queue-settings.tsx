import { createFileRoute } from "@tanstack/react-router";
import { QueueSettingsScreen } from "@/components/QueueSettings/QueueSettingsScreen";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const Route = createFileRoute("/queue-settings")({
  head: () => ({
    meta: [
      { title: "Queue Settings — ConvictionIQ" },
      {
        name: "description",
        content: "Configure asset class filters and queue display preferences.",
      },
      { property: "og:title", content: "ConvictionIQ — Queue Settings" },
    ],
  }),
  component: () => (
    <ErrorBoundary>
      <QueueSettingsScreen />
    </ErrorBoundary>
  ),
});
