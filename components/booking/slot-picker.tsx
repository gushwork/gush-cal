"use client";

import { cn } from "@/lib/ui/cn";
import type { IanaTimezone, Slot } from "@/lib/types";

type SlotPickerProps = {
  slots: Slot[];
  selectedStartsAt: string | null;
  onSelect: (startsAt: string) => void;
  loading?: boolean;
  viewerTimezone: IanaTimezone;
  showPanelistCount?: boolean;
};

function formatSlotTime(startsAt: string, timezone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(startsAt));
}

export function SlotPicker({
  slots,
  selectedStartsAt,
  onSelect,
  loading,
  viewerTimezone,
  showPanelistCount = true,
}: SlotPickerProps) {
  if (loading) {
    return <p className="text-sm text-ink-muted">Loading available times…</p>;
  }

  if (slots.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        No available times on this day. Pick another date or duration.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {slots.map((slot) => {
        const selected = slot.startsAt === selectedStartsAt;
        return (
          <button
            key={slot.startsAt}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(slot.startsAt)}
            className={cn(
              "interactive rounded-full px-3 py-2 text-sm font-medium transition-colors",
              selected
                ? "bg-primary text-white"
                : "bg-primary-soft text-primary hover:bg-primary/15",
            )}
          >
            <span className="block truncate">{formatSlotTime(slot.startsAt, viewerTimezone)}</span>
            <span
              className={cn(
                "mt-0.5 block truncate text-xs font-normal",
                selected ? "text-white/80" : "text-ink-muted",
              )}
            >
              {slot.durationMinutes} min
              {showPanelistCount &&
                ` · ${slot.eligibleMemberCount} available`}
            </span>
          </button>
        );
      })}
    </div>
  );
}
