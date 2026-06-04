"use client";

import { Button } from "@/components/ui";
import {
  getDayLabel,
  localeTimeToMinutes,
  minutesToLocaleTime,
} from "@/lib/working-hours/format";
import {
  addBlock,
  applyMonToWeekdays,
  applyPreset,
  businessHoursPreset,
  clearAllPreset,
  copyDayTo,
  groupByDay,
  removeBlock,
  toggleDay,
  updateBlock,
  validationError,
  type DayBlocks,
} from "@/lib/working-hours/editor-utils";
import type { DayOfWeek, WorkingHours } from "@/lib/types";
import { cn } from "@/lib/ui/cn";
import { useId, useState } from "react";

export type { TimezoneSelectProps } from "./timezone-select";
export { TimezoneSelect } from "./timezone-select";

export type WorkingHoursEditorProps = {
  value: WorkingHours;
  onChange: (hours: WorkingHours) => void;
  disabled?: boolean;
};

const ALL_DAYS: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6];
const COPY_TARGETS: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6];

function emitChange(
  onChange: (hours: WorkingHours) => void,
  setInlineError: (error: string | null) => void,
  hours: WorkingHours,
  inlineError: string | null = validationError(hours),
) {
  setInlineError(inlineError);
  onChange(hours);
}

export function WorkingHoursEditor({
  value,
  onChange,
  disabled = false,
}: WorkingHoursEditorProps) {
  const [inlineError, setInlineError] = useState<string | null>(
    validationError(value),
  );
  const [copyMenuDay, setCopyMenuDay] = useState<DayOfWeek | null>(null);
  const copyMenuId = useId();
  const grouped = groupByDay(value);

  function handlePreset(preset: WorkingHours) {
    const result = applyPreset(value, preset);
    emitChange(onChange, setInlineError, result.hours, result.error);
  }

  function handleApplyMonToWeekdays() {
    emitChange(onChange, setInlineError, applyMonToWeekdays(value));
  }

  function handleToggleDay(day: DayOfWeek, enabled: boolean) {
    emitChange(onChange, setInlineError, toggleDay(value, day, enabled));
  }

  function handleAddBlock(day: DayOfWeek) {
    const result = addBlock(value, day);
    setInlineError(result.error);
    if (result.applied) {
      onChange(result.hours);
    }
  }

  function handleRemoveBlock(day: DayOfWeek, index: number) {
    emitChange(onChange, setInlineError, removeBlock(value, day, index));
  }

  function handleTimeChange(
    day: DayOfWeek,
    index: number,
    field: "start" | "end",
    raw: string,
  ) {
    const minutes = localeTimeToMinutes(raw);
    if (minutes == null) {
      return;
    }
    const result = updateBlock(value, day, index, { [field]: minutes });
    setInlineError(result.error);
    if (result.applied) {
      onChange(result.hours);
    }
  }

  function handleCopyDay(fromDay: DayOfWeek, toDay: DayOfWeek) {
    setCopyMenuDay(null);
    if (fromDay === toDay) {
      return;
    }
    emitChange(onChange, setInlineError, copyDayTo(value, fromDay, toDay));
  }

  const globalError = inlineError ?? validationError(value);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={() => handlePreset(businessHoursPreset())}
        >
          Business hours
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={() => handlePreset(clearAllPreset())}
        >
          Clear all
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={handleApplyMonToWeekdays}
        >
          Apply Mon → weekdays
        </Button>
      </div>

      {globalError ? (
        <p className="text-sm text-destructive">{globalError}</p>
      ) : null}

      <div className="divide-y divide-border rounded-lg border border-border">
        {ALL_DAYS.map((day) => {
          const row = grouped.find((entry) => entry.day === day)!;
          return (
            <DayRow
              key={day}
              day={day}
              row={row}
              disabled={disabled}
              copyMenuDay={copyMenuDay}
              copyMenuId={copyMenuId}
              onToggle={(enabled) => handleToggleDay(day, enabled)}
              onAddBlock={() => handleAddBlock(day)}
              onRemoveBlock={(index) => handleRemoveBlock(day, index)}
              onTimeChange={(index, field, raw) =>
                handleTimeChange(day, index, field, raw)
              }
              onCopyMenuToggle={() =>
                setCopyMenuDay((current) => (current === day ? null : day))
              }
              onCopyTo={(toDay) => handleCopyDay(day, toDay)}
            />
          );
        })}
      </div>
    </div>
  );
}

type DayRowProps = {
  day: DayOfWeek;
  row: DayBlocks;
  disabled: boolean;
  copyMenuDay: DayOfWeek | null;
  copyMenuId: string;
  onToggle: (enabled: boolean) => void;
  onAddBlock: () => void;
  onRemoveBlock: (index: number) => void;
  onTimeChange: (
    index: number,
    field: "start" | "end",
    raw: string,
  ) => void;
  onCopyMenuToggle: () => void;
  onCopyTo: (toDay: DayOfWeek) => void;
};

function DayRow({
  day,
  row,
  disabled,
  copyMenuDay,
  copyMenuId,
  onToggle,
  onAddBlock,
  onRemoveBlock,
  onTimeChange,
  onCopyMenuToggle,
  onCopyTo,
}: DayRowProps) {
  const menuOpen = copyMenuDay === day;

  return (
    <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start">
      <div className="flex w-full items-center gap-3 sm:w-28 sm:shrink-0">
        <label className="inline-flex items-center gap-2 text-sm font-medium text-ink">
          <input
            type="checkbox"
            checked={row.enabled}
            disabled={disabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
          />
          {getDayLabel(day)}
        </label>
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        {!row.enabled ? (
          <p className="text-sm text-ink-muted">Unavailable</p>
        ) : (
          row.blocks.map((block, index) => (
            <div key={`${day}-${index}`} className="flex flex-wrap items-center gap-2">
              <input
                type="time"
                value={minutesToInputValue(block.start)}
                disabled={disabled}
                onChange={(e) => onTimeChange(index, "start", e.target.value)}
                className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              />
              <span className="text-sm text-ink-muted">to</span>
              <input
                type="time"
                value={minutesToInputValue(block.end)}
                disabled={disabled}
                onChange={(e) => onTimeChange(index, "end", e.target.value)}
                className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              />
              <span className="sr-only">
                {minutesToLocaleTime(block.start)} to{" "}
                {minutesToLocaleTime(block.end)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                aria-label={`Remove block ${index + 1} on ${getDayLabel(day)}`}
                onClick={() => onRemoveBlock(index)}
              >
                ×
              </Button>
            </div>
          ))
        )}
      </div>

      <div className="relative flex shrink-0 items-start gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled || !row.enabled}
          onClick={onAddBlock}
        >
          +
        </Button>
        <div className="relative">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || !row.enabled}
            aria-expanded={menuOpen}
            aria-controls={`${copyMenuId}-${day}`}
            onClick={onCopyMenuToggle}
          >
            Copy
          </Button>
          {menuOpen ? (
            <div
              id={`${copyMenuId}-${day}`}
              className="absolute right-0 z-10 mt-1 w-36 rounded-lg border border-border bg-surface p-1 shadow-sm"
            >
              {COPY_TARGETS.filter((target) => target !== day).map((target) => (
                <button
                  key={target}
                  type="button"
                  className={cn(
                    "block w-full rounded-md px-3 py-1.5 text-left text-sm text-ink hover:bg-primary-soft",
                  )}
                  onClick={() => onCopyTo(target)}
                >
                  {getDayLabel(target)}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function minutesToInputValue(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}
