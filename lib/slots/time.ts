import {
  addLocalDays,
  addLocalHours,
  endOfLocalDay,
  startOfLocalDay,
} from "@/lib/datetime/local-day";

export const SLOT_INCREMENT_MINUTES = 15;

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

/**
 * Booking bounds in the viewer's timezone.
 * - earliest: now + minNoticeHours
 * - latest: end of the calendar day (today + bookingWindowDays) in viewer TZ
 */
export function getBookingWindow(
  now: Date,
  minNoticeHours: number,
  bookingWindowDays: number,
  viewerTimezone?: string,
): { earliest: Date; latest: Date } {
  const earliest =
    viewerTimezone && minNoticeHours > 0
      ? addLocalHours(now, minNoticeHours, viewerTimezone)
      : addMinutes(now, minNoticeHours * 60);

  if (!viewerTimezone) {
    return {
      earliest,
      latest: new Date(now.getTime() + bookingWindowDays * 24 * 60 * 60_000),
    };
  }

  const todayStart = startOfLocalDay(now, viewerTimezone);
  const lastBookableDay = addLocalDays(
    todayStart,
    bookingWindowDays,
    viewerTimezone,
  );
  const latest = endOfLocalDay(lastBookableDay, viewerTimezone);

  return { earliest, latest };
}
