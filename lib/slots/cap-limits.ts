import type { Calendar, CalendarMember } from "@/lib/types";

export type EffectiveCaps = {
  maxPerDay: number;
  maxPerWeek: number;
};

export function effectiveCaps(
  member: CalendarMember,
  calendar: Calendar,
): EffectiveCaps {
  return {
    maxPerDay: member.maxPerDayOverride ?? calendar.defaultMaxPerDay,
    maxPerWeek: member.maxPerWeekOverride ?? calendar.defaultMaxPerWeek,
  };
}
