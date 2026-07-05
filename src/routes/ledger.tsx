import { createFileRoute } from "@tanstack/react-router";
import { LedgerScreen } from "@/components/Ledger/LedgerScreen";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const Route = createFileRoute("/ledger")({
  head: () => ({
    meta: [
      { title: "Decision Ledger — ConvictionIQ" },
      {
        name: "description",
        content: "Actioned analysis records and decision history.",
      },
      { property: "og:title", content: "ConvictionIQ — Decision Ledger" },
    ],
  }),
  component: () => (
    <ErrorBoundary>
      <LedgerScreen />
    </ErrorBoundary>
  ),
});
