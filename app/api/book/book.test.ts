import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getPublicCalendar } from "./[slug]/route";
import { POST as confirmPublicBooking } from "./[slug]/confirm/route";

const mockBundle = {
  id: "cal-1",
  schedulerId: "sched-1",
  name: "Engineering Panel",
  slug: "eng-panel",
  bookingWindowDays: 14,
  minNoticeHours: 4,
  defaultMaxPerDay: 3,
  defaultMaxPerWeek: 15,
  defaultWorkingHours: [],
  timezone: "UTC",
  durations: [30],
  createdAt: "2026-01-01T00:00:00.000Z",
  scheduler: {
    id: "sched-1",
    email: "scheduler@acme.com",
    name: "Scheduler",
  },
  members: [
    {
      id: "m-1",
      calendarId: "cal-1",
      email: "member@acme.com",
      displayName: null,
      maxPerDayOverride: null,
      maxPerWeekOverride: null,
      workingHoursOverride: null,
      timezone: null,
      sortOrder: 1,
    },
  ],
};

const mockConfirmBooking = vi.fn();

vi.mock("@/lib/booking/load-calendar-by-slug", () => ({
  loadCalendarBundleBySlug: vi.fn(),
}));

vi.mock("@/lib/booking/confirm-booking", () => ({
  confirmBooking: (...args: unknown[]) => mockConfirmBooking(...args),
}));

vi.mock("@/lib/deps", () => ({
  createAppDeps: () => ({ google: {}, slots: {}, db: {} }),
}));

import { loadCalendarBundleBySlug } from "@/lib/booking/load-calendar-by-slug";

describe("public book API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadCalendarBundleBySlug).mockResolvedValue(mockBundle);
  });

  it("GET /api/book/:slug returns public calendar", async () => {
    const res = await getPublicCalendar(new Request("http://localhost/api/book/eng-panel"), {
      params: Promise.resolve({ slug: "eng-panel" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.calendar).toEqual({
      name: "Engineering Panel",
      slug: "eng-panel",
      durations: [30],
      bookingWindowDays: 14,
      minNoticeHours: 4,
    });
  });

  it("POST /api/book/:slug/confirm returns 409 on slot conflict", async () => {
    mockConfirmBooking.mockResolvedValue({ ok: false, code: "SLOT_UNAVAILABLE" });

    const res = await confirmPublicBooking(
      new Request("http://localhost/api/book/eng-panel/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startsAt: "2026-06-10T14:00:00.000Z",
          durationMinutes: 30,
          subject: "Interview",
          body: "",
          invitees: ["candidate@example.com"],
          viewerTimezone: "UTC",
        }),
      }),
      { params: Promise.resolve({ slug: "eng-panel" }) },
    );

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("SLOT_UNAVAILABLE");
  });

  it("POST /api/book/:slug/confirm returns public meeting on success", async () => {
    mockConfirmBooking.mockResolvedValue({
      ok: true,
      meeting: {
        id: "meet-1",
        calendarId: "cal-1",
        assignedMemberId: "m-1",
        startsAt: "2026-06-10T14:00:00.000Z",
        durationMinutes: 30,
        subject: "Interview",
        body: "",
        invitees: ["candidate@example.com"],
        googleEventId: "evt-1",
        meetLink: "https://meet.google.com/abc",
        bookedBy: "guest",
        guestEmail: "candidate@example.com",
        createdAt: "2026-06-03T12:00:00.000Z",
      },
    });

    const res = await confirmPublicBooking(
      new Request("http://localhost/api/book/eng-panel/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startsAt: "2026-06-10T14:00:00.000Z",
          durationMinutes: 30,
          subject: "Interview",
          body: "",
          invitees: ["candidate@example.com"],
          viewerTimezone: "UTC",
        }),
      }),
      { params: Promise.resolve({ slug: "eng-panel" }) },
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.meeting).toEqual({
      startsAt: "2026-06-10T14:00:00.000Z",
      durationMinutes: 30,
      subject: "Interview",
      meetLink: "https://meet.google.com/abc",
    });
  });
});
