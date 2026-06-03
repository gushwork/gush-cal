import type { IanaTimezone, Slot } from "@/lib/types";
import type { DateKey, GroupedSlots } from "./types";

/** Format a Date as YYYY-MM-DD in the given IANA timezone. */
export function toDateKey(date: Date, timezone: IanaTimezone): DateKey {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return parts; // en-CA yields YYYY-MM-DD
}

export function groupSlotsByDate(
  slots: Slot[],
  timezone: IanaTimezone,
): GroupedSlots {
  const grouped: GroupedSlots = new Map();

  for (const slot of slots) {
    const key = toDateKey(new Date(slot.startsAt), timezone);
    const existing = grouped.get(key) ?? [];
    existing.push(slot);
    grouped.set(key, existing);
  }

  for (const [key, daySlots] of grouped) {
    daySlots.sort(
      (a, b) =>
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
    grouped.set(key, daySlots);
  }

  return grouped;
}

export function countSlotsByDate(grouped: GroupedSlots): Map<DateKey, number> {
  const counts = new Map<DateKey, number>();
  for (const [key, daySlots] of grouped) {
    counts.set(key, daySlots.length);
  }
  return counts;
}

export function getMonthBounds(
  year: number,
  month: number,
): { start: Date; end: Date } {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { start, end };
}

export function intersectRange(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): { start: Date; end: Date } | null {
  const start = new Date(Math.max(aStart.getTime(), bStart.getTime()));
  const end = new Date(Math.min(aEnd.getTime(), bEnd.getTime()));
  if (start >= end) {
    return null;
  }
  return { start, end };
}
