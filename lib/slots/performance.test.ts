import { describe, expect, it, vi, beforeEach } from "vitest";
import type { CalendarBundle } from "@/lib/types";
import type { DbMeetingCounter } from "@/lib/ports/meeting-counter";
import { createGoogleCalendarStub } from "@/lib/stubs/google-calendar-stub";
import { clearFreeBusyCache } from "./freebusy-cache";
import { fetchBookableSlotsBatch } from "./fetch-bookable-slots-batch";
import { computeAvailableSlots } from "./generate-slots";

const weekdayHours = [
  { day: 1, start: 540, end: 1020 },
  { day: 2, start: 540, end: 1020 },
  { day: 3, start: 540, end: 1020 },
  { day: 4, start: 540, end: 1020 },
  { day: 5, start: 540, end: 1020 },
];

function makeBundle(): CalendarBundle {
  return {
    id: "cal-perf",
    schedulerId: "sched-1",
    name: "Panel",
    slug: "slug",
    bookingWindowDays: 14,
    minNoticeHours: 0,
    defaultMaxPerDay: 4,
    defaultMaxPerWeek: 20,
    defaultWorkingHours: weekdayHours,
    timezone: "America/New_York",
    durations: [30],
    createdAt: "2026-01-01T00:00:00.000Z",
    scheduler: { id: "sched-1", email: "r@acme.com", name: "Recruiter" },
    members: Array.from({ length: 4 }, (_, index) => ({
      id: `m-${index}`,
      calendarId: "cal-perf",
      email: `member${index}@acme.com`,
      displayName: `Member ${index}`,
      maxPerDayOverride: null,
      maxPerWeekOverride: null,
      workingHoursOverride: null,
      timezone: null,
      sortOrder: index,
    })),
  };
}

function makeDb(): DbMeetingCounter {
  return {
    async countMeetingsForMember() {
      return 0;
    },
    async countMeetingsForMemberOnDay() {
      return 0;
    },
    async listMeetingStartsForMembers(memberIds) {
      return new Map(memberIds.map((id) => [id, []]));
    },
  };
}

describe("SP-22 availability performance", () => {
  beforeEach(() => {
    clearFreeBusyCache();
  });

  it("calls queryFreeBusy once per range and uses cache on repeat", async () => {
    const google = createGoogleCalendarStub();
    const querySpy = vi.spyOn(google, "queryFreeBusy");
    const deps = { google, db: makeDb() };
    const bundle = makeBundle();
    const req = {
      bundle,
      durationMinutes: 30,
      rangeStart: "2026-06-08T04:00:00.000Z",
      rangeEnd: "2026-06-15T03:59:59.999Z",
      viewerTimezone: "America/New_York",
      bookingPolicy: "admin" as const,
    };

    await computeAvailableSlots(deps, req);
    await computeAvailableSlots(deps, req);

    expect(querySpy).toHaveBeenCalledTimes(1);
  });

  it("fetchBookableSlotsBatch invokes onDayLoaded per day in range", async () => {
    const google = createGoogleCalendarStub();
    const deps = { google, db: makeDb() };
    const loaded: string[] = [];

    await fetchBookableSlotsBatch(
      deps,
      {
        bundle: makeBundle(),
        durationMinutes: 30,
        rangeStart: "2026-06-08T04:00:00.000Z",
        rangeEnd: "2026-06-10T03:59:59.999Z",
        viewerTimezone: "America/New_York",
        bookingPolicy: "admin",
      },
      {
        onDayLoaded: (dayKey) => {
          loaded.push(dayKey);
        },
      },
    );

    expect(loaded.length).toBeGreaterThanOrEqual(2);
  });

  it("week-range slot generation completes under 3s with stubbed google", async () => {
    const google = createGoogleCalendarStub();
    const deps = { google, db: makeDb() };
    const start = performance.now();

    await computeAvailableSlots(deps, {
      bundle: makeBundle(),
      durationMinutes: 30,
      rangeStart: "2026-06-08T04:00:00.000Z",
      rangeEnd: "2026-06-15T03:59:59.999Z",
      viewerTimezone: "America/New_York",
      bookingPolicy: "admin",
    });

    expect(performance.now() - start).toBeLessThan(3000);
  });
});
