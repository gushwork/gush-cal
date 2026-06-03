import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE } from "./[id]/route";

const mockCancelMeeting = vi.fn();
const mockRequireSchedulerId = vi.fn();

vi.mock("@/lib/booking/cancel-meeting", () => ({
  cancelMeeting: (...args: unknown[]) => mockCancelMeeting(...args),
}));

vi.mock("@/components/calendar-admin/require-scheduler", () => ({
  requireSchedulerId: () => mockRequireSchedulerId(),
  jsonError: (message: string, status: number) =>
    new Response(JSON.stringify({ error: message }), { status }),
}));

vi.mock("@/lib/deps", () => ({
  createAppDeps: () => ({ google: {}, slots: {}, db: {} }),
}));

describe("DELETE /api/meetings/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSchedulerId.mockResolvedValue({ schedulerId: "sched-1" });
  });

  it("returns 204 on successful cancel", async () => {
    mockCancelMeeting.mockResolvedValue({ ok: true });

    const res = await DELETE(new Request("http://localhost/api/meetings/meet-1"), {
      params: Promise.resolve({ id: "meet-1" }),
    });

    expect(res.status).toBe(204);
    expect(mockCancelMeeting).toHaveBeenCalledWith(
      expect.anything(),
      "meet-1",
      "sched-1",
    );
  });

  it("returns 404 when meeting not found", async () => {
    mockCancelMeeting.mockResolvedValue({ ok: false, code: "NOT_FOUND" });

    const res = await DELETE(new Request("http://localhost/api/meetings/missing"), {
      params: Promise.resolve({ id: "missing" }),
    });

    expect(res.status).toBe(404);
  });

  it("returns 502 when Google cancel fails", async () => {
    mockCancelMeeting.mockResolvedValue({
      ok: false,
      code: "GOOGLE_ERROR",
      message: "Insufficient Permission",
    });

    const res = await DELETE(new Request("http://localhost/api/meetings/meet-1"), {
      params: Promise.resolve({ id: "meet-1" }),
    });

    expect(res.status).toBe(502);
    const data = (await res.json()) as { error?: string };
    expect(data.error).toBe("Insufficient Permission");
  });

  it("returns 401 when unauthenticated", async () => {
    const { NextResponse } = await import("next/server");
    mockRequireSchedulerId.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );

    const res = await DELETE(new Request("http://localhost/api/meetings/meet-1"), {
      params: Promise.resolve({ id: "meet-1" }),
    });

    expect(res.status).toBe(401);
  });
});
