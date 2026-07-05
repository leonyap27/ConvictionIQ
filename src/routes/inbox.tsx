import { createFileRoute } from "@tanstack/react-router";
import { InboxScreen } from "@/components/Inbox/InboxScreen";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const Route = createFileRoute("/inbox")({
  head: () => ({
    meta: [
      { title: "Analysis Inbox — ConvictionIQ" },
      {
        name: "description",
        content: "Review and action incoming CoWork analysis records.",
      },
      { property: "og:title", content: "ConvictionIQ — Analysis Inbox" },
    ],
  }),
  component: () => (
    <ErrorBoundary>
      <InboxScreen />
    </ErrorBoundary>
  ),
});
