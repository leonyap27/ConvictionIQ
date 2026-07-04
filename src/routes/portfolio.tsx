import { createFileRoute } from "@tanstack/react-router";
import { PortfolioScreen } from "@/components/Portfolio/PortfolioScreen";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { title: "Portfolio Exposure — ConvictionIQ" },
      {
        name: "description",
        content:
          "Manually managed holdings used by the Decision Quality Gate.",
      },
      { property: "og:title", content: "ConvictionIQ — Portfolio" },
      {
        property: "og:description",
        content: "Manage sector exposure limits and holdings.",
      },
    ],
  }),
  component: () => (
    <ErrorBoundary>
      <PortfolioScreen />
    </ErrorBoundary>
  ),
});
