import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mockReassign = vi.fn();
const mockRequireApiKeyAuth = vi.fn();
const mockLoadBundle = vi.fn();
const mockGetDb = vi.fn();

vi.mock("@/lib/booking/reassign-meeting", () => ({
  reassignMeeting: (...a: unknown[]) => mockReassign(...a),
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
const req = (b: unknown = { memberId: "m-2" }) =>
  new Request("http://localhost/api/v1/calendars/cal-A/meetings/meet-1/reassign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(b),
  });
const params = {
  params: Promise.resolve({ calendarId: "cal-A", meetingId: "meet-1" }),
};

describe("POST /api/v1/calendars/:calendarId/meetings/:meetingId/reassign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireApiKeyAuth.mockResolvedValue({ ok: true, calendarId: "cal-A" });
    mockLoadBundle.mockResolvedValue(bundle);
  });

  it("returns 404 when meeting belongs to another calendar (BUG-004/016)", async () => {
    mockTarget([{ calendarId: "cal-OTHER" }]);
    const res = await POST(req(), params);
    expect(res.status).toBe(404);
    expect(mockReassign).not.toHaveBeenCalled();
  });

  it("returns 400 when memberId missing", async () => {
    mockTarget([{ calendarId: "cal-A" }]);
    const res = await POST(req({}), params);
    expect(res.status).toBe(400);
    expect(mockReassign).not.toHaveBeenCalled();
  });

  it("maps CANCELLED/PAST to 410 with readable error (BUG-066/062)", async () => {
    mockTarget([{ calendarId: "cal-A" }]);
    mockReassign.mockResolvedValue({ ok: false, code: "CANCELLED" });
    const res = await POST(req(), params);
    expect(res.status).toBe(410);
    const data = (await res.json()) as { error: string; message?: unknown };
    expect(data.error).toBe("CANCELLED");
    expect(data.message).toBeUndefined();
  });

  it("reassigns a meeting scoped to the calendar", async () => {
    mockTarget([{ calendarId: "cal-A" }]);
    mockReassign.mockResolvedValue({ ok: true, meeting: { id: "meet-1" } });
    const res = await POST(req(), params);
    expect(res.status).toBe(200);
    expect(mockReassign).toHaveBeenCalledWith({}, {
      meetingId: "meet-1",
      schedulerId: "sched-1",
      newMemberId: "m-2",
    });
  });
});
