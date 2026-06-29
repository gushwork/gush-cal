import type { UtcInstant } from "@/lib/types";
import {
  addLocalDays,
  endOfLocalDay,
  getLocalDateParts,
  getLocalDateTimeParts,
  startOfLocalDay,
} from "@/lib/datetime/local-day";

export {
  addLocalDays,
  endOfLocalDay,
  getLocalDateParts,
  getLocalDateTimeParts,
  startOfLocalDay,
};

const GRID_START_HOUR = 7;
const GRID_END_HOUR = 20;
const GRID_TOTAL_MINUTES = (GRID_END_HOUR - GRID_START_HOUR) * 60;

export function getViewerTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function toUtcInstant(date: Date): UtcInstant {
  return date.toISOString();
}

export function parseUtcInstant(iso: UtcInstant): Date {
  return new Date(iso);
}

/** Sunday-start week in the viewer timezone. */
export function startOfLocalWeek(date: Date, timeZone: string): Date {
  const dayStart = startOfLocalDay(date, timeZone);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(dayStart);

  const dayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    weekday,
  );
  return addLocalDays(dayStart, -dayIndex, timeZone);
}

export function endOfLocalWeek(date: Date, timeZone: string): Date {
  const weekStart = startOfLocalWeek(date, timeZone);
  return endOfLocalDay(addLocalDays(weekStart, 6, timeZone), timeZone);
}

export function formatLocalTime(iso: UtcInstant, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(parseUtcInstant(iso));
}

export function formatLocalDayLabel(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function minutesSinceGridStart(
  iso: UtcInstant,
  rangeStart: UtcInstant,
  timeZone: string,
): number {
  const slotParts = getLocalDateTimeParts(parseUtcInstant(iso), timeZone);
  const rangeParts = getLocalDateTimeParts(parseUtcInstant(rangeStart), timeZone);

  const dayDelta = Math.round(
    (Date.UTC(slotParts.year, slotParts.month - 1, slotParts.day) -
      Date.UTC(rangeParts.year, rangeParts.month - 1, rangeParts.day)) /
      86_400_000,
  );

  return (
    dayDelta * 24 * 60 +
    slotParts.hour * 60 +
    slotParts.minute -
    GRID_START_HOUR * 60
  );
}

export function blockPositionPercent(
  startIso: UtcInstant,
  endIso: UtcInstant,
  rangeStart: UtcInstant,
  timeZone: string,
): { top: number; height: number } | null {
  const startMinutes = minutesSinceGridStart(startIso, rangeStart, timeZone);
  const endMinutes = minutesSinceGridStart(endIso, rangeStart, timeZone);

  // Visible iff the block overlaps the [0, GRID_TOTAL_MINUTES) window; a block
  // starting before the window (prior day or pre-07:00) clamps to the top.
  if (endMinutes <= 0 || startMinutes >= GRID_TOTAL_MINUTES) {
    return null;
  }

  const clampedStart = Math.max(0, startMinutes);
  const clampedEnd = Math.min(GRID_TOTAL_MINUTES, endMinutes);

  const top = (clampedStart / GRID_TOTAL_MINUTES) * 100;
  const height =
    ((Math.max(clampedEnd, clampedStart + 1) - clampedStart) /
      GRID_TOTAL_MINUTES) *
    100;

  return { top, height };
}

export function gridHourLabels(): string[] {
  const labels: string[] = [];
  for (let hour = GRID_START_HOUR; hour <= GRID_END_HOUR; hour++) {
    const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const suffix = hour >= 12 ? "PM" : "AM";
    labels.push(`${display} ${suffix}`);
  }
  return labels;
}

/** Sticky column header height — must match across Time, member, and Bookable columns. */
export const GRID_COLUMN_HEADER_HEIGHT_PX = 52;

export { GRID_END_HOUR, GRID_START_HOUR, GRID_TOTAL_MINUTES };
