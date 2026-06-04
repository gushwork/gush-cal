import { toDateKey } from "@/components/booking/group-slots-by-date";
import type { DateKey } from "@/components/booking/types";
import type { IanaTimezone, Slot } from "@/lib/types";

export type BookingDeepLink = {
  date: DateKey;
  time: string;
  durationMinutes?: number;
};

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeBookingTimeParam(time: string): string | null {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return null;
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function slotLocalTimeKey(
  startsAt: string,
  timezone: IanaTimezone,
): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(startsAt));
}

export function parseBookingDeepLink(
  searchParams: URLSearchParams,
  allowedDurations: number[],
): BookingDeepLink | null {
  const date = searchParams.get("date");
  const time = searchParams.get("time");
  if (!date || !time || !DATE_KEY_PATTERN.test(date)) {
    return null;
  }

  const normalizedTime = normalizeBookingTimeParam(time);
  if (!normalizedTime) {
    return null;
  }

  const durationRaw = searchParams.get("duration");
  let durationMinutes: number | undefined;
  if (durationRaw) {
    const duration = Number(durationRaw);
    if (!Number.isFinite(duration) || !allowedDurations.includes(duration)) {
      return null;
    }
    durationMinutes = duration;
  }

  return { date, time: normalizedTime, durationMinutes };
}

export function findSlotForDeepLink(
  slots: Slot[],
  link: Pick<BookingDeepLink, "date" | "time">,
  timezone: IanaTimezone,
): Slot | undefined {
  return slots.find(
    (slot) =>
      toDateKey(new Date(slot.startsAt), timezone) === link.date &&
      slotLocalTimeKey(slot.startsAt, timezone) === link.time,
  );
}

export function monthFromDateKey(date: DateKey): { year: number; month: number } {
  const [year, month] = date.split("-").map(Number);
  return { year, month };
}
