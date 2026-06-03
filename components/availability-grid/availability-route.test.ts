import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const requireSchedulerId = vi.fn();
const loadCalendarBundle = vi.fn();
const queryFreeBusy = vi.fn();

vi.mock("@/components/calendar-admin/require-scheduler", () => ({
  requireSchedulerId,
  jsonError: (message: string, status: number) =>
    NextResponse.json({ error: message }, { status }),
}));

vi.mock("@/components/calendar-admin/load-calendar-bundle", () => ({
  loadCalendarBundle,
}));

vi.mock("@/lib/deps", () => ({
  createAppDeps: () => ({
    google: { queryFreeBusy },
    slots: {},
    db: {},
  }),
}));

describe("GET /api/calendars/:id/availability", () => {
  beforeEach(() => {
    requireSchedulerId.mockReset();
    loadCalendarBundle.mockReset();
    queryFreeBusy.mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    requireSchedulerId.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );

    const { GET } = await import(
      "@/app/api/calendars/[id]/availability/route"
    );
    const response = await GET(
      new Request(
        "http://localhost/api/calendars/cal-1/availability?from=2026-06-03T00:00:00.000Z&to=2026-06-03T23:59:59.000Z",
      ),
      { params: Promise.resolve({ id: "cal-1" }) },
    );

    expect(response.status).toBe(401);
  });

  it("returns 400 when from/to missing", async () => {
    requireSchedulerId.mockResolvedValue({ schedulerId: "sched-1" });

    const { GET } = await import(
      "@/app/api/calendars/[id]/availability/route"
    );
    const response = await GET(
      new Request("http://localhost/api/calendars/cal-1/availability"),
      { params: Promise.resolve({ id: "cal-1" }) },
    );

    expect(response.status).toBe(400);
  });

  it("returns member busy blocks with inaccessible status on google errors", async () => {
    requireSchedulerId.mockResolvedValue({ schedulerId: "sched-1" });
    loadCalendarBundle.mockResolvedValue({
      id: "cal-1",
      schedulerId: "sched-1",
      members: [
        {
          id: "m-1",
          calendarId: "cal-1",
          email: "alice@acme.com",
          displayName: "Alice",
          maxPerDayOverride: null,
          maxPerWeekOverride: null,
          workingHoursOverride: null,
          sortOrder: 1,
        },
        {
          id: "m-2",
          calendarId: "cal-1",
          email: "bob@acme.com",
          displayName: null,
          maxPerDayOverride: null,
          maxPerWeekOverride: null,
          workingHoursOverride: null,
          sortOrder: 2,
        },
      ],
    });
    queryFreeBusy.mockResolvedValue({
      byEmail: {
        "alice@acme.com": {
          status: "ok",
          busy: [
            {
              start: "2026-06-03T10:00:00.000Z",
              end: "2026-06-03T11:00:00.000Z",
            },
          ],
        },
        "bob@acme.com": {
          status: "error",
          code: "notFound",
        },
      },
    });

    const { GET } = await import(
      "@/app/api/calendars/[id]/availability/route"
    );
    const response = await GET(
      new Request(
        "http://localhost/api/calendars/cal-1/availability?from=2026-06-03T00:00:00.000Z&to=2026-06-03T23:59:59.000Z",
      ),
      { params: Promise.resolve({ id: "cal-1" }) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      members: [
        {
          memberId: "m-1",
          email: "alice@acme.com",
          status: "accessible",
          busy: [
            {
              start: "2026-06-03T10:00:00.000Z",
              end: "2026-06-03T11:00:00.000Z",
            },
          ],
        },
        {
          memberId: "m-2",
          email: "bob@acme.com",
          status: "inaccessible",
          errorCode: "notFound",
          busy: [],
        },
      ],
    });

    expect(queryFreeBusy).toHaveBeenCalledWith({
      memberEmails: ["alice@acme.com", "bob@acme.com"],
      timeMin: "2026-06-03T00:00:00.000Z",
      timeMax: "2026-06-03T23:59:59.000Z",
    });
  });
});
