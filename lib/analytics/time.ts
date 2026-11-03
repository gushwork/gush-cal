import { getLocalDateTimeParts } from "@/lib/datetime/local-day";

/** Reporting windows offered by the analytics dashboards (rolling days). */
export const ANALYTICS_RANGES = [7, 30, 90] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];
export const DEFAULT_ANALYTICS_RANGE: AnalyticsRange = 30;

export const DAY_MS = 86_400_000;

/** Parses a `?range=` search param; anything unknown falls back to 30 days. */
export function parseAnalyticsRange(value: string | string[] | undefined): AnalyticsRange {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return (ANALYTICS_RANGES as readonly number[]).includes(parsed)
    ? (parsed as AnalyticsRange)
    : DEFAULT_ANALYTICS_RANGE;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** `YYYY-MM-DD` of the instant in the given IANA timezone. */
export function localDayKey(instant: Date, timeZone: string): string {
  const { year, month, day } = getLocalDateTimeParts(instant, timeZone);
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Day-of-week (0 = Monday … 6 = Sunday) and hour (0–23) in the timezone. */
export function localWeekdayHour(
  instant: Date,
  timeZone: string,
): { weekday: number; hour: number } {
  const { year, month, day, hour } = getLocalDateTimeParts(instant, timeZone);
  const sundayFirst = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return { weekday: (sundayFirst + 6) % 7, hour };
}

/**
 * The `count` local calendar days ending with today (in `timeZone`), oldest
 * first. Pure date arithmetic on the local date, so DST never skips a day.
 */
export function trailingDayKeys(now: Date, count: number, timeZone: string): string[] {
  const { year, month, day } = getLocalDateTimeParts(now, timeZone);
  const keys: string[] = [];
  for (let offset = count - 1; offset >= 0; offset--) {
    const date = new Date(Date.UTC(year, month - 1, day - offset));
    keys.push(
      `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`,
    );
  }
  return keys;
}

/** The `count` local calendar days starting today (in `timeZone`). */
export function leadingDayKeys(now: Date, count: number, timeZone: string): string[] {
  const { year, month, day } = getLocalDateTimeParts(now, timeZone);
  const keys: string[] = [];
  for (let offset = 0; offset < count; offset++) {
    const date = new Date(Date.UTC(year, month - 1, day + offset));
    keys.push(
      `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`,
    );
  }
  return keys;
}

const shortDay = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const weekdayShort = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  timeZone: "UTC",
});

function keyToUtcDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * "Nov 3" for a day key. Fixed locale + UTC on a date-only key, so the label
 * is identical on every server and never depends on the viewer's clock.
 */
export function formatDayKey(key: string): string {
  return shortDay.format(keyToUtcDate(key));
}

/** "Mon" for a day key. */
export function formatDayKeyWeekday(key: string): string {
  return weekdayShort.format(keyToUtcDate(key));
}

/** Percentage change from previous to current; null when there is no baseline. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return ((current - previous) / previous) * 100;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** Compact human duration for hours: "45m", "6h", "3.5d". */
export function formatLeadTime(hours: number | null): string {
  if (hours === null) return "—";
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`;
  if (hours < 48) return `${Math.round(hours)}h`;
  const days = hours / 24;
  return `${days < 10 ? days.toFixed(1).replace(/\.0$/, "") : Math.round(days)}d`;
}

/** "just now", "5h ago", "3d ago", "4mo ago" relative to `now` (server-rendered only). */
export function formatRelative(instant: string | null, now: Date): string {
  if (!instant) return "Never";
  const diff = now.getTime() - new Date(instant).getTime();
  if (diff < 0) return "Upcoming";
  const minutes = diff / 60_000;
  if (minutes < 60) return minutes < 2 ? "Just now" : `${Math.floor(minutes)}m ago`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  const days = hours / 24;
  if (days < 45) return `${Math.floor(days)}d ago`;
  const months = days / 30;
  if (months < 18) return `${Math.floor(months)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}
