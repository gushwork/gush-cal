import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const mockList = vi.fn();
const mockRequireApiKeyAuth = vi.fn();
const mockLoadBundle = vi.fn();

vi.mock("@/lib/booking/list-meetings", () => ({
  listMeetingsForCalendar: (...a: unknown[]) => mockList(...a),
}));
vi.mock("@/lib/events/api-key-auth", () => ({
  requireApiKeyAuth: (...a: unknown[]) => mockRequireApiKeyAuth(...a),
}));
vi.mock("@/lib/db/assemble-calendar-bundle", () => ({
  loadCalendarBundleByCalendarId: (...a: unknown[]) => mockLoadBundle(...a),
}));
vi.mock("@/lib/db/client", () => ({ getDb: () => ({}) }));
vi.mock("@/lib/deps", () => ({ createAppDeps: () => ({}) }));

const bundle = { id: "cal-A", scheduler: { id: "sched-1" }, durations: [30] };
const req = (qs = "") =>
  new Request(`http://localhost/api/v1/calendars/cal-A/meetings${qs}`);
const params = { params: Promise.resolve({ calendarId: "cal-A" }) };

describe("GET /api/v1/calendars/:calendarId/meetings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireApiKeyAuth.mockResolvedValue({ ok: true, calendarId: "cal-A" });
    mockLoadBundle.mockResolvedValue(bundle);
  });

  it("lists meetings scoped to the calendar (BUG-018)", async () => {
    mockList.mockResolvedValue([{ id: "meet-1", calendarId: "cal-A" }]);
    const res = await GET(req(), params);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { meetings: { id: string }[] };
    expect(data.meetings).toHaveLength(1);
    expect(mockList).toHaveBeenCalledWith("cal-A", "sched-1", undefined, undefined);
  });

  it("passes from/to range to the list helper", async () => {
    mockList.mockResolvedValue([]);
    await GET(req("?from=2027-01-01T00:00:00.000Z&to=2027-02-01T00:00:00.000Z"), params);
    expect(mockList).toHaveBeenCalledWith(
      "cal-A",
      "sched-1",
      "2027-01-01T00:00:00.000Z",
      "2027-02-01T00:00:00.000Z",
    );
  });

  it("returns 400 for invalid from date", async () => {
    const res = await GET(req("?from=nope"), params);
    expect(res.status).toBe(400);
    expect(mockList).not.toHaveBeenCalled();
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireApiKeyAuth.mockResolvedValue({ ok: false, code: "UNAUTHORIZED" });
    const res = await GET(req(), params);
    expect(res.status).toBe(401);
  });
});
