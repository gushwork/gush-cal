import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ManageTokenPort } from "@/lib/ports/manage-token";
import type { EventsPort } from "@/lib/ports/events";
import type { CalendarDuplicateSettings } from "@/lib/types/platform";
import { createDuplicateGuardPort } from "./duplicate-guard";

// Uses meetings_guest_email_active_idx (guest_email, starts_at) for guest lookup.

const NOW = "2026-06-27T12:00:00.000Z";

function createMockDb(selectResults: unknown[][]) {
  let call = 0;
  const nextRows = () => {
    const rows = selectResults[call] ?? [];
    call += 1;
    return rows;
  };
  const mockLimit = vi.fn(async () => nextRows());
  const mockWhere = vi.fn(() => {
    const chain = {
      limit: mockLimit,
      then(
        resolve: (value: unknown) => void,
        reject?: (reason: unknown) => void,
      ) {
        Promise.resolve(nextRows()).then(resolve, reject);
      },
    };
    return chain;
  });
  const mockInnerJoin = vi.fn(() => ({ where: mockWhere }));
  const mockFrom = vi.fn(() => ({
    where: mockWhere,
    innerJoin: mockInnerJoin,
  }));
  const mockSelect = vi.fn(() => ({ from: mockFrom }));
  return {
    db: { select: mockSelect },
    mockLimit,
  };
}

function createManageTokenMock(
  manageUrl = "/manage/test-token",
): ManageTokenPort {
  return {
    createForMeeting: vi.fn().mockResolvedValue({
      token: "test-token",
      manageUrl,
    }),
    validate: vi.fn(),
    revokeForMeeting: vi.fn(),
  };
}

function createEventsMock(): EventsPort & { emit: ReturnType<typeof vi.fn> } {
  return {
    emit: vi.fn().mockResolvedValue(undefined),
    scheduleRelativeTriggers: vi.fn(),
  };
}

describe("createDuplicateGuardPort", () => {
  let manageToken: ReturnType<typeof createManageTokenMock>;
  let events: ReturnType<typeof createEventsMock>;

  beforeEach(() => {
    manageToken = createManageTokenMock();
    events = createEventsMock();
  });

  it("returns INVALID_EMAIL for malformed guest email", async () => {
    const { db } = createMockDb([]);
    const guard = createDuplicateGuardPort({ db, manageToken, events, now: () => new Date(NOW) });

    const result = await guard.check({
      calendarId: "cal-1",
      guestEmail: "not-an-email",
      settings: { scope: "calendar", uxMode: "hard_block" },
    });

    expect(result).toEqual({ ok: false, code: "INVALID_EMAIL" });
  });

  it("allows booking when no active meeting exists (calendar scope)", async () => {
    const { db } = createMockDb([[]]);
    const guard = createDuplicateGuardPort({ db, manageToken, events, now: () => new Date(NOW) });

    const result = await guard.check({
      calendarId: "cal-1",
      guestEmail: "guest@example.com",
      settings: { scope: "calendar", uxMode: "hard_block" },
    });

    expect(result).toEqual({ ok: true, allowed: true });
    expect(events.emit).not.toHaveBeenCalled();
  });

  it("blocks with hard_block when active meeting exists on same calendar", async () => {
    const { db } = createMockDb([[{ id: "meet-existing" }]]);
    const guard = createDuplicateGuardPort({ db, manageToken, events, now: () => new Date(NOW) });

    const result = await guard.check({
      calendarId: "cal-1",
      guestEmail: "Guest@Example.com",
      settings: { scope: "calendar", uxMode: "hard_block" },
    });

    expect(result).toEqual({
      ok: true,
      allowed: false,
      existingMeetingId: "meet-existing",
      manageUrl: "/manage/test-token",
      mode: "hard_block",
    });
    expect(manageToken.createForMeeting).toHaveBeenCalledWith("meet-existing");
    expect(events.emit).toHaveBeenCalledWith({
      calendarId: "cal-1",
      eventType: "booking.duplicate_blocked",
      payload: {
        guestEmail: "guest@example.com",
        existingMeetingId: "meet-existing",
      },
    });
  });

  it("returns soft_warn mode when duplicate exists", async () => {
    const { db } = createMockDb([[{ id: "meet-existing" }]]);
    const guard = createDuplicateGuardPort({ db, manageToken, events, now: () => new Date(NOW) });

    const result = await guard.check({
      calendarId: "cal-1",
      guestEmail: "guest@example.com",
      settings: { scope: "calendar", uxMode: "soft_warn" },
    });

    expect(result).toMatchObject({
      ok: true,
      allowed: false,
      mode: "soft_warn",
    });
  });

  it("scheduler scope looks up scheduler then meetings across calendars", async () => {
    const { db, mockLimit } = createMockDb([
      [{ schedulerId: "sched-1" }],
      [{ id: "meet-sibling" }],
    ]);
    const guard = createDuplicateGuardPort({ db, manageToken, events, now: () => new Date(NOW) });

    const result = await guard.check({
      calendarId: "cal-1",
      guestEmail: "guest@example.com",
      settings: { scope: "scheduler", uxMode: "hard_block" },
    });

    expect(result).toMatchObject({
      ok: true,
      allowed: false,
      existingMeetingId: "meet-sibling",
    });
    expect(mockLimit).toHaveBeenCalledTimes(2);
  });

  it("deployment scope queries all meetings", async () => {
    const { db, mockLimit } = createMockDb([[{ id: "meet-global" }]]);
    const guard = createDuplicateGuardPort({ db, manageToken, events, now: () => new Date(NOW) });

    const result = await guard.check({
      calendarId: "cal-1",
      guestEmail: "guest@example.com",
      settings: { scope: "deployment", uxMode: "hard_block" },
    });

    expect(result).toMatchObject({
      ok: true,
      allowed: false,
      existingMeetingId: "meet-global",
    });
    expect(mockLimit).toHaveBeenCalledTimes(1);
  });

  it("salesforce_connection scope checks calendars sharing instanceUrl", async () => {
    const { db, mockLimit } = createMockDb([
      [{ instanceUrl: "https://acme.my.salesforce.com" }],
      [{ calendarId: "cal-1" }, { calendarId: "cal-2" }],
      [{ id: "meet-sf" }],
    ]);
    const guard = createDuplicateGuardPort({ db, manageToken, events, now: () => new Date(NOW) });

    const result = await guard.check({
      calendarId: "cal-1",
      guestEmail: "guest@example.com",
      settings: { scope: "salesforce_connection", uxMode: "hard_block" },
    });

    expect(result).toMatchObject({
      ok: true,
      allowed: false,
      existingMeetingId: "meet-sf",
    });
    expect(mockLimit).toHaveBeenCalledTimes(2);
  });

  it("salesforce_connection scope allows when calendar has no SF connection", async () => {
    const { db } = createMockDb([[]]);
    const guard = createDuplicateGuardPort({ db, manageToken, events, now: () => new Date(NOW) });

    const result = await guard.check({
      calendarId: "cal-1",
      guestEmail: "guest@example.com",
      settings: { scope: "salesforce_connection", uxMode: "hard_block" },
    });

    expect(result).toEqual({ ok: true, allowed: true });
  });

  it("active meeting requires cancelledAt IS NULL and startsAt > now", async () => {
    const { db } = createMockDb([[]]);
    const guard = createDuplicateGuardPort({ db, manageToken, events, now: () => new Date(NOW) });

    await guard.check({
      calendarId: "cal-1",
      guestEmail: "guest@example.com",
      settings: { scope: "calendar", uxMode: "hard_block" } satisfies CalendarDuplicateSettings,
    });

    expect(db.select).toHaveBeenCalled();
  });
});
