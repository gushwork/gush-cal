import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { POST } from "./route";

const mockRequireSchedulerId = vi.fn();
const mockGetDb = vi.fn();
const mockCreateApiKey = vi.fn();

vi.mock("@/components/calendar-admin/require-scheduler", () => ({
  requireSchedulerId: () => mockRequireSchedulerId(),
  jsonError: (message: string, status: number) =>
    NextResponse.json({ error: message }, { status }),
}));
vi.mock("@/lib/db/client", () => ({ getDb: () => mockGetDb() }));
vi.mock("@/lib/events/api-keys", () => ({
  createApiKey: (...a: unknown[]) => mockCreateApiKey(...a),
  listApiKeys: vi.fn(),
}));

function mockOwnedCalendar(rows: unknown[]) {
  const limit = vi.fn(() => Promise.resolve(rows));
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  mockGetDb.mockReturnValue({ select: vi.fn(() => ({ from })) });
}

const req = (b: unknown) =>
  new Request("http://localhost/api/calendars/cal-1/keys", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(b),
  });
const params = { params: Promise.resolve({ id: "cal-1" }) };

describe("POST /api/calendars/:id/keys", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSchedulerId.mockResolvedValue({ schedulerId: "sched-1" });
    mockOwnedCalendar([{ id: "cal-1", schedulerId: "sched-1" }]);
  });

  it("rejects whitespace-only name with 400 (BUG-050)", async () => {
    const res = await POST(req({ name: "   " }), params);
    expect(res.status).toBe(400);
    expect(mockCreateApiKey).not.toHaveBeenCalled();
  });

  it("creates a key with the trimmed name", async () => {
    mockCreateApiKey.mockResolvedValue({ id: "key-1", name: "prod" });
    const res = await POST(req({ name: "  prod  " }), params);
    expect(res.status).toBe(201);
    expect(mockCreateApiKey).toHaveBeenCalledWith("cal-1", "prod", "sched-1");
  });
});
