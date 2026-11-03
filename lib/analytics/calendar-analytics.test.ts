import { describe, expect, it } from "vitest";
import { computeCalendarAnalytics, type AnalyticsMeeting } from "./calendar-analytics";

const NOW = new Date("2026-11-03T12:00:00Z");
const DAY = 86_400_000;

function iso(offsetDays: number, hourUtc = 12): string {
  const base = new Date(NOW.getTime() + offsetDays * DAY);
  base.setUTCHours(hourUtc, 0, 0, 0);
  return base.toISOString();
}

let seq = 0;
function meeting(overrides: Partial<AnalyticsMeeting>): AnalyticsMeeting {
  seq += 1;
  return {
    id: `m${seq}`,
    assignedMemberId: "a",
    startsAt: iso(1),
    durationMinutes: 30,
    bookedBy: "guest",
    guestEmail: `guest${seq}@example.com`,
    invitees: [],
    teamId: null,
    bookingLinkId: null,
    cancelledAt: null,
    createdAt: iso(-1),
    ...overrides,
  };
}

const members = [
  { id: "a", email: "ana@example.com", displayName: "Ana" },
  { id: "b", email: "ben@example.com", displayName: null },
  { id: "c", email: "cy@example.com", displayName: "Cy" },
];

function run(meetings: AnalyticsMeeting[], eventCounts: Record<string, number> = {}) {
  return computeCalendarAnalytics({
    meetings,
    members,
    teams: [{ id: "t1", name: "Engineering" }],
    links: [{ id: "l1", slug: "eng", kind: "team" }],
    eventCounts,
    timeZone: "UTC",
    now: NOW,
    rangeDays: 7,
  });
}

describe("computeCalendarAnalytics", () => {
  it("compares booked meetings against the previous window", () => {
    const result = run([
      meeting({ createdAt: iso(-1) }),
      meeting({ createdAt: iso(-2), bookedBy: "scheduler", guestEmail: null }),
      meeting({ createdAt: iso(-3), cancelledAt: iso(-2) }),
      meeting({ createdAt: iso(-10), startsAt: iso(-9) }),
      meeting({ createdAt: iso(-30), startsAt: iso(-29) }), // outside both windows
    ]);
    expect(result.kpis.booked).toEqual({ value: 3, previous: 1, deltaPct: 200 });
    expect(result.kpis.cancellationRate.value).toBeCloseTo(1 / 3);
    expect(result.kpis.selfServeShare).toBeCloseTo(2 / 3);
    expect(result.sources).toMatchObject({ guest: 2, scheduler: 1 });
  });

  it("counts held meetings and hours only for active, past starts in the window", () => {
    const result = run([
      meeting({ startsAt: iso(-1), durationMinutes: 60 }),
      meeting({ startsAt: iso(-2), durationMinutes: 30 }),
      meeting({ startsAt: iso(-2), cancelledAt: iso(-3) }),
      meeting({ startsAt: iso(2) }), // upcoming
      meeting({ startsAt: iso(-9), createdAt: iso(-12), durationMinutes: 45 }),
    ]);
    expect(result.kpis.held.value).toBe(2);
    expect(result.kpis.held.previous).toBe(1);
    expect(result.kpis.hours.value).toBe(1.5);
    expect(result.kpis.hours.previous).toBe(0.75);
    expect(result.kpis.upcomingTotal).toBe(1);
    expect(result.kpis.upcomingNext7).toBe(1);
  });

  it("buckets daily bookings and cancellations by local day", () => {
    const result = run([
      meeting({ createdAt: iso(0, 9) }),
      meeting({ createdAt: iso(0, 10), bookedBy: "scheduler" }),
      meeting({ createdAt: iso(-6, 9), cancelledAt: iso(-1, 9) }),
    ]);
    expect(result.daily).toHaveLength(7);
    const today = result.daily.at(-1)!;
    expect(today).toMatchObject({ key: "2026-11-03", label: "Nov 3", guest: 1, scheduler: 1 });
    expect(result.daily[0]).toMatchObject({ key: "2026-10-28", guest: 1 });
    expect(result.daily[5].cancelled).toBe(1);
  });

  it("builds the weekday × hour heatmap and finds the peak", () => {
    // 2026-11-04 is a Wednesday.
    const result = run([
      meeting({ startsAt: "2026-11-04T10:00:00Z" }),
      meeting({ startsAt: "2026-11-04T10:30:00Z" }),
      meeting({ startsAt: "2026-11-05T21:00:00Z" }),
      meeting({ startsAt: "2026-11-04T10:00:00Z", cancelledAt: iso(-1) }),
    ]);
    expect(result.heatmap.cells[2][10]).toBe(2);
    expect(result.heatmap.busiest).toEqual({ weekday: 2, hour: 10, count: 2 });
    expect(result.heatmap.total).toBe(3);
    expect(result.heatmap.hourStart).toBe(8);
    expect(result.heatmap.hourEnd).toBe(21);
  });

  it("ranks member load, flags idle Members, and resolves sources", () => {
    const result = run(
      [
        meeting({ assignedMemberId: "b", teamId: "t1", bookingLinkId: "l1" }),
        meeting({ assignedMemberId: "b", teamId: "t1", bookingLinkId: "l1" }),
        meeting({ assignedMemberId: "a", bookedBy: "scheduler" }),
      ],
      { "meeting.rescheduled": 2, "booking.duplicate_blocked": 1 },
    );
    expect(result.members.map((m) => [m.name, m.meetings])).toEqual([
      ["ben@example.com", 2],
      ["Ana", 1],
      ["Cy", 0],
    ]);
    expect(result.idleMembers).toBe(1);
    expect(result.sources.byLink[0]).toMatchObject({ label: "/eng", count: 2 });
    expect(result.sources.byLink[1]).toMatchObject({ label: "Scheduler booking", count: 1 });
    expect(result.sources.byTeam[0]).toMatchObject({ label: "Engineering", count: 2 });
    expect(result.kpis.reschedules).toBe(2);
    expect(result.kpis.duplicatesBlocked).toBe(1);
  });

  it("measures median lead time and unique guests", () => {
    const result = run([
      meeting({ createdAt: iso(-1), startsAt: iso(1), guestEmail: "X@example.com" }),
      meeting({ createdAt: iso(-1), startsAt: iso(3), guestEmail: "x@example.com" }),
      meeting({
        createdAt: iso(-1),
        startsAt: iso(-1, 18),
        guestEmail: null,
        invitees: ["a@x.com", "b@x.com"],
      }),
    ]);
    expect(result.kpis.medianLeadHours).toBe(48);
    expect(result.kpis.uniqueGuests).toBe(3);
  });

  it("handles a Calendar with no Meetings", () => {
    const result = run([]);
    expect(result.isEmpty).toBe(true);
    expect(result.kpis.cancellationRate.value).toBeNull();
    expect(result.kpis.selfServeShare).toBeNull();
    expect(result.heatmap.busiest).toBeNull();
    expect(result.idleMembers).toBe(3);
  });
});
