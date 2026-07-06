import { useState, useEffect, useRef } from "react";
import { liveQuery } from "dexie";
import { db, markReviewedReschedule, markReviewedComplete, closeFollowUp, updateFollowUpCompletionNote } from "@/lib/db";
import type { FollowUpRecord } from "@/lib/types";
import { BandChip, SignalChip } from "@/components/Chips";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Bell, CheckCircle2, X, CalendarCheck, AlertCircle, Clock } from "lucide-react";

// ── Date helpers ──────────────────────────────────────────────────────────────

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

function daysUntil(iso: string): number {
  const target = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/** Returns today's date as YYYY-MM-DD for date input min attribute */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Row urgency helpers ───────────────────────────────────────────────────────

/**
 * Returns Tailwind background classes for open rows based on due date.
 * Amber = today or overdue; yellow/50 = due within 3 days.
 */
function openRowBg(followupAt: string): string {
  const days = daysUntil(followupAt);
  if (days <= 0) {
    // Today or overdue — amber background
    return "bg-amber-50 dark:bg-amber-950/40 border-l-4 border-l-amber-500";
  }
  if (days <= 3) {
    // Within 3 days — yellow background
    return "bg-yellow-50 dark:bg-yellow-950/30 border-l-4 border-l-yellow-400";
  }
  return "";
}

// ── DueLabel badge ────────────────────────────────────────────────────────────

function DueLabel({ iso }: { iso: string }) {
  const days = daysUntil(iso);
  if (days < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded px-1.5 py-0.5">
        <AlertCircle className="h-3 w-3 shrink-0" />
        Overdue {Math.abs(days)}d
      </span>
    );
  }
  if (days === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded px-1.5 py-0.5">
        <Clock className="h-3 w-3 shrink-0" />
        Due today
      </span>
    );
  }
  if (days <= 3) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-800 rounded px-1.5 py-0.5">
        <Clock className="h-3 w-3 shrink-0" />
        Due in {days}d
      </span>
    );
  }
  return (
    <span className="text-xs text-muted-foreground tabular-nums">{formatDate(iso)}</span>
  );
}

// ── Skeletons ─────────────────────────────────────────────────────────────────

function FollowUpSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-4 rounded-lg border border-border bg-card p-4"
        >
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-5 w-20 rounded-md" />
              <Skeleton className="h-5 w-20 rounded-md" />
            </div>
            <Skeleton className="h-3.5 w-64" />
          </div>
          <div className="flex gap-2 shrink-0">
            <Skeleton className="h-8 w-28 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Mark Reviewed Modal ───────────────────────────────────────────────────────

interface MarkReviewedModalProps {
  record: FollowUpRecord | null;
  open: boolean;
  onClose: () => void;
}

function MarkReviewedModal({ record, open, onClose }: MarkReviewedModalProps) {
  const [reschedule, setReschedule] = useState(true);
  const [newDate, setNewDate] = useState("");
  const [triggerConditions, setTriggerConditions] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset state when record changes
  useEffect(() => {
    if (record) {
      setReschedule(true);
      setNewDate("");
      setTriggerConditions(record.trigger_conditions ?? "");
      setSaving(false);
    }
  }, [record]);

  const canConfirm =
    !saving &&
    (!reschedule || (reschedule && newDate.length > 0));

  async function handleConfirm() {
    if (!record || !canConfirm) return;
    setSaving(true);
    try {
      if (reschedule) {
        await markReviewedReschedule(record.id, newDate, triggerConditions);
      } else {
        await markReviewedComplete(record.id);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md" aria-describedby="mark-reviewed-desc">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-primary" />
            Mark Reviewed — {record?.ticker}
          </DialogTitle>
          <DialogDescription id="mark-reviewed-desc">
            Record the outcome of your review. Toggle Reschedule to keep this item open
            with a new date, or leave it off to mark it complete.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Reschedule toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
            <div>
              <p className="text-sm font-medium">Reschedule</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Keep this item open with a new review date
              </p>
            </div>
            <Switch
              checked={reschedule}
              onCheckedChange={setReschedule}
              aria-label="Toggle reschedule"
            />
          </div>

          {reschedule ? (
            <>
              {/* New review date */}
              <div className="space-y-1.5">
                <Label htmlFor="new-review-date" className="text-sm">
                  New Next Review Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="new-review-date"
                  type="date"
                  min={todayIso()}
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Trigger conditions */}
              <div className="space-y-1.5">
                <Label htmlFor="trigger-conditions" className="text-sm">
                  Trigger Conditions
                  <span className="ml-1 text-xs text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  id="trigger-conditions"
                  placeholder="Conditions that would trigger action e.g. kijun distance ≤ 2%, IV rank ≥ 40"
                  value={triggerConditions}
                  onChange={(e) => setTriggerConditions(e.target.value)}
                  rows={3}
                  className="resize-none text-sm"
                />
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 px-4 py-3">
              <p className="text-sm text-green-800 dark:text-green-300 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                This item will move to Completed Items
              </p>
              <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                Today ({formatDate(todayIso())}) will be recorded as the Completion Date.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            {saving ? "Saving…" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Close Modal ───────────────────────────────────────────────────────────────

interface CloseModalProps {
  record: FollowUpRecord | null;
  open: boolean;
  onClose: () => void;
}

function CloseModal({ record, open, onClose }: CloseModalProps) {
  const [completionNote, setCompletionNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (record) {
      setCompletionNote(record.completion_note ?? "");
      setSaving(false);
    }
  }, [record]);

  const canConfirm = !saving && completionNote.trim().length > 0;

  async function handleConfirm() {
    if (!record || !canConfirm) return;
    setSaving(true);
    try {
      await closeFollowUp(record.id, completionNote.trim());
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md" aria-describedby="close-modal-desc">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <X className="h-4 w-4 text-destructive" />
            Close Follow-up — {record?.ticker}
          </DialogTitle>
          <DialogDescription id="close-modal-desc">
            A completion note is required before this item can be closed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="completion-note-close" className="text-sm">
              Completion Note <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="completion-note-close"
              placeholder="What was the outcome? e.g. Entered long position, skipped — conditions not met, exited per plan…"
              value={completionNote}
              onChange={(e) => setCompletionNote(e.target.value)}
              rows={4}
              className="resize-none text-sm"
              aria-required="true"
            />
            {completionNote.trim().length === 0 && (
              <p className="text-xs text-muted-foreground">
                A completion note is required to close this item.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            {saving ? "Closing…" : "Close Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Completed Item Row — inline editable completion note ─────────────────────

function CompletedRow({ r }: { r: FollowUpRecord }) {
  const [note, setNote] = useState(r.completion_note ?? "");
  const [editing, setEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync if record changes from outside
  useEffect(() => {
    if (!editing) setNote(r.completion_note ?? "");
  }, [r.completion_note, editing]);

  async function handleBlur() {
    setEditing(false);
    if (note !== (r.completion_note ?? "")) {
      await updateFollowUpCompletionNote(r.id, note);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card/60 p-4 opacity-80 sm:flex-row sm:items-start">
      <div className="flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-semibold">{r.ticker}</span>
          <span className="text-xs text-muted-foreground">{r.exchange}</span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">{r.asset_class}</span>
          <BandChip band={r.color_band} />
          <SignalChip signal={r.signal_label} />
          <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
            <CheckCircle2 className="h-3 w-3 shrink-0" />
            Completed
          </span>
        </div>

        {/* Inline editable completion note */}
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Completion note
          </span>
          {editing ? (
            <Textarea
              ref={textareaRef}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={handleBlur}
              rows={2}
              className="resize-none text-sm"
              aria-label={`Completion note for ${r.ticker}`}
            />
          ) : (
            <button
              type="button"
              className="block w-full text-left text-sm text-foreground/80 hover:text-foreground transition-colors rounded px-1 py-0.5 hover:bg-accent/50 cursor-text"
              onClick={() => {
                setEditing(true);
                setTimeout(() => textareaRef.current?.focus(), 0);
              }}
              aria-label={`Edit completion note for ${r.ticker}`}
            >
              {note.trim() ? note : (
                <span className="italic text-muted-foreground/60">Click to add completion note…</span>
              )}
            </button>
          )}
        </div>

        {r.trigger_conditions && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Trigger conditions:</span> {r.trigger_conditions}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {r.completion_date && (
            <span>Completed {formatDate(r.completion_date)}</span>
          )}
          {r.completion_date && <span>·</span>}
          <span>Analysed {formatDate(r.analysed_at)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Open Item Row ─────────────────────────────────────────────────────────────

interface OpenRowProps {
  r: FollowUpRecord;
  onMarkReviewed: (r: FollowUpRecord) => void;
  onClose: (r: FollowUpRecord) => void;
}

function OpenRow({ r, onMarkReviewed, onClose }: OpenRowProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-start transition-colors",
        openRowBg(r.followup_at),
      )}
    >
      <div className="flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-semibold">{r.ticker}</span>
          <span className="text-xs text-muted-foreground">{r.exchange}</span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">{r.asset_class}</span>
          <BandChip band={r.color_band} />
          <SignalChip signal={r.signal_label} />
        </div>

        {r.trigger_conditions ? (
          <p className="text-sm text-foreground/80">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mr-1">
              Trigger:
            </span>
            {r.trigger_conditions}
          </p>
        ) : r.reminder_note ? (
          <p className="text-sm text-foreground/80">{r.reminder_note}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <DueLabel iso={r.followup_at} />
          <span className="text-xs text-muted-foreground">
            · Analysed {formatDate(r.analysed_at)}
          </span>
        </div>
      </div>

      <div className="flex gap-2 shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onMarkReviewed(r)}
          className="gap-1.5"
          aria-label={`Mark ${r.ticker} follow-up as reviewed`}
        >
          <CalendarCheck className="h-3.5 w-3.5" />
          Mark Reviewed
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onClose(r)}
          className="gap-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          aria-label={`Close ${r.ticker} follow-up`}
        >
          <X className="h-3.5 w-3.5" />
          Close
        </Button>
      </div>
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function FollowUpScreen() {
  const [records, setRecords] = useState<FollowUpRecord[] | undefined>(undefined);

  useEffect(() => {
    const sub = liveQuery(() =>
      db.followup.orderBy("followup_at").toArray(),
    ).subscribe({
      next: (data) => setRecords(data),
      error: (err) => console.error("FollowUp query error:", err),
    });
    return () => sub.unsubscribe();
  }, []);

  // Modal state
  const [reviewRecord, setReviewRecord] = useState<FollowUpRecord | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [closeRecord, setCloseRecord] = useState<FollowUpRecord | null>(null);
  const [closeModalOpen, setCloseModalOpen] = useState(false);

  function openMarkReviewed(r: FollowUpRecord) {
    setReviewRecord(r);
    setReviewOpen(true);
  }

  function openCloseModal(r: FollowUpRecord) {
    setCloseRecord(r);
    setCloseModalOpen(true);
  }

  if (records === undefined) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6">
        <Skeleton className="mb-2 h-7 w-44" />
        <Skeleton className="mb-6 h-4 w-64" />
        <FollowUpSkeleton />
      </div>
    );
  }

  // Split into open and completed; treat undefined status as "open"
  const openItems = records
    .filter((r) => (r.status ?? "open") === "open")
    .sort((a, b) => a.followup_at.localeCompare(b.followup_at));

  const completedItems = records
    .filter((r) => r.status === "completed")
    .sort((a, b) => (b.completion_date ?? "").localeCompare(a.completion_date ?? ""));

  const overdueCount = openItems.filter((r) => daysUntil(r.followup_at) < 0).length;
  const dueSoonCount = openItems.filter(
    (r) => daysUntil(r.followup_at) >= 0 && daysUntil(r.followup_at) <= 3,
  ).length;

  return (
    <>
      <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            Follow-up Queue
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {openItems.length > 0
              ? `${openItems.length} open · ${overdueCount > 0 ? `${overdueCount} overdue` : ""} ${dueSoonCount > 0 ? `${overdueCount > 0 ? "· " : ""}${dueSoonCount} due soon` : ""}`.replace(/^\s*·\s*/, "").trim() || `${openItems.length} open · sorted by next review date`
              : "All caught up — no open follow-ups"}
          </p>
        </div>

        <Tabs defaultValue="open" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="open" className="gap-2">
              Open Items
              {openItems.length > 0 && (
                <span className="ml-1 rounded-full bg-primary/15 text-primary px-1.5 py-0.5 text-xs font-medium tabular-nums">
                  {openItems.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">
              Completed Items
              {completedItems.length > 0 && (
                <span className="ml-1 rounded-full bg-muted text-muted-foreground px-1.5 py-0.5 text-xs font-medium tabular-nums">
                  {completedItems.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Open Items tab ── */}
          <TabsContent value="open">
            {openItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
                <Bell className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-base font-medium text-muted-foreground">
                  Follow-up queue is empty
                </p>
                <p className="mt-1 text-sm text-muted-foreground/70">
                  When you add analyses from the Inbox to Follow-up, they appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3" role="list" aria-label="Open follow-up items">
                {openItems.map((r) => (
                  <OpenRow
                    key={r.id}
                    r={r}
                    onMarkReviewed={openMarkReviewed}
                    onClose={openCloseModal}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Completed Items tab ── */}
          <TabsContent value="completed">
            {completedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
                <CheckCircle2 className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-base font-medium text-muted-foreground">
                  No completed items yet
                </p>
                <p className="mt-1 text-sm text-muted-foreground/70">
                  Items you mark as reviewed (without rescheduling) or close will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3" role="list" aria-label="Completed follow-up items">
                {completedItems.map((r) => (
                  <CompletedRow key={r.id} r={r} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Mark Reviewed modal */}
      <MarkReviewedModal
        record={reviewRecord}
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
      />

      {/* Close modal */}
      <CloseModal
        record={closeRecord}
        open={closeModalOpen}
        onClose={() => setCloseModalOpen(false)}
      />
    </>
  );
}
