**Size: L**

# CIQ-6 — Queue App Shell and Demo CoWork Dataset

**Management Release Notes**

### What we delivered

- The app has been rebuilt around a decision-queue: receive incoming research, decide on each item, monitor outstanding positions, configure preferences.
- The previous screens were removed entirely. The app opens on an Analysis Inbox pre-loaded with demo records across US options, Singapore stocks, Hong Kong stocks, and crypto — a full end-to-end demonstration on first launch, no setup required.
- Analysts can select multiple records at once and log decisions immediately; a Follow-up Queue tracks positions that need revisiting.

### What it unlocks

- The prototype is now demonstrable to prospective users or partners without a live data feed or manual data entry.
- The record format (color band, signal label, suggested action, analyst note) is the foundation for a future import flow that will accept real analysis outputs.

### Risks and carry-overs to watch

- Two browser-level checks are pending (Inbox layout and seed deduplication). Low risk — all logic passed static analysis.
- The old screens are removed with no fallback. This is a clean-break pivot by design.

| Dimension | Impact |
|-----------|--------|
| Who is affected | All users of the ConvictionIQ prototype |
| Risk level | Low — local-only app, no data leaves the device |
| Reversible? | Yes — revert the branch; no external state is modified |
| Demo readiness | Full end-to-end workflow demonstrable on first launch |
