import { describe, expect, it, vi } from "vitest";
import type { CalendarBundle } from "@/lib/types";
import type { DbMeetingCounter } from "@/lib/ports/meeting-counter";
import { createGoogleCalendarStub } from "@/lib/stubs/google-calendar-stub";
import { effectiveCaps } from "@/lib/slots/cap-limits";
import { isSlotBusyForMember } from "@/lib/slots/eligibility";
import { createSlotEnginePort } from "@/lib/slots";
import { isWithinWorkingHours } from "@/lib/slots/working-hours";
import { toUtcInstant } from "@/components/availability-grid/time-utils";
import {
  addLocalDays,
  endOfLocalDay,
  startOfLocalDay,
} from "@/lib/datetime/local-day";
import { getBookingWindow } from "@/lib/slots/time";

const weekdayHours = [
  { day: 1, start: 540, end: 1020 },
  { day: 2, start: 540, end: 1020 },
  { day: 3, start: 540, end: 1020 },
  { day: 4, start: 540, end: 1020 },
  { day: 5, start: 540, end: 1020 },
];

const defaultHours = [{ day: 1, start: 540, end: 1020 }]; // Mon 9–17

function makeBundle(overrides?: Partial<CalendarBundle>): CalendarBundle {
  return {
    id: "cal-1",
    schedulerId: "sched-1",
    name: "Panel",
    slug: "slug",
    bookingWindowDays: 14,
    minNoticeHours: 0,
    defaultMaxPerDay: 2,
    defaultMaxPerWeek: 10,
    defaultWorkingHours: defaultHours,
    timezone: "UTC",
    durations: [30],
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
      {
        id: "m-2",
        calendarId: "cal-1",
        email: "b@acme.com",
        displayName: "Bob",
        maxPerDayOverride: null,
        maxPerWeekOverride: null,
        workingHoursOverride: null,
        timezone: null,
        sortOrder: 2,
      },
    ],
    ...overrides,
  };
}

function syntheticMeetings(
  memberId: string,
  counts: Record<string, { daily: number; weekly: number }>,
): string[] {
  const config = counts[memberId] ?? { daily: 0, weekly: 0 };
  if (config.weekly === 0) {
    return [];
  }

  return Array.from({ length: config.weekly }, (_, index) =>
    `2026-06-01T${String(9 + (index % 8)).padStart(2, "0")}:00:00.000Z`,
  );
}

function makeDb(counts: Record<string, { daily: number; weekly: number }>): DbMeetingCounter {
  return {
    async countMeetingsForMember(memberId, _wStart, _wEnd) {
      return counts[memberId]?.weekly ?? 0;
    },
    async countMeetingsForMemberOnDay(memberId, _dStart, _dEnd) {
      return counts[memberId]?.daily ?? 0;
    },
    async listMeetingStartsForMembers(memberIds, windowStart, windowEnd) {
      const windowStartMs = new Date(windowStart).getTime();
      const windowEndMs = new Date(windowEnd).getTime();

      return new Map(
        memberIds.map((memberId) => [
          memberId,
          syntheticMeetings(memberId, counts).filter((start) => {
            const time = new Date(start).getTime();
            return time >= windowStartMs && time < windowEndMs;
          }),
        ]),
      );
    },
  };
}

describe("effectiveCaps", () => {
  it("uses calendar defaults when no override", () => {
    const bundle = makeBundle();
    const caps = effectiveCaps(bundle.members[0]!, bundle);
    expect(caps).toEqual({ maxPerDay: 2, maxPerWeek: 10 });
  });

  it("applies member override when set", () => {
    const bundle = makeBundle();
    const member = {
      ...bundle.members[0]!,
      maxPerDayOverride: 5,
      maxPerWeekOverride: 1,
    };
    expect(effectiveCaps(member, bundle)).toEqual({ maxPerDay: 5, maxPerWeek: 1 });
  });
});

describe("effectiveWorkingHours", () => {
  it("treats empty override as calendar default", async () => {
    const { effectiveWorkingHours } = await import("@/lib/slots/working-hours");
    const bundle = makeBundle();
    const member = {
      ...bundle.members[0]!,
      workingHoursOverride: [],
    };
    expect(effectiveWorkingHours(member, bundle)).toEqual(
      bundle.defaultWorkingHours,
    );
  });
});

describe("isWithinWorkingHours", () => {
  it("accepts slot inside Monday 9–17 UTC", () => {
    const monday10am = new Date("2026-06-01T10:00:00.000Z"); // Mon
    expect(
      isWithinWorkingHours(monday10am, 30, defaultHours, "UTC"),
    ).toBe(true);
  });
});

describe("isSlotBusyForMember", () => {
  it("detects overlap with busy block", () => {
    const starts = new Date("2026-06-03T10:00:00.000Z");
    expect(
      isSlotBusyForMember(starts, 30, [
        { start: "2026-06-03T10:15:00.000Z", end: "2026-06-03T11:00:00.000Z" },
      ]),
    ).toBe(true);
  });
});

describe("createSlotEnginePort", () => {
  it("excludes busy members from slots", async () => {
    const google = createGoogleCalendarStub();
    vi.spyOn(google, "queryFreeBusy").mockResolvedValue({
      byEmail: {
        "a@acme.com": {
          status: "ok",
          busy: [
            {
              start: "2026-06-08T09:00:00.000Z",
              end: "2026-06-08T18:00:00.000Z",
            },
          ],
        },
        "b@acme.com": { status: "ok", busy: [] },
      },
    });

    const engine = createSlotEnginePort({ google, db: makeDb({}) });
    const slots = await engine.getAvailableSlots({
      bundle: makeBundle({ minNoticeHours: 0 }),
      durationMinutes: 30,
      rangeStart: "2026-06-08T09:00:00.000Z",
      rangeEnd: "2026-06-08T12:00:00.000Z",
      viewerTimezone: "UTC",
    });

    expect(slots.length).toBeGreaterThan(0);
    expect(slots.every((s) => s.eligibleMemberCount >= 1)).toBe(true);
  });

  it("buildMeetingCounts uses one list query for all members", async () => {
    let listCalls = 0;
    let countCalls = 0;
    const db: DbMeetingCounter = {
      async countMeetingsForMember() {
        countCalls++;
        return 0;
      },
      async countMeetingsForMemberOnDay() {
        countCalls++;
        return 0;
      },
      async listMeetingStartsForMembers(memberIds) {
        listCalls++;
        return new Map(memberIds.map((memberId) => [memberId, []]));
      },
    };

    const { buildMeetingCounts } = await import("@/lib/slots/eligibility");
    await buildMeetingCounts(
      makeBundle().members,
      new Date("2026-06-01T10:00:00.000Z"),
      db,
    );

    expect(listCalls).toBe(1);
    expect(countCalls).toBe(0);
  });

  it("prefetches meetings once per range instead of per slot", async () => {
    let listCalls = 0;
    let countCalls = 0;
    const db: DbMeetingCounter = {
      async countMeetingsForMember() {
        countCalls++;
        return 0;
      },
      async countMeetingsForMemberOnDay() {
        countCalls++;
        return 0;
      },
      async listMeetingStartsForMembers(memberIds) {
        listCalls++;
        return new Map(memberIds.map((memberId) => [memberId, []]));
      },
    };

    const google = createGoogleCalendarStub();
    const engine = createSlotEnginePort({ google, db });
    const bundle = makeBundle({
      minNoticeHours: 0,
      bookingWindowDays: 14,
      defaultWorkingHours: weekdayHours,
    });

    await engine.getAvailableSlots({
      bundle,
      durationMinutes: 60,
      rangeStart: "2026-06-03T09:00:00.000Z",
      rangeEnd: "2026-06-10T17:00:00.000Z",
      viewerTimezone: "UTC",
      bookingPolicy: "admin",
    });

    expect(listCalls).toBe(1);
    expect(countCalls).toBe(0);
  });

  it("load-balances assignment toward member with fewer weekly meetings", async () => {
    const google = createGoogleCalendarStub();
    const engine = createSlotEnginePort({
      google,
      db: makeDb({ "m-1": { daily: 0, weekly: 5 }, "m-2": { daily: 0, weekly: 1 } }),
    });

    const result = await engine.assignMember({
      bundle: makeBundle(),
      startsAt: "2026-06-01T10:00:00.000Z",
      durationMinutes: 30,
      viewerTimezone: "UTC",
    });

    expect(result).toEqual({
      ok: true,
      member: expect.objectContaining({ id: "m-2" }),
    });
  });

  it("returns SLOT_UNAVAILABLE when all members over cap", async () => {
    const google = createGoogleCalendarStub();
    const engine = createSlotEnginePort({
      google,
      db: makeDb({
        "m-1": { daily: 2, weekly: 10 },
        "m-2": { daily: 2, weekly: 10 },
      }),
    });

    const result = await engine.assignMember({
      bundle: makeBundle(),
      startsAt: "2026-06-01T10:00:00.000Z",
      durationMinutes: 30,
      viewerTimezone: "UTC",
    });

    expect(result).toEqual({ ok: false, code: "SLOT_UNAVAILABLE" });
  });

  it("evaluates working hours in member effective TZ, not guest TZ", async () => {
    const google = createGoogleCalendarStub();
    const engine = createSlotEnginePort({ google, db: makeDb({}) });
    const tokyoHours = [{ day: 1, start: 540, end: 1020 }]; // Mon 9–17
    const startsAt = "2026-06-08T00:30:00.000Z"; // Mon 09:30 Asia/Tokyo; Mon 00:30 UTC (out of hours)

    const bundle = makeBundle({
      minNoticeHours: 0,
      timezone: "America/New_York",
      defaultWorkingHours: tokyoHours,
      members: [
        {
          id: "m-1",
          calendarId: "cal-1",
          email: "a@acme.com",
          displayName: "Alice",
          maxPerDayOverride: null,
          maxPerWeekOverride: null,
          workingHoursOverride: tokyoHours,
          timezone: "Asia/Tokyo",
          sortOrder: 1,
        },
      ],
    });

    const guestTz = "Europe/London";

    const slots = await engine.getAvailableSlots({
      bundle,
      durationMinutes: 30,
      rangeStart: startsAt,
      rangeEnd: "2026-06-08T01:00:00.000Z",
      viewerTimezone: guestTz,
    });

    expect(slots.some((slot) => slot.startsAt === startsAt)).toBe(true);

    const assignment = await engine.assignMember({
      bundle,
      startsAt,
      durationMinutes: 30,
      viewerTimezone: guestTz,
    });

    expect(assignment).toEqual({
      ok: true,
      member: expect.objectContaining({ id: "m-1" }),
    });

    const utcOnlyBundle = makeBundle({
      minNoticeHours: 0,
      timezone: "UTC",
      defaultWorkingHours: tokyoHours,
    });

    const utcSlots = await engine.getAvailableSlots({
      bundle: utcOnlyBundle,
      durationMinutes: 30,
      rangeStart: startsAt,
      rangeEnd: "2026-06-08T01:00:00.000Z",
      viewerTimezone: guestTz,
    });

    expect(utcSlots.some((slot) => slot.startsAt === startsAt)).toBe(false);
  });

  it("guest policy excludes past days and includes tomorrow", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-03T18:00:00.000Z")); // Wed 2pm ET

    const tz = "America/New_York";
    const anchor = new Date("2026-06-03T18:00:00.000Z");
    const google = createGoogleCalendarStub();
    const engine = createSlotEnginePort({ google, db: makeDb({}) });
    const bundle = makeBundle({
      defaultWorkingHours: weekdayHours,
      timezone: tz,
      durations: [60],
    });

    const todayStart = startOfLocalDay(anchor, tz);
    const todayEnd = endOfLocalDay(anchor, tz);
    const tomorrowStart = startOfLocalDay(addLocalDays(anchor, 1, tz), tz);
    const tomorrowEnd = endOfLocalDay(addLocalDays(anchor, 1, tz), tz);
    const yesterdayStart = startOfLocalDay(addLocalDays(anchor, -1, tz), tz);
    const yesterdayEnd = endOfLocalDay(addLocalDays(anchor, -1, tz), tz);

    const guestRequest = {
      bundle,
      durationMinutes: 60,
      viewerTimezone: tz,
      bookingPolicy: "guest" as const,
    };

    const todaySlots = await engine.getAvailableSlots({
      ...guestRequest,
      rangeStart: toUtcInstant(todayStart),
      rangeEnd: toUtcInstant(todayEnd),
    });
    const tomorrowSlots = await engine.getAvailableSlots({
      ...guestRequest,
      rangeStart: toUtcInstant(tomorrowStart),
      rangeEnd: toUtcInstant(tomorrowEnd),
    });
    const yesterdaySlots = await engine.getAvailableSlots({
      ...guestRequest,
      rangeStart: toUtcInstant(yesterdayStart),
      rangeEnd: toUtcInstant(yesterdayEnd),
    });

    expect(todaySlots.length).toBeGreaterThan(0);
    expect(yesterdaySlots.length).toBe(0);
    expect(tomorrowSlots.length).toBeGreaterThan(0);
    expect(
      tomorrowSlots.every(
        (slot) => new Date(slot.startsAt).getTime() >= tomorrowStart.getTime(),
      ),
    ).toBe(true);

    vi.useRealTimers();
  });

  it("IST guest with bookingWindowDays 1 still books tomorrow through working hours", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-03T04:30:00.000Z")); // Wed 10:00 IST

    const tz = "Asia/Kolkata";
    const anchor = new Date();
    const google = createGoogleCalendarStub();
    const engine = createSlotEnginePort({ google, db: makeDb({}) });
    const bundle = makeBundle({
      bookingWindowDays: 1,
      minNoticeHours: 4,
      defaultWorkingHours: weekdayHours,
      timezone: tz,
      durations: [60],
    });

    const tomorrowStart = startOfLocalDay(addLocalDays(anchor, 1, tz), tz);
    const tomorrowEnd = endOfLocalDay(addLocalDays(anchor, 1, tz), tz);

    const { latest } = getBookingWindow(anchor, 4, 1, tz);
    expect(latest.getTime()).toBe(tomorrowEnd.getTime());

    const tomorrowSlots = await engine.getAvailableSlots({
      bundle,
      durationMinutes: 60,
      rangeStart: toUtcInstant(tomorrowStart),
      rangeEnd: toUtcInstant(tomorrowEnd),
      viewerTimezone: tz,
      bookingPolicy: "guest",
    });

    expect(tomorrowSlots.length).toBeGreaterThan(0);
    expect(
      tomorrowSlots.some((slot) => {
        const hour = Number(
          new Intl.DateTimeFormat("en-US", {
            timeZone: tz,
            hour: "numeric",
            hourCycle: "h23",
          }).format(new Date(slot.startsAt)),
        );
        return hour >= 9 && hour < 17;
      }),
    ).toBe(true);

    vi.useRealTimers();
  });
});
