"use client";

import { useCallback, useMemo } from "react";
import {
  CalendarDayOverlay,
  calendarDayAriaLabel,
  type CalendarDayState,
} from "@/components/booking/calendar-day-overlay";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/ui/cn";
import type { IanaTimezone } from "@/lib/types";
import { toDateKey } from "./group-slots-by-date";
import type { DateKey } from "./types";
import type { DayButtonProps } from "react-day-picker";

export type BookingCalendarProps = {
  visibleMonth: { year: number; month: number };
  onMonthChange: (year: number, month: number) => void;
  slotCountsByDate: Map<DateKey, number>;
  selectedDate: DateKey | null;
  onSelectDate: (date: DateKey) => void;
  minDate: Date;
  maxDate: Date;
  loading?: boolean;
  viewerTimezone: IanaTimezone;
};

/** Sunday = 0 for the first day of a 1-based month. */
export function firstWeekdayOfMonth(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

export function dateKeyForDay(
  year: number,
  month: number,
  day: number,
  timezone: IanaTimezone,
): DateKey {
  const utc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return toDateKey(utc, timezone);
}

export function isDateKeyInWindow(
  dateKey: DateKey,
  minDate: Date,
  maxDate: Date,
  timezone: IanaTimezone,
): boolean {
  const minKey = toDateKey(minDate, timezone);
  const maxKey = toDateKey(maxDate, timezone);
  return dateKey >= minKey && dateKey <= maxKey;
}

function dateKeyToLocalDate(dateKey: DateKey): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function resolveDayState(
  inRange: boolean,
  slotCount: number,
  selected: boolean,
  outside: boolean,
): CalendarDayState {
  if (outside) {
    return "outside-month";
  }
  if (selected) {
    return "selected";
  }
  if (!inRange) {
    return "out-of-window";
  }
  if (slotCount === 0) {
    return "no-slots";
  }
  return "available";
}

function CalendarSkeletonGrid() {
  return (
    <div
      className="grid grid-cols-7 gap-1.5"
      aria-busy="true"
      aria-label="Loading calendar"
    >
      {Array.from({ length: 42 }, (_, i) => (
        <Skeleton key={i} className="min-h-[3.25rem] w-full rounded-lg" />
      ))}
    </div>
  );
}

export function BookingCalendar({
  visibleMonth,
  onMonthChange,
  slotCountsByDate,
  selectedDate,
  onSelectDate,
  minDate,
  maxDate,
  loading,
  viewerTimezone,
}: BookingCalendarProps) {
  const monthDate = useMemo(
    () => new Date(visibleMonth.year, visibleMonth.month - 1, 1),
    [visibleMonth.year, visibleMonth.month],
  );

  const selected = useMemo(
    () => (selectedDate ? dateKeyToLocalDate(selectedDate) : undefined),
    [selectedDate],
  );

  const isDayDisabled = useCallback(
    (date: Date) => {
      if (loading) {
        return true;
      }
      const key = toDateKey(date, viewerTimezone);
      const inRange = isDateKeyInWindow(key, minDate, maxDate, viewerTimezone);
      const count = slotCountsByDate.get(key) ?? 0;
      return !inRange || count === 0;
    },
    [loading, viewerTimezone, minDate, maxDate, slotCountsByDate],
  );

  const DayButton = useCallback(
    ({ day, modifiers, className, ...buttonProps }: DayButtonProps) => {
      const dateKey = toDateKey(day.date, viewerTimezone);
      const inRange = isDateKeyInWindow(
        dateKey,
        minDate,
        maxDate,
        viewerTimezone,
      );
      const slotCount = slotCountsByDate.get(dateKey) ?? 0;
      const selectedDay = selectedDate === dateKey;
      const state = resolveDayState(
        inRange,
        slotCount,
        selectedDay,
        Boolean(modifiers.outside),
      );
      const dayNumber = day.date.getDate();

      return (
        <button
          type="button"
          {...buttonProps}
          aria-label={calendarDayAriaLabel(dayNumber, state, slotCount)}
          className={cn(
            "interactive relative flex min-h-[3.25rem] w-full flex-col items-center justify-center rounded-lg border text-sm transition-colors",
            state === "selected" &&
              "cursor-pointer border-primary bg-primary text-white",
            state === "available" &&
              "cursor-pointer border-border bg-surface ring-1 ring-primary/20 hover:border-primary/50",
            state === "no-slots" &&
              "cursor-not-allowed border-dashed border-border/80 bg-paper",
            state === "out-of-window" &&
              "cursor-not-allowed border-transparent bg-transparent",
            state === "outside-month" && "border-transparent opacity-40",
            className,
          )}
        >
          <CalendarDayOverlay
            day={dayNumber}
            slotCount={slotCount}
            state={state}
          />
        </button>
      );
    },
    [
      viewerTimezone,
      minDate,
      maxDate,
      slotCountsByDate,
      selectedDate,
    ],
  );

  if (loading) {
    return <CalendarSkeletonGrid />;
  }

  return (
    <Calendar
      mode="single"
      month={monthDate}
      onMonthChange={(month) =>
        onMonthChange(month.getFullYear(), month.getMonth() + 1)
      }
      selected={selected}
      onSelect={(date) => {
        if (date) {
          onSelectDate(toDateKey(date, viewerTimezone));
        }
      }}
      disabled={isDayDisabled}
      showOutsideDays
      components={{ DayButton }}
    />
  );
}
