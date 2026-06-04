"use client";

import { useMemo } from "react";
import { BookingCalendar } from "@/components/booking/booking-calendar";
import { toDateKey } from "@/components/booking/group-slots-by-date";
import type { DateKey } from "@/components/booking/types";
import { AlertBanner } from "@/components/ui/alert-banner";
import type { IanaTimezone } from "@/lib/types";
import { cn } from "@/lib/ui/cn";
import type { StepPanelBaseProps } from "./types";

export type BookingDatePanelProps = StepPanelBaseProps & {
  visibleMonth: { year: number; month: number };
  onMonthChange: (year: number, month: number) => void;
  slotCountsByDate: Map<DateKey, number>;
  selectedDate: DateKey | null;
  onSelectDate: (date: DateKey) => void;
  minDate: Date;
  maxDate: Date;
  slotsLoading?: boolean;
  viewerTimezone: IanaTimezone;
};

export function findNextDateWithSlots(
  slotCountsByDate: Map<DateKey, number>,
  afterDateKey: DateKey,
  minDate: Date,
  maxDate: Date,
  timezone: IanaTimezone,
): DateKey | null {
  const minKey = toDateKey(minDate, timezone);
  const maxKey = toDateKey(maxDate, timezone);
  const candidates = [...slotCountsByDate.entries()]
    .filter(([, count]) => count > 0)
    .map(([key]) => key)
    .filter((key) => key > afterDateKey && key >= minKey && key <= maxKey)
    .sort();
  return candidates[0] ?? null;
}

function formatDateKeyLabel(dateKey: DateKey, timezone: IanaTimezone): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: timezone,
  }).format(new Date(`${dateKey}T12:00:00Z`));
}

export function BookingDatePanel({
  visibleMonth,
  onMonthChange,
  slotCountsByDate,
  selectedDate,
  onSelectDate,
  minDate,
  maxDate,
  slotsLoading = false,
  viewerTimezone,
  className,
}: BookingDatePanelProps) {
  const todayKey = useMemo(
    () => toDateKey(new Date(), viewerTimezone),
    [viewerTimezone],
  );

  const todayZeroSlots = useMemo(() => {
    if (slotsLoading) return false;
    const inWindow =
      todayKey >= toDateKey(minDate, viewerTimezone) &&
      todayKey <= toDateKey(maxDate, viewerTimezone);
    return inWindow && (slotCountsByDate.get(todayKey) ?? 0) === 0;
  }, [
    slotsLoading,
    todayKey,
    minDate,
    maxDate,
    viewerTimezone,
    slotCountsByDate,
  ]);

  const nextAvailableDate = useMemo(() => {
    if (!todayZeroSlots) return null;
    return findNextDateWithSlots(
      slotCountsByDate,
      todayKey,
      minDate,
      maxDate,
      viewerTimezone,
    );
  }, [
    todayZeroSlots,
    slotCountsByDate,
    todayKey,
    minDate,
    maxDate,
    viewerTimezone,
  ]);

  return (
    <div className={cn("space-y-3", className)}>
      <BookingCalendar
        visibleMonth={visibleMonth}
        onMonthChange={onMonthChange}
        slotCountsByDate={slotCountsByDate}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
        minDate={minDate}
        maxDate={maxDate}
        loading={slotsLoading}
        viewerTimezone={viewerTimezone}
      />
      {todayZeroSlots && nextAvailableDate ? (
        <AlertBanner variant="info">
          No slots today. Next availability is{" "}
          {formatDateKeyLabel(nextAvailableDate, viewerTimezone)}.
        </AlertBanner>
      ) : null}
    </div>
  );
}
