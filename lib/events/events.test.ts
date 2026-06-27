import { createHash, createHmac } from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppEventType } from "@/lib/types/platform";
import { defaultCalendarSettings } from "@/lib/types/platform";
import {
  authenticateApiKey,
  generateApiKey,
  hashApiKey,
  signWebhookPayload,
} from "./api-key-auth";
import { deleteApiKey, revokeApiKey } from "./api-keys";
import { deliverWebhook } from "./deliver-webhook";
import { createEventsPort } from "./index";
import { insertOutboxEvent, processOutboxBatch } from "./outbox";
import { processDueTriggers, scheduleRelativeTriggers } from "./scheduler";

const FIXED_KEY_BYTES = Buffer.alloc(24, 2);
const FIXED_API_KEY = `gw_${FIXED_KEY_BYTES.toString("base64url")}`;
const FIXED_API_KEY_HASH = createHash("sha256").update(FIXED_API_KEY).digest("hex");

const CALENDAR_ID = "cal-1";
const MEETING_ID = "meet-1";
const STARTS_AT = "2026-06-10T14:00:00.000Z";

const mockInsertValues = vi.fn();
const mockUpdateWhere = vi.fn();
const mockUpdateReturning = vi.fn();
const mockDeleteReturning = vi.fn();

let selectResults: unknown[][] = [];

function queueSelect(...results: unknown[][]) {
  selectResults.push(...results);
}

function nextSelectRows(): unknown[] {
  return selectResults.shift() ?? [];
}

function createQueryBuilder(rows = nextSelectRows()) {
  const builder = {
    orderBy: () => builder,
    limit: () => builder,
    then(onFulfilled?: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) {
      return Promise.resolve(rows).then(onFulfilled, onRejected);
    },
  };
  return builder;
}

vi.mock("crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("crypto")>();
  return {
    ...actual,
    randomBytes: vi.fn((size: number) => Buffer.alloc(size, 2)),
  };
});

function createWhereBuilder(returningMock: ReturnType<typeof vi.fn>) {
  return {
    returning: returningMock,
    then(
      onFulfilled?: (value: unknown) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) {
      return Promise.resolve(undefined).then(onFulfilled, onRejected);
    },
  };
}

vi.mock("@/lib/db/client", () => ({
  getDb: () => ({
    insert: () => ({
      values: mockInsertValues,
    }),
    select: () => ({
      from: () => ({
        where: () => createQueryBuilder(),
        leftJoin: () => ({
          where: () => createQueryBuilder(),
        }),
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => {
          mockUpdateWhere();
          return createWhereBuilder(mockUpdateReturning);
        },
      }),
    }),
    delete: () => ({
      where: () => createWhereBuilder(mockDeleteReturning),
    }),
  }),
}));

describe("lib/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResults = [];
    mockInsertValues.mockResolvedValue(undefined);
    mockUpdateReturning.mockResolvedValue([]);
    mockDeleteReturning.mockResolvedValue([]);
    global.fetch = vi.fn();
  });

  describe("api-keys", () => {
    const KEY_ID = "key-1";
    const revokedRow = {
      id: KEY_ID,
      calendarId: CALENDAR_ID,
      name: "Production",
      keyHash: FIXED_API_KEY_HASH,
      createdBy: null,
      createdAt: "2026-06-01T12:00:00.000Z",
      lastUsedAt: null,
      revokedAt: "2026-06-02T12:00:00.000Z",
    };

    it("revokes an active key", async () => {
      mockUpdateReturning.mockResolvedValueOnce([revokedRow]);

      const key = await revokeApiKey(CALENDAR_ID, KEY_ID);

      expect(mockUpdateWhere).toHaveBeenCalled();
      expect(key).toMatchObject({
        id: KEY_ID,
        calendarId: CALENDAR_ID,
        name: "Production",
        revokedAt: "2026-06-02T12:00:00.000Z",
      });
    });

    it("returns null when revoking a missing or already revoked key", async () => {
      mockUpdateReturning.mockResolvedValueOnce([]);

      const key = await revokeApiKey(CALENDAR_ID, KEY_ID);

      expect(key).toBeNull();
    });

    it("deletes a key by calendar scope", async () => {
      mockDeleteReturning.mockResolvedValueOnce([{ id: KEY_ID }]);

      const deleted = await deleteApiKey(CALENDAR_ID, KEY_ID);

      expect(deleted).toBe(true);
      expect(mockDeleteReturning).toHaveBeenCalled();
    });

    it("returns false when deleting a missing key", async () => {
      mockDeleteReturning.mockResolvedValueOnce([]);

      const deleted = await deleteApiKey(CALENDAR_ID, KEY_ID);

      expect(deleted).toBe(false);
    });
  });

  describe("api-key-auth", () => {
    it("generates gw_ prefixed keys and stores sha256 hash only", () => {
      const key = generateApiKey();
      expect(key.startsWith("gw_")).toBe(true);
      expect(hashApiKey(key)).toBe(FIXED_API_KEY_HASH);
    });

    it("authenticates Bearer key scoped to calendar", async () => {
      queueSelect([{ calendarId: CALENDAR_ID, revokedAt: null }]);

      const result = await authenticateApiKey(
        { authorization: `Bearer ${FIXED_API_KEY}` },
        CALENDAR_ID,
      );

      expect(result).toEqual({ ok: true, calendarId: CALENDAR_ID });
    });

    it("rejects missing or revoked keys", async () => {
      queueSelect([]);

      const missing = await authenticateApiKey({}, CALENDAR_ID);
      expect(missing).toEqual({ ok: false, code: "UNAUTHORIZED" });

      queueSelect([]);

      const revoked = await authenticateApiKey(
        { authorization: `Bearer ${FIXED_API_KEY}` },
        CALENDAR_ID,
      );
      expect(revoked).toEqual({ ok: false, code: "UNAUTHORIZED" });
    });
  });

  describe("deliver-webhook", () => {
    it("POSTs envelope JSON with HMAC-SHA256 signature", async () => {
      const secret = "whsec_test";
      const envelope = {
        id: "evt-1",
        type: "meeting.booked" as AppEventType,
        calendarId: CALENDAR_ID,
        meetingId: MEETING_ID,
        occurredAt: "2026-06-10T12:00:00.000Z",
        data: { meetingId: MEETING_ID },
      };
      const rawBody = JSON.stringify(envelope);
      const expectedSig = createHmac("sha256", secret).update(rawBody).digest("hex");

      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response("ok", { status: 200 }),
      );

      const ok = await deliverWebhook("https://hooks.example.com/in", secret, envelope);
      expect(ok).toBe(true);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://hooks.example.com/in",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "X-Webhook-Signature": expectedSig,
          }),
          body: rawBody,
        }),
      );
      expect(signWebhookPayload(secret, rawBody)).toBe(expectedSig);
    });

    it("returns false on 5xx responses", async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response("error", { status: 503 }),
      );

      const ok = await deliverWebhook("https://hooks.example.com/in", "secret", {
        id: "evt-2",
        type: "meeting.cancelled",
        calendarId: CALENDAR_ID,
        occurredAt: "2026-06-10T12:00:00.000Z",
        data: {},
      });

      expect(ok).toBe(false);
    });
  });

  describe("outbox", () => {
    it("inserts pending events on emit", async () => {
      await insertOutboxEvent({
        calendarId: CALENDAR_ID,
        eventType: "meeting.booked",
        payload: { meetingId: MEETING_ID },
      });

      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          calendarId: CALENDAR_ID,
          eventType: "meeting.booked",
          payload: { meetingId: MEETING_ID },
          status: "pending",
          attempts: 0,
        }),
      );
    });

    it("delivers to matching webhook endpoints and marks delivered", async () => {
      const outboxRow = {
        id: "out-1",
        calendarId: CALENDAR_ID,
        eventType: "meeting.booked",
        payload: { meetingId: MEETING_ID },
        attempts: 0,
        createdAt: "2026-06-10T12:00:00.000Z",
      };

      queueSelect(
        [outboxRow],
        [{ url: "https://hooks.example.com/a", secret: "sec-a", enabledEvents: ["meeting.booked"] }],
      );

      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response("ok", { status: 200 }),
      );

      const processed = await processOutboxBatch(50);
      expect(processed).toBe(1);
      expect(global.fetch).toHaveBeenCalledOnce();
      expect(mockUpdateWhere).toHaveBeenCalled();
    });
  });

  describe("scheduler", () => {
    it("creates before/after triggers from calendar triggerOffsets", async () => {
      queueSelect(
        [{ id: MEETING_ID, calendarId: CALENDAR_ID, startsAt: STARTS_AT }],
        [{ settings: defaultCalendarSettings() }],
      );

      await scheduleRelativeTriggers(MEETING_ID);

      expect(mockInsertValues).toHaveBeenCalledTimes(1);
      const rows = mockInsertValues.mock.calls[0][0];
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        calendarId: CALENDAR_ID,
        meetingId: MEETING_ID,
        triggerType: "meeting.before",
        status: "pending",
      });

      const fireAt = new Date(rows[0].fireAt);
      const startsAt = new Date(STARTS_AT);
      const expected = new Date(startsAt);
      expected.setUTCMinutes(expected.getUTCMinutes() - 1440);
      expect(fireAt.toISOString()).toBe(expected.toISOString());
    });

    it("promotes due triggers to outbox events", async () => {
      queueSelect([
        {
          id: "trig-1",
          calendarId: CALENDAR_ID,
          meetingId: MEETING_ID,
          triggerType: "meeting.before",
          payload: { offsetMinutes: 1440 },
        },
      ]);

      const fired = await processDueTriggers();
      expect(fired).toBe(1);
      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          calendarId: CALENDAR_ID,
          eventType: "meeting.before",
          payload: expect.objectContaining({ meetingId: MEETING_ID, offsetMinutes: 1440 }),
          status: "pending",
        }),
      );
    });
  });

  describe("createEventsPort", () => {
    it("wires emit and scheduleRelativeTriggers", async () => {
      queueSelect(
        [{ id: MEETING_ID, calendarId: CALENDAR_ID, startsAt: STARTS_AT }],
        [{ settings: defaultCalendarSettings() }],
      );

      const port = createEventsPort();
      await port.emit({
        calendarId: CALENDAR_ID,
        eventType: "meeting.booked",
        meetingId: MEETING_ID,
        payload: { meetingId: MEETING_ID },
      });
      await port.scheduleRelativeTriggers(MEETING_ID);

      expect(mockInsertValues).toHaveBeenCalled();
    });
  });
});
