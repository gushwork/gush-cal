import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mockValidateManageToken = vi.fn();
const mockRescheduleMeeting = vi.fn();

vi.mock("@/lib/booking/reschedule-meeting", () => ({
  validateManageToken: (...args: unknown[]) => mockValidateManageToken(...args),
  rescheduleMeeting: (...args: unknown[]) => mockRescheduleMeeting(...args),
}));

vi.mock("@/lib/booking/to-public-meeting", () => ({
  toPublicMeeting: (meeting: unknown) => meeting,
}));

vi.mock("@/lib/booking/confirm-booking", () => ({
  MIN_NOTICE_VIOLATION: "MIN_NOTICE_VIOLATION",
}));

vi.mock("@/lib/deps", () => ({
  createAppDeps: () => ({}),
}));

const VALID_CTX = {
  ok: true,
  ctx: { meeting: { id: "meet-1" }, bundle: { durations: [30, 60] } },
};

const VALID_START = "2027-06-12T15:00:00.000Z";
const params = { params: Promise.resolve({ token: "tok" }) };

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/manage/tok/reschedule", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/manage/:token/reschedule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateManageToken.mockResolvedValue(VALID_CTX);
  });

  it("BUG-022: 400 on invalid startsAt", async () => {
    const res = await POST(
      makeRequest({
        startsAt: "not-a-date",
        durationMinutes: 30,
        viewerTimezone: "UTC",
      }),
      params,
    );
    expect(res.status).toBe(400);
    expect(mockRescheduleMeeting).not.toHaveBeenCalled();
  });

  it("BUG-022: 400 on invalid IANA viewerTimezone", async () => {
    const res = await POST(
      makeRequest({
        startsAt: VALID_START,
        durationMinutes: 30,
        viewerTimezone: "Mars/Phobos",
      }),
      params,
    );
    expect(res.status).toBe(400);
    expect(mockRescheduleMeeting).not.toHaveBeenCalled();
  });

  it("BUG-022: 400 on empty viewerTimezone", async () => {
    const res = await POST(
      makeRequest({
        startsAt: VALID_START,
        durationMinutes: 30,
        viewerTimezone: "",
      }),
      params,
    );
    expect(res.status).toBe(400);
    expect(mockRescheduleMeeting).not.toHaveBeenCalled();
  });

  it("BUG-023: human-readable error for SLOT_UNAVAILABLE", async () => {
    mockRescheduleMeeting.mockResolvedValue({
      ok: false,
      code: "SLOT_UNAVAILABLE",
    });
    const res = await POST(
      makeRequest({
        startsAt: VALID_START,
        durationMinutes: 30,
        viewerTimezone: "UTC",
      }),
      params,
    );
    expect(res.status).toBe(409);
    const data = (await res.json()) as { error: string };
    expect(data.error).toBe("This time is no longer available");
  });

  it("BUG-023: human-readable error for CANCELLED", async () => {
    mockRescheduleMeeting.mockResolvedValue({ ok: false, code: "CANCELLED" });
    const res = await POST(
      makeRequest({
        startsAt: VALID_START,
        durationMinutes: 30,
        viewerTimezone: "UTC",
      }),
      params,
    );
    expect(res.status).toBe(410);
    const data = (await res.json()) as { error: string };
    expect(data.error).toBe("Meeting was cancelled");
  });

  it("BUG-023: human-readable error for PAST", async () => {
    mockRescheduleMeeting.mockResolvedValue({ ok: false, code: "PAST" });
    const res = await POST(
      makeRequest({
        startsAt: VALID_START,
        durationMinutes: 30,
        viewerTimezone: "UTC",
      }),
      params,
    );
    expect(res.status).toBe(410);
    const data = (await res.json()) as { error: string };
    expect(data.error).toBe("Meeting has passed");
  });

  it("succeeds and forwards validated input", async () => {
    mockRescheduleMeeting.mockResolvedValue({
      ok: true,
      meeting: { id: "meet-1" },
      manageUrl: "/manage/new",
    });
    const res = await POST(
      makeRequest({
        startsAt: VALID_START,
        durationMinutes: 30,
        viewerTimezone: "UTC",
      }),
      params,
    );
    expect(res.status).toBe(200);
    expect(mockRescheduleMeeting).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        meetingId: "meet-1",
        startsAt: VALID_START,
        viewerTimezone: "UTC",
      }),
    );
  });
});
