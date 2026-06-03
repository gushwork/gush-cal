import type { Calendar, CalendarMember, IanaTimezone } from "@/lib/types";

export function effectiveTimezone(
  member: CalendarMember,
  calendar: Calendar,
): IanaTimezone {
  const hasOverride =
    member.workingHoursOverride != null &&
    member.workingHoursOverride.length > 0;

  if (hasOverride && member.timezone) {
    return member.timezone;
  }

  return calendar.timezone;
}
