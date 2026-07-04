import { createFileRoute } from "@tanstack/react-router";
import { MemoryScreen } from "@/components/Memory/MemoryScreen";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const Route = createFileRoute("/memory")({
  head: () => ({
    meta: [
      { title: "Recommendation Memory — ConvictionIQ" },
      {
        name: "description",
        content:
          "Filterable table of all saved recommendation records with daily change logs.",
      },
      { property: "og:title", content: "ConvictionIQ — Memory" },
      {
        property: "og:description",
        content: "Track how every decision evolves.",
      },
    ],
  }),
  component: () => (
    <ErrorBoundary>
      <MemoryScreen />
    </ErrorBoundary>
  ),
});
