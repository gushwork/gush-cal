import type { Calendar, CalendarMember, WorkingHours } from "@/lib/types";

export function effectiveWorkingHours(
  member: CalendarMember,
  calendar: Calendar,
): WorkingHours {
  const override = member.workingHoursOverride;
  if (override && override.length > 0) {
    return override;
  }
  return calendar.defaultWorkingHours;
}

const WEEKDAY_TO_DAY: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Member working hours evaluated in the given IANA timezone (UTC if unknown). */
export function isWithinWorkingHours(
  startsAt: Date,
  durationMinutes: number,
  hours: WorkingHours,
  timezone: string,
): boolean {
  const tz = timezone || "UTC";
  const endAt = new Date(startsAt.getTime() + durationMinutes * 60_000);

  const startParts = getLocalTimeParts(startsAt, tz);
  const endParts = getLocalTimeParts(endAt, tz);

  if (startParts.day !== endParts.day) {
    return false;
  }

  const startMinutes = startParts.hour * 60 + startParts.minute;
  const endMinutes = endParts.hour * 60 + endParts.minute;

  return hours.some(
    (block) =>
      block.day === startParts.day &&
      startMinutes >= block.start &&
      endMinutes <= block.end,
  );
}

function getLocalTimeParts(date: Date, timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(date);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);

  return {
    day: WEEKDAY_TO_DAY[weekday] ?? 0,
    hour: hour === 24 ? 0 : hour,
    minute,
  };
}

export { getLocalTimeParts };
export { effectiveTimezone } from "@/lib/working-hours/effective-timezone";
