import { beforeEach, describe, expect, it, vi } from "vitest";

const cancelMeetingByToken = vi.fn();
vi.mock("@/lib/booking/cancel-meeting-by-token", () => ({
  cancelMeetingByToken: (...args: unknown[]) => cancelMeetingByToken(...args),
}));
vi.mock("@/lib/deps", () => ({ createAppDeps: () => ({}) }));

import { POST } from "./route";

const params = Promise.resolve({ token: "tok" });

describe("POST /api/manage/[token]/cancel", () => {
  beforeEach(() => {
    cancelMeetingByToken.mockReset().mockResolvedValue({ ok: true });
  });

  it("passes the guest's reason through", async () => {
    const res = await POST(
      new Request("http://x/api/manage/tok/cancel", {
        method: "POST",
        body: JSON.stringify({ reason: "Conflict came up" }),
      }),
      { params },
    );
    expect(res.status).toBe(204);
    expect(cancelMeetingByToken).toHaveBeenCalledWith({}, {
      token: "tok",
      reason: "Conflict came up",
    });
  });

  it("accepts an empty body (no reason)", async () => {
    const res = await POST(new Request("http://x", { method: "POST" }), { params });
    expect(res.status).toBe(204);
    expect(cancelMeetingByToken).toHaveBeenCalledWith({}, { token: "tok", reason: null });
  });

  it("rejects malformed JSON", async () => {
    const res = await POST(
      new Request("http://x", { method: "POST", body: "{nope" }),
      { params },
    );
    expect(res.status).toBe(400);
    expect(cancelMeetingByToken).not.toHaveBeenCalled();
  });
});
