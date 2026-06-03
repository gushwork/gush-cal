import { describe, expect, it, vi } from "vitest";
import { toUtcInstant } from "@/components/availability-grid/time-utils";
import {
  addLocalDays,
  endOfLocalDay,
  startOfLocalDay,
} from "@/lib/datetime/local-day";
import type { DbMeetingCounter } from "@/lib/ports/meeting-counter";
import { createGoogleCalendarStub } from "@/lib/stubs/google-calendar-stub";
import { createSlotEnginePort } from "@/lib/slots";
import type { CalendarBundle } from "@/lib/types";

const IST = "Asia/Kolkata";

const weekdayHours = [
  { day: 1, start: 540, end: 1020 },
  { day: 2, start: 540, end: 1020 },
  { day: 3, start: 540, end: 1020 },
  { day: 4, start: 540, end: 1020 },
  { day: 5, start: 540, end: 1020 },
];

function makeBundle(overrides?: Partial<CalendarBundle>): CalendarBundle {
  return {
    id: "cal-1",
    schedulerId: "sched-1",
    name: "Panel",
    slug: "slug",
    bookingWindowDays: 14,
    minNoticeHours: 24,
    defaultMaxPerDay: 3,
    defaultMaxPerWeek: 15,
    defaultWorkingHours: weekdayHours,
    timezone: IST,
    durations: [60],
    createdAt: "2026-01-01T00:00:00.000Z",
    scheduler: { id: "sched-1", email: "r@acme.com", name: "Recruiter" },
    members: [
      {
        id: "m-1",
        calendarId: "cal-1",
        email: "a@acme.com",
        displayName: "Alice",
        maxPerDayOverride: null,
        maxPerWeekOverride: null,
        workingHoursOverride: null,
        timezone: null,
        sortOrder: 1,
      },
    ],
    ...overrides,
  };
}

const emptyDb: DbMeetingCounter = {
  async countMeetingsForMember() {
    return 0;
  },
  async countMeetingsForMemberOnDay() {
    return 0;
  },
};

describe("availability grid bookable path (June 4 IST)", () => {
  it("guest policy ignores stored minNoticeHours (e.g. 24h)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-03T14:00:00.000Z")); // 19:30 IST

    const engine = createSlotEnginePort({
      google: createGoogleCalendarStub(),
      db: emptyDb,
    });
    const tomorrowStart = startOfLocalDay(
      addLocalDays(new Date(), 1, IST),
      IST,
    );
    const tomorrowEnd = endOfLocalDay(addLocalDays(new Date(), 1, IST), IST);

    const slots = await engine.getAvailableSlots({
      bundle: makeBundle({ minNoticeHours: 24 }),
      durationMinutes: 60,
      rangeStart: toUtcInstant(tomorrowStart),
      rangeEnd: toUtcInstant(tomorrowEnd),
      viewerTimezone: IST,
      bookingPolicy: "guest",
    });

    expect(slots.length).toBeGreaterThan(0);
    vi.useRealTimers();
  });

  it("guest policy with bookingWindowDays=1 still includes June 4 at 19:30 IST", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-03T14:00:00.000Z"));

    const engine = createSlotEnginePort({
      google: createGoogleCalendarStub(),
      db: emptyDb,
    });
    const tomorrowStart = startOfLocalDay(
      addLocalDays(new Date(), 1, IST),
      IST,
    );
    const tomorrowEnd = endOfLocalDay(addLocalDays(new Date(), 1, IST), IST);

    const slots = await engine.getAvailableSlots({
      bundle: makeBundle({ bookingWindowDays: 1, minNoticeHours: 24 }),
      durationMinutes: 60,
      rangeStart: toUtcInstant(tomorrowStart),
      rangeEnd: toUtcInstant(tomorrowEnd),
      viewerTimezone: IST,
      bookingPolicy: "guest",
    });

    expect(slots.length).toBeGreaterThan(0);
    vi.useRealTimers();
  });
});
