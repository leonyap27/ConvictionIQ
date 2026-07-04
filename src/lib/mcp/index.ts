import { defineMcp } from "@lovable.dev/mcp-js";
import listDailyCandidates from "./tools/list_daily_candidates";
import getBriefing from "./tools/get_briefing";
import listMemory from "./tools/list_memory";
import getPortfolio from "./tools/get_portfolio";
import recordDecision from "./tools/record_decision";
import upsertHolding from "./tools/upsert_holding";
import removeHolding from "./tools/remove_holding";
import ingestPositions from "./tools/ingest_positions";
import advanceDay from "./tools/advance_day";
import askStock from "./tools/ask_stock";

export default defineMcp({
  name: "convictioniq-mcp",
  title: "ConvictionIQ",
  version: "0.1.0",
  instructions:
    "Tools for ConvictionIQ, a single-user portfolio decision-support app. Read scored setups, briefing, memory, and holdings; ingest IBKR positions; record decisions with exit plans; advance the simulated day; and ask grounded questions about a specific ticker.",
  tools: [
    listDailyCandidates,
    getBriefing,
    listMemory,
    getPortfolio,
    recordDecision,
    upsertHolding,
    removeHolding,
    ingestPositions,
    advanceDay,
    askStock,
  ],
});
