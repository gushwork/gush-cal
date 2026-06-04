"use client";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/ui/cn";
import type { IanaTimezone, Slot } from "@/lib/types";

type SlotPickerProps = {
  slots: Slot[];
  selectedStartsAt: string | null;
  onSelect: (startsAt: string) => void;
  loading?: boolean;
  viewerTimezone: IanaTimezone;
  showMemberCount?: boolean;
  onBackToDate?: () => void;
};

function formatSlotTime(startsAt: string, timezone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(startsAt));
}

function memberAvailabilityCopy(count: number): string {
  return `${count} member${count === 1 ? "" : "s"} free`;
}

export function SlotPicker({
  slots,
  selectedStartsAt,
  onSelect,
  loading,
  viewerTimezone,
  showMemberCount = true,
  onBackToDate,
}: SlotPickerProps) {
  if (loading) {
    return (
      <div
        className="grid grid-cols-3 gap-2 sm:grid-cols-4"
        aria-busy="true"
        aria-label="Loading times"
      >
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-14 rounded-[var(--radius-pill)]" />
        ))}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-ink-muted">
          No available times on this day. Try another date or duration.
        </p>
        {onBackToDate ? (
          <Button type="button" variant="link" onClick={onBackToDate}>
            Choose another date
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {slots.map((slot) => {
        const selected = slot.startsAt === selectedStartsAt;
        return (
          <Chip
            key={slot.startsAt}
            shape="pill"
            size="md"
            selected={selected}
            onClick={() => onSelect(slot.startsAt)}
            className={cn(
              "h-auto min-h-[3rem] w-full flex-col gap-0.5 py-2",
              !selected && "bg-primary-soft text-primary hover:bg-primary/15",
            )}
          >
            <span className="block w-full truncate font-medium">
              {formatSlotTime(slot.startsAt, viewerTimezone)}
            </span>
            <span
              className={cn(
                "block w-full truncate text-xs font-normal",
                selected ? "text-white/85" : "text-ink-muted",
              )}
            >
              {slot.durationMinutes} min
              {showMemberCount
                ? ` · ${memberAvailabilityCopy(slot.eligibleMemberCount)}`
                : ""}
            </span>
          </Chip>
        );
      })}
    </div>
  );
}
