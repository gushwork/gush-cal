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
import { getBookingWindow } from "@/lib/slots/time";
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
  async listMeetingStartsForMembers(memberIds) {
    return new Map(memberIds.map((memberId) => [memberId, []]));
  },
};

describe("availability grid bookable path (June 4 IST)", () => {
  it("guest policy excludes today when minNoticeHours is 24", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-03T14:00:00.000Z")); // 19:30 IST Wed

    const engine = createSlotEnginePort({
      google: createGoogleCalendarStub(),
      db: emptyDb,
    });
    const now = new Date();
    const todayStart = startOfLocalDay(now, IST);
    const todayEnd = endOfLocalDay(now, IST);

    const todaySlots = await engine.getAvailableSlots({
      bundle: makeBundle({ minNoticeHours: 24 }),
      durationMinutes: 60,
      rangeStart: toUtcInstant(todayStart),
      rangeEnd: toUtcInstant(todayEnd),
      viewerTimezone: IST,
      bookingPolicy: "guest",
    });

    expect(todaySlots.length).toBe(0);
    vi.useRealTimers();
  });

  it("guest policy only returns tomorrow slots on or after earliest notice", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-03T04:30:00.000Z")); // Wed 10:00 IST

    const engine = createSlotEnginePort({
      google: createGoogleCalendarStub(),
      db: emptyDb,
    });
    const now = new Date();
    const { earliest } = getBookingWindow(now, 4, 14, IST);
    const tomorrowStart = startOfLocalDay(
      addLocalDays(now, 1, IST),
      IST,
    );
    const tomorrowEnd = endOfLocalDay(addLocalDays(now, 1, IST), IST);

    const slots = await engine.getAvailableSlots({
      bundle: makeBundle({ minNoticeHours: 4 }),
      durationMinutes: 60,
      rangeStart: toUtcInstant(tomorrowStart),
      rangeEnd: toUtcInstant(tomorrowEnd),
      viewerTimezone: IST,
      bookingPolicy: "guest",
    });

    expect(slots.length).toBeGreaterThan(0);
    expect(
      slots.every(
        (slot) => new Date(slot.startsAt).getTime() >= earliest.getTime(),
      ),
    ).toBe(true);
    vi.useRealTimers();
  });

  it("admin policy ignores minNoticeHours within requested range", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-03T04:30:00.000Z")); // Wed 10:00 IST

    const engine = createSlotEnginePort({
      google: createGoogleCalendarStub(),
      db: emptyDb,
    });
    const now = new Date();
    const todayStart = startOfLocalDay(now, IST);
    const todayEnd = endOfLocalDay(now, IST);

    const slots = await engine.getAvailableSlots({
      bundle: makeBundle({ minNoticeHours: 24 }),
      durationMinutes: 60,
      rangeStart: toUtcInstant(todayStart),
      rangeEnd: toUtcInstant(todayEnd),
      viewerTimezone: IST,
      bookingPolicy: "admin",
    });

    expect(slots.length).toBeGreaterThan(0);
    vi.useRealTimers();
  });
});
