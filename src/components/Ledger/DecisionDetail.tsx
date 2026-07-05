import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BandChip, SignalChip, DecisionChip } from "@/components/Chips";
import { updateDecisionNotes } from "@/lib/db";
import type { ActionedRecord } from "@/lib/types";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-SG", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatPrice(price: number, assetClass: string): string {
  if (price <= 0) return "—";
  if (assetClass === "Crypto" && price >= 1000) {
    return `$${price.toLocaleString()}`;
  }
  return price.toFixed(2);
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

function ReadonlyBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 text-sm text-foreground/80">
      {children}
    </div>
  );
}

export function DecisionDetail({
  record,
  open,
  onClose,
}: {
  record: ActionedRecord | null;
  open: boolean;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState(record?.decision_notes ?? "");
  const [saving, setSaving] = useState(false);

  // Sync notes when record changes without a re-mount
  const [trackedId, setTrackedId] = useState<string | null>(null);
  if (record && record.id !== trackedId) {
    setTrackedId(record.id);
    setNotes(record.decision_notes);
  }

  async function handleSave() {
    if (!record) return;
    setSaving(true);
    try {
      await updateDecisionNotes(record.id, notes);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="flex w-[480px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[480px]"
      >
        {record ? (
          <>
            {/* Fixed header */}
            <SheetHeader className="border-b border-border px-6 py-4">
              <div className="flex items-baseline gap-2">
                <SheetTitle className="font-mono text-lg font-semibold">
                  {record.ticker}
                </SheetTitle>
                <span className="text-sm text-muted-foreground">{record.exchange}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <BandChip band={record.color_band} />
                <SignalChip signal={record.signal_label} />
                <DecisionChip label={record.decision_label} />
              </div>
            </SheetHeader>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Score + Price */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="mb-0.5 text-xs text-muted-foreground">Score at Decision</p>
                  <p className="text-xl font-semibold tabular-nums">
                    {record.score_at_decision}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="mb-0.5 text-xs text-muted-foreground">Price at Decision</p>
                  <p className="text-xl font-semibold tabular-nums">
                    {formatPrice(record.price_at_decision, record.asset_class)}
                  </p>
                </div>
              </div>

              {/* Strategy + Actioned */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="mb-0.5 text-xs text-muted-foreground">Strategy</p>
                  <p className="text-sm font-medium">{record.sub_type}</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="mb-0.5 text-xs text-muted-foreground">Actioned</p>
                  <p className="text-sm font-medium">{formatDate(record.actioned_at)}</p>
                </div>
              </div>

              {/* Follow-up date (only for followup-type records) */}
              {record.followup_at && (
                <div>
                  <SectionLabel>Follow-up Date</SectionLabel>
                  <ReadonlyBlock>{formatDate(record.followup_at)}</ReadonlyBlock>
                </div>
              )}

              {/* Analyst note */}
              <div>
                <SectionLabel>Analyst Note</SectionLabel>
                <ReadonlyBlock>
                  {record.analyst_note || (
                    <span className="italic text-muted-foreground/50">—</span>
                  )}
                </ReadonlyBlock>
              </div>

              {/* Suggested action */}
              <div>
                <SectionLabel>Suggested Action</SectionLabel>
                <ReadonlyBlock>
                  {record.suggested_action || (
                    <span className="italic text-muted-foreground/50">—</span>
                  )}
                </ReadonlyBlock>
              </div>

              {/* Decision notes (editable) */}
              <div>
                <SectionLabel>Decision Notes</SectionLabel>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[88px] resize-none text-sm"
                  placeholder="Add your decision notes…"
                />
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={handleSave}
                  disabled={saving || notes === record.decision_notes}
                >
                  {saving ? "Saving…" : "Save Notes"}
                </Button>
              </div>

              {/* Notes history log */}
              {record.notes_log && record.notes_log.length > 0 && (
                <div>
                  <SectionLabel>Notes History</SectionLabel>
                  <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                    {[...record.notes_log].reverse().map((entry, i) => {
                      const sep = entry.indexOf(": ");
                      const ts = sep > -1 ? entry.slice(0, sep) : null;
                      const text = sep > -1 ? entry.slice(sep + 2) : entry;
                      return (
                        <div
                          key={i}
                          className="rounded border border-border/50 bg-muted/40 p-2.5"
                        >
                          {ts && (
                            <p className="mb-0.5 text-xs text-muted-foreground/70">
                              {new Date(ts).toLocaleString("en-SG")}
                            </p>
                          )}
                          <p className="text-xs text-foreground/80">{text}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
