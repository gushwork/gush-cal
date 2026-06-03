import { describe, expect, it } from "vitest";
import { effectiveTimezone } from "@/lib/working-hours/effective-timezone";
import type { Calendar, CalendarMember } from "@/lib/types";

const calendar: Calendar = {
  id: "c1",
  schedulerId: "s1",
  name: "Panel",
  slug: "slug",
  bookingWindowDays: 14,
  minNoticeHours: 0,
  defaultMaxPerDay: 3,
  defaultMaxPerWeek: 15,
  defaultWorkingHours: [],
  timezone: "America/New_York",
  durations: [30],
  createdAt: "2026-01-01T00:00:00.000Z",
};

const member: CalendarMember = {
  id: "m1",
  calendarId: "c1",
  email: "a@acme.com",
  displayName: null,
  maxPerDayOverride: null,
  maxPerWeekOverride: null,
  workingHoursOverride: [{ day: 1, start: 540, end: 1020 }],
  timezone: "Asia/Tokyo",
  sortOrder: 1,
};

describe("effectiveTimezone", () => {
  it("uses member timezone when override set", () => {
    expect(effectiveTimezone(member, calendar)).toBe("Asia/Tokyo");
  });

  it("uses calendar timezone when no override", () => {
    expect(
      effectiveTimezone(
        { ...member, workingHoursOverride: null, timezone: null },
        calendar,
      ),
    ).toBe("America/New_York");
  });
});
