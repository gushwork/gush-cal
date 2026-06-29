import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mockReschedule = vi.fn();
const mockRequireApiKeyAuth = vi.fn();
const mockLoadBundle = vi.fn();
const mockGetDb = vi.fn();

vi.mock("@/lib/booking/reschedule-meeting", () => ({
  rescheduleMeeting: (...a: unknown[]) => mockReschedule(...a),
}));
vi.mock("@/lib/events/api-key-auth", () => ({
  requireApiKeyAuth: (...a: unknown[]) => mockRequireApiKeyAuth(...a),
}));
vi.mock("@/lib/db/assemble-calendar-bundle", () => ({
  loadCalendarBundleByCalendarId: (...a: unknown[]) => mockLoadBundle(...a),
}));
vi.mock("@/lib/db/client", () => ({ getDb: () => mockGetDb() }));
vi.mock("@/lib/deps", () => ({ createAppDeps: () => ({}) }));

function mockTarget(rows: unknown[]) {
  const limit = vi.fn(() => Promise.resolve(rows));
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  mockGetDb.mockReturnValue({ select: vi.fn(() => ({ from })) });
}

const bundle = { id: "cal-A", scheduler: { id: "sched-1" }, durations: [30] };
const body = { startsAt: "2027-06-10T14:00:00.000Z", durationMinutes: 30, viewerTimezone: "UTC" };
const req = (b: unknown = body) =>
  new Request("http://localhost/api/v1/calendars/cal-A/meetings/meet-1/reschedule", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(b),
  });
const params = {
  params: Promise.resolve({ calendarId: "cal-A", meetingId: "meet-1" }),
};

describe("POST /api/v1/calendars/:calendarId/meetings/:meetingId/reschedule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireApiKeyAuth.mockResolvedValue({ ok: true, calendarId: "cal-A" });
    mockLoadBundle.mockResolvedValue(bundle);
  });

  it("returns 404 when meeting belongs to another calendar (BUG-004/016)", async () => {
    mockTarget([{ calendarId: "cal-OTHER" }]);
    const res = await POST(req(), params);
    expect(res.status).toBe(404);
    expect(mockReschedule).not.toHaveBeenCalled();
  });

  it("returns 400 when duration not allowed (BUG-017)", async () => {
    mockTarget([{ calendarId: "cal-A" }]);
    const res = await POST(req({ ...body, durationMinutes: 15 }), params);
    expect(res.status).toBe(400);
    expect(mockReschedule).not.toHaveBeenCalled();
  });

  it("maps CANCELLED/PAST to 410 with readable error (BUG-066/062)", async () => {
    mockTarget([{ calendarId: "cal-A" }]);
    mockReschedule.mockResolvedValue({ ok: false, code: "PAST" });
    const res = await POST(req(), params);
    expect(res.status).toBe(410);
    const data = (await res.json()) as { error: string; message?: unknown };
    expect(data.error).toBe("PAST");
    expect(data.message).toBeUndefined();
  });

  it("reschedules a meeting scoped to the calendar", async () => {
    mockTarget([{ calendarId: "cal-A" }]);
    mockReschedule.mockResolvedValue({
      ok: true,
      meeting: { id: "meet-1" },
      manageUrl: "https://manage",
    });
    const res = await POST(req(), params);
    expect(res.status).toBe(200);
  });
});
