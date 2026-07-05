import { createFileRoute } from "@tanstack/react-router";
import { FollowUpScreen } from "@/components/FollowUp/FollowUpScreen";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const Route = createFileRoute("/followup")({
  head: () => ({
    meta: [
      { title: "Follow-up Queue — ConvictionIQ" },
      {
        name: "description",
        content: "Stocks and assets flagged for follow-up review.",
      },
      { property: "og:title", content: "ConvictionIQ — Follow-up Queue" },
    ],
  }),
  component: () => (
    <ErrorBoundary>
      <FollowUpScreen />
    </ErrorBoundary>
  ),
});
