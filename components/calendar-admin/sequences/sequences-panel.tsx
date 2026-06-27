"use client";

import { AdminPanelSkeleton } from "@/components/calendar-admin/admin-panel-skeleton";
import { AlertBanner, Button, EmptyState, Input, Label } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/ui/cn";
import type {
  AppEventType,
  EmailSequence,
  EmailSequenceStep,
  SequenceStepAction,
  SequenceTimingAnchor,
} from "@/lib/types/platform";
import { ChevronDown, Mail } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const TRIGGER_EVENTS: AppEventType[] = [
  "meeting.booked",
  "meeting.cancelled",
  "meeting.rescheduled",
  "meeting.reassigned",
];

const TRIGGER_LABELS: Record<string, string> = {
  "meeting.booked": "Meeting booked",
  "meeting.cancelled": "Meeting cancelled",
  "meeting.rescheduled": "Meeting rescheduled",
  "meeting.reassigned": "Meeting reassigned",
};

const TIMING_ANCHORS: { value: SequenceTimingAnchor; label: string }[] = [
  { value: "after_booking", label: "After booking" },
  { value: "before_meeting", label: "Before meeting start" },
  { value: "after_meeting", label: "After meeting start" },
];

const SELECT_CLASS =
  "min-w-0 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm";

type DelayUnit = "minutes" | "hours";

type StepDraft = {
  order: number;
  delayAmount: number;
  delayUnit: DelayUnit;
  timingAnchor: SequenceTimingAnchor;
  action: SequenceStepAction;
  subjectTemplate: string;
  bodyTemplate: string;
};

function toDelayParts(minutes: number): { amount: number; unit: DelayUnit } {
  if (minutes >= 60 && minutes % 60 === 0) {
    return { amount: minutes / 60, unit: "hours" };
  }
  return { amount: minutes, unit: "minutes" };
}

function toDelayMinutes(amount: number, unit: DelayUnit): number {
  return unit === "hours" ? amount * 60 : amount;
}

function formatTimingSummary(draft: StepDraft): string {
  const unitLabel =
    draft.delayUnit === "hours"
      ? draft.delayAmount === 1
        ? "hour"
        : "hours"
      : draft.delayAmount === 1
        ? "minute"
        : "minutes";
  const anchor =
    TIMING_ANCHORS.find((option) => option.value === draft.timingAnchor)?.label ??
    draft.timingAnchor;
  return `${draft.delayAmount} ${unitLabel} — ${anchor.toLowerCase()}`;
}

function stepToDraft(step: EmailSequenceStep): StepDraft {
  const { amount, unit } = toDelayParts(step.delayMinutes);
  return {
    order: step.order,
    delayAmount: amount,
    delayUnit: unit,
    timingAnchor: step.timingAnchor ?? "after_booking",
    action: step.action,
    subjectTemplate: step.subjectTemplate ?? "",
    bodyTemplate: step.bodyTemplate ?? "",
  };
}

function draftToStepInput(draft: StepDraft) {
  return {
    order: draft.order,
    delayMinutes: toDelayMinutes(draft.delayAmount, draft.delayUnit),
    timingAnchor: draft.timingAnchor,
    action: draft.action,
    subjectTemplate: draft.subjectTemplate,
    bodyTemplate: draft.bodyTemplate,
  };
}

function serializeDrafts(drafts: StepDraft[]): string {
  return JSON.stringify(drafts.map(draftToStepInput));
}

function isSequenceDirty(
  drafts: StepDraft[] | undefined,
  loaded: EmailSequenceStep[] | undefined,
): boolean {
  if (!drafts || !loaded) {
    return false;
  }
  return serializeDrafts(drafts) !== serializeDrafts(loaded.map(stepToDraft));
}

type SequencesPanelProps = {
  calendarId: string;
  calendarName: string;
};

export function SequencesPanel({
  calendarId,
  calendarName,
}: SequencesPanelProps) {
  const [sequences, setSequences] = useState<EmailSequence[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadedStepsById, setLoadedStepsById] = useState<
    Record<string, EmailSequenceStep[]>
  >({});
  const [stepDraftsById, setStepDraftsById] = useState<
    Record<string, StepDraft[]>
  >({});
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [triggerEvent, setTriggerEvent] = useState<AppEventType>("meeting.booked");
  const [saving, setSaving] = useState(false);

  const loadSequences = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/calendars/${calendarId}/sequences`);
      const data = (await res.json()) as {
        sequences?: EmailSequence[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load sequences");
      }
      setSequences(data.sequences ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sequences");
    } finally {
      setLoading(false);
    }
  }, [calendarId]);

  useEffect(() => {
    void loadSequences();
  }, [loadSequences]);

  async function loadSequenceDetail(sequenceId: string) {
    setLoadingDetailId(sequenceId);
    try {
      const res = await fetch(
        `/api/calendars/${calendarId}/sequences/${sequenceId}`,
      );
      const data = (await res.json()) as {
        steps?: EmailSequenceStep[];
        error?: string;
      };
      if (!res.ok) {
        toast(data.error ?? "Failed to load sequence", { variant: "error" });
        return;
      }
      const loaded = data.steps ?? [];
      setLoadedStepsById((prev) => ({ ...prev, [sequenceId]: loaded }));
      setStepDraftsById((prev) => ({
        ...prev,
        [sequenceId]: loaded.map(stepToDraft),
      }));
    } finally {
      setLoadingDetailId(null);
    }
  }

  async function toggleExpand(sequenceId: string) {
    if (expandedId === sequenceId) {
      setExpandedId(null);
      return;
    }

    if (
      expandedId &&
      isSequenceDirty(stepDraftsById[expandedId], loadedStepsById[expandedId])
    ) {
      if (
        !window.confirm(
          "You have unsaved changes in this sequence. Discard them?",
        )
      ) {
        return;
      }
    }

    setExpandedId(sequenceId);

    if (stepDraftsById[sequenceId]) {
      return;
    }

    await loadSequenceDetail(sequenceId);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/calendars/${calendarId}/sequences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), triggerEvent, enabled: true }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to create sequence");
      }
      toast("Sequence created", { variant: "success" });
      setName("");
      await loadSequences();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create sequence");
    } finally {
      setSaving(false);
    }
  }

  async function saveSteps(sequenceId: string) {
    const drafts = stepDraftsById[sequenceId] ?? [];
    setSaving(true);
    try {
      const res = await fetch(
        `/api/calendars/${calendarId}/sequences/${sequenceId}/steps`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ steps: drafts.map(draftToStepInput) }),
        },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to save steps");
      }
      toast("Steps saved", { variant: "success" });
      await loadSequenceDetail(sequenceId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save steps");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(sequence: EmailSequence) {
    if (!window.confirm(`Delete sequence “${sequence.name}”?`)) {
      return;
    }
    const res = await fetch(
      `/api/calendars/${calendarId}/sequences/${sequence.id}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      toast("Failed to delete sequence", { variant: "error" });
      return;
    }
    if (expandedId === sequence.id) {
      setExpandedId(null);
    }
    setLoadedStepsById((prev) => {
      const next = { ...prev };
      delete next[sequence.id];
      return next;
    });
    setStepDraftsById((prev) => {
      const next = { ...prev };
      delete next[sequence.id];
      return next;
    });
    toast("Sequence deleted", { variant: "success" });
    await loadSequences();
  }

  function updateDraft(sequenceId: string, index: number, patch: Partial<StepDraft>) {
    setStepDraftsById((prev) => ({
      ...prev,
      [sequenceId]: (prev[sequenceId] ?? []).map((draft, i) =>
        i === index ? { ...draft, ...patch } : draft,
      ),
    }));
  }

  function addStep(sequenceId: string) {
    setStepDraftsById((prev) => {
      const drafts = prev[sequenceId] ?? [];
      return {
        ...prev,
        [sequenceId]: [
          ...drafts,
          {
            order: drafts.length + 1,
            delayAmount: 0,
            delayUnit: "minutes" as DelayUnit,
            timingAnchor: "after_booking" as SequenceTimingAnchor,
            action: "send_email" as SequenceStepAction,
            subjectTemplate: "",
            bodyTemplate: "",
          },
        ],
      };
    });
  }

  function removeStep(sequenceId: string, index: number) {
    setStepDraftsById((prev) => ({
      ...prev,
      [sequenceId]: (prev[sequenceId] ?? []).filter((_, i) => i !== index),
    }));
  }

  function renderStepsEditor(sequenceId: string) {
    const stepDrafts = stepDraftsById[sequenceId] ?? [];
    const loadedSteps = loadedStepsById[sequenceId] ?? [];

    if (loadingDetailId === sequenceId) {
      return (
        <div className="space-y-3 py-2" aria-busy="true" aria-label="Loading steps">
          <div className="h-6 w-24 animate-pulse rounded bg-neutral-100" />
          <div className="h-32 animate-pulse rounded bg-neutral-100" />
          <div className="h-32 animate-pulse rounded bg-neutral-100" />
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <h2 className="font-grotesk text-lg font-medium text-neutral-900">Steps</h2>
        {stepDrafts.map((draft, index) => (
          <div
            key={index}
            className="space-y-3 border-b border-neutral-100 pb-4 last:border-0"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Label className="block min-w-0 space-y-1.5">
                Order
                <Input
                  type="number"
                  min={1}
                  value={draft.order}
                  onChange={(e) =>
                    updateDraft(sequenceId, index, { order: Number(e.target.value) })
                  }
                />
              </Label>
              <Label className="block min-w-0 space-y-1.5">
                Amount
                <Input
                  type="number"
                  min={0}
                  value={draft.delayAmount}
                  onChange={(e) =>
                    updateDraft(sequenceId, index, {
                      delayAmount: Number(e.target.value),
                    })
                  }
                />
              </Label>
              <Label className="block min-w-0 space-y-1.5">
                Unit
                <select
                  value={draft.delayUnit}
                  onChange={(e) =>
                    updateDraft(sequenceId, index, {
                      delayUnit: e.target.value as DelayUnit,
                    })
                  }
                  className={SELECT_CLASS}
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                </select>
              </Label>
              <Label className="block min-w-0 space-y-1.5 sm:col-span-2 xl:col-span-1">
                Relative to
                <select
                  value={draft.timingAnchor}
                  onChange={(e) =>
                    updateDraft(sequenceId, index, {
                      timingAnchor: e.target.value as SequenceTimingAnchor,
                    })
                  }
                  className={SELECT_CLASS}
                >
                  {TIMING_ANCHORS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Label>
            </div>
            <p className="text-xs text-neutral-500">{formatTimingSummary(draft)}</p>
            <div className="grid grid-cols-1 gap-3 sm:max-w-xs">
              <Label className="block min-w-0 space-y-1.5">
                Action
                <select
                  value={draft.action}
                  onChange={(e) =>
                    updateDraft(sequenceId, index, {
                      action: e.target.value as SequenceStepAction,
                    })
                  }
                  className={SELECT_CLASS}
                >
                  <option value="send_email">Send email</option>
                  <option value="webhook">Webhook</option>
                  <option value="both">Both</option>
                </select>
              </Label>
            </div>
            <Label className="block space-y-1.5">
              Subject template
              <Input
                value={draft.subjectTemplate}
                onChange={(e) =>
                  updateDraft(sequenceId, index, { subjectTemplate: e.target.value })
                }
              />
            </Label>
            <Label className="block space-y-1.5">
              Body template
              <textarea
                value={draft.bodyTemplate}
                onChange={(e) =>
                  updateDraft(sequenceId, index, { bodyTemplate: e.target.value })
                }
                rows={3}
                className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
              />
            </Label>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => removeStep(sequenceId, index)}
            >
              Remove step
            </Button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => addStep(sequenceId)}
          >
            Add step
          </Button>
          <Button
            type="button"
            loading={saving}
            loadingLabel="Saving steps…"
            onClick={() => void saveSteps(sequenceId)}
          >
            Save steps
          </Button>
        </div>
        {loadedSteps.length > 0 && stepDrafts.length === 0 ? (
          <p className="text-sm text-neutral-500">No steps yet.</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="mb-6">
        <h1 className="font-grotesk text-2xl font-semibold text-neutral-900">
          Email sequences
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Automated emails triggered by meeting events on {calendarName}.
        </p>
      </div>

      {error ? (
        <AlertBanner variant="error" className="mb-4">
          {error}
        </AlertBanner>
      ) : null}

      {!loading ? (
        <form
          onSubmit={handleCreate}
          className="mb-6 grid gap-4 rounded-xl border border-neutral-100 bg-white p-4 shadow-s3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] xl:items-end"
        >
          <Label className="block min-w-0 space-y-1.5 sm:col-span-2 xl:col-span-1">
            Name
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Label>
          <Label className="block min-w-0 space-y-1.5">
            Trigger
            <select
              value={triggerEvent}
              onChange={(e) => setTriggerEvent(e.target.value as AppEventType)}
              className={SELECT_CLASS}
            >
              {TRIGGER_EVENTS.map((event) => (
                <option key={event} value={event}>
                  {TRIGGER_LABELS[event] ?? event}
                </option>
              ))}
            </select>
          </Label>
          <div className="sm:col-span-2 xl:col-span-1 xl:flex xl:justify-end">
            <Button type="submit" loading={saving} loadingLabel="Creating sequence…">
              Add sequence
            </Button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <AdminPanelSkeleton section="sequences" />
      ) : sequences.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No sequences"
          description="Create a sequence to send emails after bookings."
        />
      ) : (
        <div className="space-y-3">
          {sequences.map((sequence) => {
            const isExpanded = expandedId === sequence.id;
            const triggerLabel =
              TRIGGER_LABELS[sequence.triggerEvent] ?? sequence.triggerEvent;

            return (
              <div
                key={sequence.id}
                className="rounded-xl border border-neutral-100 bg-white shadow-s3"
              >
                <div className="flex items-center gap-2 px-4 py-3">
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-controls={`sequence-panel-${sequence.id}`}
                    id={`sequence-header-${sequence.id}`}
                    onClick={() => void toggleExpand(sequence.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left text-sm transition-colors hover:bg-neutral-25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  >
                    <ChevronDown
                      aria-hidden
                      className={cn(
                        "size-4 shrink-0 text-neutral-500 transition-transform",
                        isExpanded && "rotate-180",
                      )}
                    />
                    <span className="min-w-0 flex-1 py-0.5">
                      <span className="block font-medium text-neutral-900">
                        {sequence.name}
                      </span>
                      <span className="text-neutral-500">{triggerLabel}</span>
                    </span>
                  </button>
                  <Button
                    className="shrink-0"
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => void handleDelete(sequence)}
                  >
                    Delete
                  </Button>
                </div>

                {isExpanded ? (
                  <div
                    id={`sequence-panel-${sequence.id}`}
                    role="region"
                    aria-labelledby={`sequence-header-${sequence.id}`}
                    className="border-t border-neutral-100 px-4 py-4 sm:px-5"
                  >
                    {renderStepsEditor(sequence.id)}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
