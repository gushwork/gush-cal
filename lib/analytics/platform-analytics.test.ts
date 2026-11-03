import { describe, expect, it } from "vitest";
import {
  computePlatformAnalytics,
  type PlatformAnalyticsInput,
  type PlatformMeeting,
} from "./platform-analytics";

const NOW = new Date("2026-11-03T12:00:00Z");
const DAY = 86_400_000;
const iso = (offsetDays: number) => new Date(NOW.getTime() + offsetDays * DAY).toISOString();

function meeting(overrides: Partial<PlatformMeeting>): PlatformMeeting {
  return {
    calendarId: "c1",
    bookedBy: "guest",
    durationMinutes: 60,
    startsAt: iso(-1),
    createdAt: iso(-2),
    cancelledAt: null,
    ...overrides,
  };
}

function input(overrides: Partial<PlatformAnalyticsInput> = {}): PlatformAnalyticsInput {
  return {
    schedulers: [
      { id: "s1", email: "ana@gushwork.ai", name: "Ana", createdAt: iso(-100) },
      { id: "s2", email: "ben@gushwork.ai", name: "Ben", createdAt: iso(-3) },
      { id: "s3", email: "cy@gushwork.ai", name: "Cy", createdAt: iso(-60) },
    ],
    calendars: [
      { id: "c1", schedulerId: "s1", name: "Eng panel", slug: "eng", createdAt: iso(-90) },
      { id: "c2", schedulerId: "s1", name: "Design", slug: "design", createdAt: iso(-2) },
      { id: "c3", schedulerId: "s3", name: "Sales", slug: "sales", createdAt: iso(-50) },
    ],
    memberCounts: { c1: 4, c2: 2 },
    meetings: [],
    lastBookedAt: {},
    totalMeetingsAllTime: 0,
    adoption: {
      teams: ["c1"],
      bookingLinks: ["c1", "c2"],
      webhooks: [],
      apiKeys: ["c1"],
      sequences: [],
      salesforce: [],
    },
    outbox: { pending: 1, failed: 0, delivered: 9 },
    apiKeys: { active: 2, usedInWindow: 1 },
    now: NOW,
    rangeDays: 7,
    ...overrides,
  };
}

describe("computePlatformAnalytics", () => {
  it("rolls up bookings, activity and growth across Schedulers", () => {
    const result = computePlatformAnalytics(
      input({
        meetings: [
          meeting({}),
          meeting({ calendarId: "c1", bookedBy: "scheduler", cancelledAt: iso(-1) }),
          meeting({ calendarId: "c2", createdAt: iso(-1), startsAt: iso(2) }),
          meeting({ calendarId: "c3", createdAt: iso(-10), startsAt: iso(-9) }),
        ],
        lastBookedAt: { c1: iso(-2), c2: iso(-1), c3: iso(-10) },
        totalMeetingsAllTime: 40,
      }),
    );

    expect(result.kpis.booked).toMatchObject({ value: 3, previous: 1 });
    expect(result.kpis.held).toMatchObject({ value: 1, previous: 1 });
    expect(result.kpis.hours.value).toBe(1);
    expect(result.kpis.cancellationRate.value).toBeCloseTo(1 / 3);
    expect(result.kpis.guestShare).toBeCloseTo(2 / 3);
    expect(result.kpis.schedulers).toMatchObject({ total: 3, active: 1 });
    expect(result.kpis.schedulers.new.value).toBe(1);
    expect(result.kpis.calendars).toMatchObject({ total: 3, active: 2 });
    expect(result.kpis.members).toBe(6);
    expect(result.kpis.avgMembersPerCalendar).toBe(2);
    expect(result.dormantCalendars).toBe(1);

    expect(result.topCalendars.map((c) => [c.name, c.booked, c.cancelled])).toEqual([
      ["Eng panel", 2, 1],
      ["Design", 1, 0],
    ]);

    const [ana, ben, cy] = [
      result.schedulers.find((s) => s.id === "s1")!,
      result.schedulers.find((s) => s.id === "s2")!,
      result.schedulers.find((s) => s.id === "s3")!,
    ];
    expect(result.schedulers[0].id).toBe("s1");
    expect(ana).toMatchObject({ calendars: 2, members: 6, booked: 3, status: "active" });
    expect(ana.lastActiveAt).toBe(iso(-1));
    expect(ben).toMatchObject({ calendars: 0, booked: 0, status: "new" });
    expect(cy).toMatchObject({ booked: 0, status: "idle", lastActiveAt: iso(-10) });
  });

  it("buckets daily bookings and sign-ups by UTC day", () => {
    const result = computePlatformAnalytics(
      input({ meetings: [meeting({ createdAt: "2026-11-03T01:00:00Z" })] }),
    );
    expect(result.daily).toHaveLength(7);
    expect(result.daily.at(-1)).toMatchObject({ key: "2026-11-03", guest: 1 });
    expect(result.daily.find((d) => d.key === "2026-10-31")?.signups).toBe(1);
  });

  it("reports feature adoption as a share of Calendars", () => {
    const result = computePlatformAnalytics(input());
    const byFeature = Object.fromEntries(result.adoption.map((a) => [a.feature, a]));
    expect(byFeature.bookingLinks).toMatchObject({ calendars: 2 });
    expect(byFeature.bookingLinks.share).toBeCloseTo(2 / 3);
    expect(byFeature.webhooks.share).toBe(0);
    expect(result.health).toEqual({
      pending: 1,
      failed: 0,
      delivered: 9,
      active: 2,
      usedInWindow: 1,
    });
  });
});
