import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SalesforceFieldMap } from "@/lib/types/platform";
import {
  applyFieldMappings,
  listFieldMaps,
  seedDefaultFieldMaps,
  validateFieldMapInput,
} from "./field-map";
import { signOAuthState, verifyOAuthState } from "./connections";
import { createSalesforcePort, setSalesforceDepsForTest } from "./index";
import { LOOKUP_TIMEOUT_MS } from "./lookup-owner";

const calendarId = "cal-1";
const connection = {
  calendarId,
  accessToken: "access-token",
  refreshToken: "refresh-token",
  instanceUrl: "https://acme.my.salesforce.com",
  connectedAt: "2026-06-01T00:00:00.000Z",
};

const bookFieldMapRow = {
  id: "map-1",
  calendarId,
  eventType: "book" as const,
  objectApiName: "Lead",
  lookupByEmail: true,
  createIfMissing: true,
  fieldMappings: [
    { source: "guestEmail" as const, targetFieldApiName: "Email" },
    { source: "startsAt" as const, targetFieldApiName: "Meeting_Time__c" },
    { source: "memberEmail" as const, targetFieldApiName: "Assigned_To__c" },
  ],
};

const mockFetch = vi.fn();
const mockEmit = vi.fn();

function createDbMock() {
  const selectQueue: unknown[][] = [];
  const enqueueSelect = (...rows: unknown[][]) => {
    selectQueue.push(...rows);
  };

  const nextSelect = () => Promise.resolve(selectQueue.shift() ?? []);

  const limit = vi.fn(() => nextSelect());
  const orderBy = vi.fn(() => nextSelect());
  const where = vi.fn(() => ({
    limit,
    orderBy,
    returning: vi.fn(() => nextSelect()),
  }));
  const from = vi.fn(() => ({ where, orderBy }));
  const select = vi.fn(() => ({ from }));

  const insertReturning = vi.fn(() => nextSelect());
  const insert = vi.fn(() => ({
    values: vi.fn(() => ({ returning: insertReturning, onConflictDoNothing: vi.fn() })),
  }));

  const updateReturning = vi.fn(() => nextSelect());
  const update = vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => ({ returning: updateReturning })),
    })),
  }));

  const deleteReturning = vi.fn(() => nextSelect());
  const del = vi.fn(() => ({
    where: vi.fn(() => ({ returning: deleteReturning })),
  }));

  return {
    db: { select, insert, update, delete: del },
    enqueueSelect,
    insertReturning,
    updateReturning,
    deleteReturning,
  };
}

let dbMock = createDbMock();

vi.mock("@/lib/db/client", () => ({
  getDb: () => dbMock.db,
}));

describe("Salesforce adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock = createDbMock();
    setSalesforceDepsForTest({
      fetch: mockFetch,
      events: { emit: mockEmit, scheduleRelativeTriggers: vi.fn() },
    });
  });

  afterEach(() => {
    setSalesforceDepsForTest(null);
  });

  describe("lookupLeadOwner", () => {
    it("returns owner from Lead query", async () => {
      dbMock.enqueueSelect([connection]);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          records: [{ Id: "00Q123", Owner: { Email: "owner@acme.com" } }],
        }),
      });

      const port = createSalesforcePort();
      const result = await port.lookupLeadOwner(calendarId, "guest@example.com");

      expect(result).toEqual({
        ok: true,
        ownerEmail: "owner@acme.com",
        recordId: "00Q123",
        recordType: "Lead",
      });
      expect(mockFetch).toHaveBeenCalledOnce();
      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toContain(encodeURIComponent("FROM Lead"));
      expect(url).toContain(encodeURIComponent("guest@example.com"));
    });

    it("falls back to Contact when Lead is missing", async () => {
      dbMock.enqueueSelect([connection]);
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ records: [] }) })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            records: [{ Id: "003ABC", Owner: { Email: "contact-owner@acme.com" } }],
          }),
        });

      const port = createSalesforcePort();
      const result = await port.lookupLeadOwner(calendarId, "guest@example.com");

      expect(result).toEqual({
        ok: true,
        ownerEmail: "contact-owner@acme.com",
        recordId: "003ABC",
        recordType: "Contact",
      });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("returns NOT_FOUND when no connection exists", async () => {
      dbMock.enqueueSelect([]);

      const port = createSalesforcePort();
      const result = await port.lookupLeadOwner(calendarId, "guest@example.com");

      expect(result).toEqual({ ok: false, code: "NOT_FOUND" });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("returns NOT_FOUND when SF has no matching records", async () => {
      dbMock.enqueueSelect([connection]);
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ records: [] }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ records: [] }) });

      const port = createSalesforcePort();
      const result = await port.lookupLeadOwner(calendarId, "missing@example.com");

      expect(result).toEqual({ ok: false, code: "NOT_FOUND" });
    });

    it(`returns TIMEOUT when lookup exceeds ${LOOKUP_TIMEOUT_MS}ms`, async () => {
      dbMock.enqueueSelect([connection]);
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({
                    records: [{ Id: "00Q1", Owner: { Email: "late@acme.com" } }],
                  }),
                }),
              LOOKUP_TIMEOUT_MS + 50,
            );
          }),
      );

      const port = createSalesforcePort();
      const result = await port.lookupLeadOwner(calendarId, "slow@example.com");

      expect(result).toEqual({ ok: false, code: "TIMEOUT" });
    });

    it("returns ERROR when SF API fails", async () => {
      dbMock.enqueueSelect([connection]);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "Server error",
      });

      const port = createSalesforcePort();
      const result = await port.lookupLeadOwner(calendarId, "guest@example.com");

      expect(result).toEqual({ ok: false, code: "ERROR" });
    });
  });

  describe("syncFieldMap", () => {
    const syncSettings = {
      settings: {
        salesforceSync: {
          onBook: "sync",
          onCancel: "async",
          onReschedule: "async",
          onReassign: "async",
        },
      },
    };

    it("looks up record, patches mapped fields, emits success", async () => {
      dbMock.enqueueSelect([syncSettings], [connection], [bookFieldMapRow]);
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ records: [{ Id: "00Q999" }] }),
        })
        .mockResolvedValueOnce({ ok: true, status: 204, json: async () => ({}) });

      const port = createSalesforcePort();
      const result = await port.syncFieldMap(calendarId, "book", {
        meetingId: "meet-1",
        guestEmail: "guest@example.com",
        memberEmail: "member@acme.com",
        startsAt: "2026-07-01T15:00:00.000Z",
      });

      expect(result).toEqual({ ok: true });
      expect(mockFetch).toHaveBeenCalledTimes(2);
      const patchCall = mockFetch.mock.calls[1] as [string, RequestInit];
      expect(patchCall[0]).toContain("/sobjects/Lead/00Q999");
      expect(JSON.parse(String(patchCall[1]?.body))).toMatchObject({
        Email: "guest@example.com",
        Meeting_Time__c: "2026-07-01T15:00:00.000Z",
        Assigned_To__c: "member@acme.com",
      });
      expect(mockEmit).toHaveBeenCalledWith(
        expect.objectContaining({
          calendarId,
          eventType: "salesforce.sync_succeeded",
          meetingId: "meet-1",
        }),
      );
    });

    it("creates Lead when missing and createIfMissing is true", async () => {
      dbMock.enqueueSelect([syncSettings], [connection], [bookFieldMapRow]);
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ records: [] }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ records: [] }) })
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => ({ id: "00QNEW" }),
        });

      const port = createSalesforcePort();
      const result = await port.syncFieldMap(calendarId, "book", {
        meetingId: "meet-2",
        guestEmail: "new@example.com",
        startsAt: "2026-07-01T15:00:00.000Z",
      });

      expect(result).toEqual({ ok: true });
      expect(mockFetch).toHaveBeenCalledTimes(3);
      const createCall = mockFetch.mock.calls[2] as [string, RequestInit];
      expect(createCall[0]).toContain("/sobjects/Lead");
      expect(createCall[1]?.method).toBe("POST");
    });

    it("emits sync_failed on SF error", async () => {
      dbMock.enqueueSelect([syncSettings], [connection], [bookFieldMapRow]);
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ records: [{ Id: "00Q999" }] }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: async () => "Bad field",
        });

      const port = createSalesforcePort();
      const result = await port.syncFieldMap(calendarId, "book", {
        meetingId: "meet-3",
        guestEmail: "guest@example.com",
      });

      expect(result).toEqual({ ok: false, error: expect.stringContaining("Bad field") });
      expect(mockEmit).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "salesforce.sync_failed",
          meetingId: "meet-3",
        }),
      );
    });

    it("returns ok when no field map configured", async () => {
      dbMock.enqueueSelect(
        [{ settings: { salesforceSync: { onBook: "async", onCancel: "async", onReschedule: "async", onReassign: "async" } } }],
        [connection],
        [],
      );

      const port = createSalesforcePort();
      const result = await port.syncFieldMap(calendarId, "cancel", {
        meetingId: "meet-4",
      });

      expect(result).toEqual({ ok: true });
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("applyFieldMappings", () => {
    it("maps payload sources and static values", () => {
      const result = applyFieldMappings(
        [
          { source: "guestEmail", targetFieldApiName: "Email" },
          { source: "startsAt", targetFieldApiName: "Meeting_Time__c" },
          { source: "static", staticValue: "Booked", targetFieldApiName: "Status__c" },
        ],
        {
          guestEmail: "a@b.com",
          startsAt: "2026-07-01T15:00:00.000Z",
        },
      );

      expect(result).toEqual({
        Email: "a@b.com",
        Meeting_Time__c: "2026-07-01T15:00:00.000Z",
        Status__c: "Booked",
      });
    });
  });

  describe("validateFieldMapInput (BUG-031)", () => {
    const full = {
      eventType: "book" as const,
      objectApiName: "Lead",
      fieldMappings: [
        { source: "guestEmail" as const, targetFieldApiName: "Email" },
      ],
    };

    it("accepts a valid full (POST) body", () => {
      expect(validateFieldMapInput(full, false)).toBeNull();
    });

    it("rejects a bad eventType on full and partial", () => {
      const bad = { ...full, eventType: "garbage" as never };
      expect(validateFieldMapInput(bad, false)).toMatch(/eventType/);
      expect(validateFieldMapInput({ eventType: "garbage" as never }, true)).toMatch(
        /eventType/,
      );
    });

    it("requires fields on POST but skips absent fields on PATCH", () => {
      expect(validateFieldMapInput({ eventType: "book" }, false)).toMatch(
        /objectApiName/,
      );
      expect(validateFieldMapInput({ objectApiName: "Lead" }, true)).toBeNull();
    });

    it("rejects empty objectApiName / fieldMappings when supplied", () => {
      expect(validateFieldMapInput({ objectApiName: "  " }, true)).toMatch(
        /objectApiName/,
      );
      expect(validateFieldMapInput({ fieldMappings: [] }, true)).toMatch(
        /fieldMappings/,
      );
    });
  });

  describe("OAuth state signing (BUG-029)", () => {
    it("verifies a freshly signed state and rejects forged/missing", () => {
      const state = signOAuthState("cal-1");
      expect(verifyOAuthState("cal-1", state)).toBe(true);
      expect(verifyOAuthState("cal-1", "forged")).toBe(false);
      expect(verifyOAuthState("cal-1", null)).toBe(false);
      expect(verifyOAuthState("cal-2", state)).toBe(false);
    });
  });

  describe("field map CRUD", () => {
    it("lists field maps for a calendar", async () => {
      dbMock.enqueueSelect([bookFieldMapRow]);

      const maps = await listFieldMaps(calendarId);
      expect(maps).toHaveLength(1);
      expect(maps[0]?.eventType).toBe("book");
    });

    it("seeds default field maps on connect", async () => {
      dbMock.enqueueSelect([]);
      dbMock.insertReturning.mockResolvedValue([bookFieldMapRow]);

      await seedDefaultFieldMaps(calendarId);
      expect(dbMock.db.insert).toHaveBeenCalled();
    });
  });
});
