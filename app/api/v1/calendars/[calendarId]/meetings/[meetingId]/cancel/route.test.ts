import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mockCancel = vi.fn();
const mockRequireApiKeyAuth = vi.fn();
const mockLoadBundle = vi.fn();
const mockGetDb = vi.fn();

vi.mock("@/lib/booking/cancel-meeting", () => ({
  cancelMeeting: (...a: unknown[]) => mockCancel(...a),
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
const req = () =>
  new Request("http://localhost/api/v1/calendars/cal-A/meetings/meet-1/cancel", {
    method: "POST",
  });
const params = {
  params: Promise.resolve({ calendarId: "cal-A", meetingId: "meet-1" }),
};

describe("POST /api/v1/calendars/:calendarId/meetings/:meetingId/cancel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireApiKeyAuth.mockResolvedValue({ ok: true, calendarId: "cal-A" });
    mockLoadBundle.mockResolvedValue(bundle);
  });

  it("returns 404 when meeting belongs to another calendar (BUG-004/016)", async () => {
    mockTarget([{ calendarId: "cal-OTHER" }]);
    const res = await POST(req(), params);
    expect(res.status).toBe(404);
    expect(mockCancel).not.toHaveBeenCalled();
  });

  it("returns 404 when meeting does not exist", async () => {
    mockTarget([]);
    const res = await POST(req(), params);
    expect(res.status).toBe(404);
    expect(mockCancel).not.toHaveBeenCalled();
  });

  it("cancels a meeting scoped to the calendar", async () => {
    mockTarget([{ calendarId: "cal-A" }]);
    mockCancel.mockResolvedValue({ ok: true });
    const res = await POST(req(), params);
    expect(res.status).toBe(200);
    expect(mockCancel).toHaveBeenCalledWith({}, "meet-1", "sched-1");
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireApiKeyAuth.mockResolvedValue({ ok: false, code: "UNAUTHORIZED" });
    const res = await POST(req(), params);
    expect(res.status).toBe(401);
  });
});
