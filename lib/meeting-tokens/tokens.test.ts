import { createHash } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TOKEN_EXPIRY_DAYS_AFTER_MEETING } from "./constants";
import { createManageTokenPort } from "./index";

const FIXED_TOKEN = Buffer.alloc(32, 1).toString("base64url");
const FIXED_HASH = createHash("sha256").update(FIXED_TOKEN).digest("hex");

const MEETING_ID = "meet-1";
const STARTS_AT = "2026-06-10T14:00:00.000Z";

const mockSelectLimit = vi.fn();
const mockUpdateWhere = vi.fn();
const mockInsertValues = vi.fn();

vi.mock("crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("crypto")>();
  return {
    ...actual,
    randomBytes: vi.fn(() => Buffer.alloc(32, 1)),
  };
});

vi.mock("@/lib/db/client", () => ({
  getDb: () => ({
    select: () => ({
      from: () => ({
        where: () => ({
          limit: mockSelectLimit,
        }),
      }),
    }),
    update: () => ({
      set: () => ({
        where: mockUpdateWhere,
      }),
    }),
    insert: () => ({
      values: mockInsertValues,
    }),
  }),
}));

const env = process.env;

describe("createManageTokenPort", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.APP_URL = "https://app.example.com";
    mockUpdateWhere.mockResolvedValue(undefined);
    mockInsertValues.mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env = { ...env };
  });

  describe("createForMeeting", () => {
    it("returns token and manageUrl, revokes prior tokens, stores sha256 hash", async () => {
      mockSelectLimit.mockResolvedValueOnce([{ startsAt: STARTS_AT }]);

      const port = createManageTokenPort();
      const result = await port.createForMeeting(MEETING_ID);

      expect(result).toEqual({
        token: FIXED_TOKEN,
        manageUrl: `https://app.example.com/manage/${FIXED_TOKEN}`,
      });
      expect(mockUpdateWhere).toHaveBeenCalledOnce();
      expect(mockInsertValues).toHaveBeenCalledWith({
        meetingId: MEETING_ID,
        tokenHash: FIXED_HASH,
        expiresAt: expect.any(String),
      });

      const expiry = new Date(mockInsertValues.mock.calls[0][0].expiresAt);
      const expected = new Date(STARTS_AT);
      expected.setUTCDate(expected.getUTCDate() + TOKEN_EXPIRY_DAYS_AFTER_MEETING);
      expect(expiry.toISOString()).toBe(expected.toISOString());
    });

    it("throws when meeting is not found", async () => {
      mockSelectLimit.mockResolvedValueOnce([]);

      const port = createManageTokenPort();
      await expect(port.createForMeeting(MEETING_ID)).rejects.toThrow(
        "Meeting not found",
      );
    });
  });

  describe("validate", () => {
    it("returns meetingId for a valid token", async () => {
      const future = new Date();
      future.setUTCDate(future.getUTCDate() + 1);

      mockSelectLimit.mockResolvedValueOnce([
        {
          meetingId: MEETING_ID,
          expiresAt: future.toISOString(),
          revokedAt: null,
        },
      ]);

      const port = createManageTokenPort();
      const result = await port.validate(FIXED_TOKEN);

      expect(result).toEqual({ ok: true, meetingId: MEETING_ID });
    });

    it("returns INVALID when token is unknown", async () => {
      mockSelectLimit.mockResolvedValueOnce([]);

      const port = createManageTokenPort();
      const result = await port.validate("unknown-token");

      expect(result).toEqual({ ok: false, code: "INVALID" });
    });

    it("returns REVOKED when token was revoked", async () => {
      const future = new Date();
      future.setUTCDate(future.getUTCDate() + 1);

      mockSelectLimit.mockResolvedValueOnce([
        {
          meetingId: MEETING_ID,
          expiresAt: future.toISOString(),
          revokedAt: "2026-06-11T00:00:00.000Z",
        },
      ]);

      const port = createManageTokenPort();
      const result = await port.validate(FIXED_TOKEN);

      expect(result).toEqual({ ok: false, code: "REVOKED" });
    });

    it("returns EXPIRED when token is past expiry", async () => {
      mockSelectLimit.mockResolvedValueOnce([
        {
          meetingId: MEETING_ID,
          expiresAt: "2020-01-01T00:00:00.000Z",
          revokedAt: null,
        },
      ]);

      const port = createManageTokenPort();
      const result = await port.validate(FIXED_TOKEN);

      expect(result).toEqual({ ok: false, code: "EXPIRED" });
    });
  });

  describe("revokeForMeeting", () => {
    it("revokes active tokens for the meeting", async () => {
      const port = createManageTokenPort();
      await port.revokeForMeeting(MEETING_ID);

      expect(mockUpdateWhere).toHaveBeenCalledOnce();
    });
  });
});
