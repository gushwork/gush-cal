import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./[id]/reassign/route";

const mockReassignMeeting = vi.fn();
const mockRequireSchedulerId = vi.fn();

vi.mock("@/lib/booking/reassign-meeting", () => ({
  reassignMeeting: (...args: unknown[]) => mockReassignMeeting(...args),
}));

vi.mock("@/components/calendar-admin/require-scheduler", () => ({
  requireSchedulerId: () => mockRequireSchedulerId(),
  jsonError: (message: string, status: number) =>
    new Response(JSON.stringify({ error: message }), { status }),
}));

vi.mock("@/lib/deps", () => ({
  createAppDeps: () => ({
    google: {},
    slots: {},
    db: {},
    routing: { resolveBookingTarget: vi.fn() },
    salesforce: { lookupLeadOwner: vi.fn(), syncFieldMap: vi.fn() },
    duplicateGuard: { check: vi.fn() },
    events: { emit: vi.fn(), scheduleRelativeTriggers: vi.fn() },
    manageToken: {
      createForMeeting: vi.fn(),
      validate: vi.fn(),
      revokeForMeeting: vi.fn(),
    },
    email: { enqueueSequenceForMeeting: vi.fn(), renderManageUrl: vi.fn() },
  }),
}));

const updatedMeeting = {
  id: "meet-1",
  calendarId: "cal-1",
  assignedMemberId: "m-2",
  startsAt: "2027-06-10T14:00:00.000Z",
  durationMinutes: 30,
  subject: "Panel interview",
  body: "Please join on time.",
  invitees: ["candidate@example.com"],
  googleEventId: "evt-reassigned",
  meetLink: "https://meet.google.com/reassigned",
  bookedBy: "guest",
  guestEmail: "candidate@example.com",
  teamId: "team-1",
  bookingLinkId: null,
  cancelledAt: null,
  createdAt: "2026-06-03T12:00:00.000Z",
};

describe("POST /api/meetings/:id/reassign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSchedulerId.mockResolvedValue({ schedulerId: "sched-1" });
  });

  it("returns meeting on successful reassign", async () => {
    mockReassignMeeting.mockResolvedValue({
      ok: true,
      meeting: updatedMeeting,
    });

    const res = await POST(
      new Request("http://localhost/api/meetings/meet-1/reassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: "m-2" }),
      }),
      { params: Promise.resolve({ id: "meet-1" }) },
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as { meeting: typeof updatedMeeting };
    expect(data.meeting.assignedMemberId).toBe("m-2");
    expect(mockReassignMeeting).toHaveBeenCalledWith(
      expect.anything(),
      {
        meetingId: "meet-1",
        schedulerId: "sched-1",
        newMemberId: "m-2",
      },
    );
  });

  it("returns 400 when memberId is missing", async () => {
    const res = await POST(
      new Request("http://localhost/api/meetings/meet-1/reassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "meet-1" }) },
    );

    expect(res.status).toBe(400);
    expect(mockReassignMeeting).not.toHaveBeenCalled();
  });

  it("returns 404 when meeting not found", async () => {
    mockReassignMeeting.mockResolvedValue({ ok: false, code: "NOT_FOUND" });

    const res = await POST(
      new Request("http://localhost/api/meetings/missing/reassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: "m-2" }),
      }),
      { params: Promise.resolve({ id: "missing" }) },
    );

    expect(res.status).toBe(404);
  });

  it("returns 409 when member is ineligible", async () => {
    mockReassignMeeting.mockResolvedValue({
      ok: false,
      code: "MEMBER_INELIGIBLE",
    });

    const res = await POST(
      new Request("http://localhost/api/meetings/meet-1/reassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: "m-2" }),
      }),
      { params: Promise.resolve({ id: "meet-1" }) },
    );

    expect(res.status).toBe(409);
  });

  it("returns 502 when Google update fails", async () => {
    mockReassignMeeting.mockResolvedValue({
      ok: false,
      code: "GOOGLE_ERROR",
      message: "Insufficient Permission",
    });

    const res = await POST(
      new Request("http://localhost/api/meetings/meet-1/reassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: "m-2" }),
      }),
      { params: Promise.resolve({ id: "meet-1" }) },
    );

    expect(res.status).toBe(502);
    const data = (await res.json()) as { error?: string };
    expect(data.error).toBe("Insufficient Permission");
  });

  it("returns 401 when unauthenticated", async () => {
    const { NextResponse } = await import("next/server");
    mockRequireSchedulerId.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );

    const res = await POST(
      new Request("http://localhost/api/meetings/meet-1/reassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: "m-2" }),
      }),
      { params: Promise.resolve({ id: "meet-1" }) },
    );

    expect(res.status).toBe(401);
  });
});
