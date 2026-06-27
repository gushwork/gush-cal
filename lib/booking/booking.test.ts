import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppDeps } from "@/lib/deps";
import { createPlatformDepsStub } from "@/lib/test/mock-platform-deps";
import type { CalendarBundle, ConfirmBookingBody } from "@/lib/types";
import { cancelMeeting } from "./cancel-meeting";
import { confirmBooking, MIN_NOTICE_VIOLATION } from "./confirm-booking";
import {
  clearSlotsCache,
  clearSlotsCacheForCalendar,
  getCachedSlots,
  setCachedSlots,
  slotsCacheKey,
} from "./slots-cache";
import { parseSlotsQuery } from "./parse-slots-query";
import { toPublicCalendar, toPublicMeeting } from "./to-public-meeting";
import { defaultSchedulingSettingsStub } from "@/lib/stubs/scheduling-settings-stub";

const { mockSchedulingSettings } = vi.hoisted(() => ({
  mockSchedulingSettings: {
    assignmentMode: "load_balanced_round_robin" as const,
    teamSelectionMode: "url_with_default" as const,
    defaultTeamId: null,
    rescheduleAssignment: "keep_member" as const,
    strictRotation: {},
    weightedDeficits: {},
  },
}));

vi.mock("@/lib/scheduling/load-scheduling-settings", () => ({
  loadCalendarSchedulingSettings: vi.fn().mockResolvedValue(mockSchedulingSettings),
  advanceStrictRotation: vi.fn(),
  advanceWeightedDeficits: vi.fn(),
}));

vi.mock("@/lib/booking/advance-assignment-state", () => ({
  advanceAssignmentState: vi.fn().mockResolvedValue(undefined),
}));

const sampleBundle: CalendarBundle = {
  id: "cal-1",
  schedulerId: "sched-1",
  name: "Engineering Panel",
  slug: "eng-panel",
  bookingWindowDays: 14,
  minNoticeHours: 4,
  defaultMaxPerDay: 3,
  defaultMaxPerWeek: 15,
  defaultWorkingHours: [],
  timezone: "UTC",
  durations: [30, 60],
  createdAt: "2026-01-01T00:00:00.000Z",
  scheduler: {
    id: "sched-1",
    email: "scheduler@acme.com",
    name: "Scheduler",
  },
  members: [
    {
      id: "m-1",
      calendarId: "cal-1",
      email: "member@acme.com",
      displayName: "Member One",
      maxPerDayOverride: null,
      maxPerWeekOverride: null,
      workingHoursOverride: null,
      timezone: null,
      sortOrder: 1,
      assignmentWeight: 100,
    },
  ],
};

const sampleBody: ConfirmBookingBody = {
  startsAt: "2027-06-10T14:00:00.000Z",
  durationMinutes: 30,
  subject: "Panel interview",
  body: "Please join on time.",
  invitees: ["candidate@example.com"],
  viewerTimezone: "America/New_York",
};

const insertedMeetingRow = {
  id: "meet-1",
  calendarId: "cal-1",
  assignedMemberId: "m-1",
  startsAt: sampleBody.startsAt,
  durationMinutes: 30,
  subject: sampleBody.subject,
  body: sampleBody.body,
  invitees: sampleBody.invitees,
  googleEventId: "evt-123",
  meetLink: "https://meet.google.com/abc",
  bookedBy: "scheduler" as const,
  guestEmail: null,
  teamId: null,
  bookingLinkId: null,
  cancelledAt: null,
  createdAt: "2026-06-03T12:00:00.000Z",
};

const mockInsertReturning = vi.fn();
const mockDelete = vi.fn();
const mockSelect = vi.fn();

vi.mock("@/lib/db/client", () => ({
  getDb: () => ({
    insert: () => ({
      values: () => ({
        returning: mockInsertReturning,
      }),
    }),
    delete: () => ({
      where: mockDelete,
    }),
    select: mockSelect,
  }),
}));

function createMockDeps(overrides?: Partial<AppDeps>): AppDeps {
  return {
    ...createPlatformDepsStub(),
    slots: {
      getAvailableSlots: vi.fn(),
      assignMember: vi.fn().mockResolvedValue({
        ok: true,
        member: sampleBundle.members[0],
        eligibleMembers: sampleBundle.members,
      }),
    },
    google: {
      queryFreeBusy: vi.fn(),
      createMeetingEvent: vi.fn().mockResolvedValue({
        ok: true,
        googleEventId: "evt-123",
        meetLink: "https://meet.google.com/abc",
      }),
      deleteEvent: vi.fn().mockResolvedValue(undefined),
    },
    db: {
      countMeetingsForMember: vi.fn().mockResolvedValue(0),
      countMeetingsForMemberOnDay: vi.fn().mockResolvedValue(0),
      listMeetingStartsForMembers: vi
        .fn()
        .mockResolvedValue(new Map<string, string[]>()),
    },
    ...overrides,
  };
}

describe("confirmBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsertReturning.mockResolvedValue([insertedMeetingRow]);
  });

  it("assigns member, creates Google event, and inserts meeting", async () => {
    const deps = createMockDeps();
    const result = await confirmBooking(deps, {
      bundle: sampleBundle,
      body: sampleBody,
      bookedBy: "scheduler",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(deps.slots.assignMember).toHaveBeenCalledWith({
      bundle: sampleBundle,
      startsAt: sampleBody.startsAt,
      durationMinutes: sampleBody.durationMinutes,
      viewerTimezone: sampleBody.viewerTimezone,
      teamId: undefined,
      memberId: undefined,
      scheduling: mockSchedulingSettings,
    });

    expect(deps.google.createMeetingEvent).toHaveBeenCalledWith({
      organizerEmail: "scheduler@acme.com",
      startsAt: sampleBody.startsAt,
      durationMinutes: 30,
      subject: sampleBody.subject,
      body: sampleBody.body,
      attendeeEmails: ["member@acme.com", "candidate@example.com"],
      requestMeet: true,
    });

    expect(result.meeting.id).toBe("meet-1");
    expect(result.meeting.googleEventId).toBe("evt-123");
  });

  it("returns SLOT_UNAVAILABLE when assignment fails", async () => {
    const deps = createMockDeps({
      slots: {
        getAvailableSlots: vi.fn(),
        assignMember: vi.fn().mockResolvedValue({
          ok: false,
          code: "SLOT_UNAVAILABLE",
        }),
      },
    });

    const result = await confirmBooking(deps, {
      bundle: sampleBundle,
      body: sampleBody,
      bookedBy: "scheduler",
    });

    expect(result).toEqual({ ok: false, code: "SLOT_UNAVAILABLE" });
    expect(deps.google.createMeetingEvent).not.toHaveBeenCalled();
  });

  it("returns GOOGLE_ERROR when event creation fails", async () => {
    const deps = createMockDeps({
      google: {
        queryFreeBusy: vi.fn(),
        createMeetingEvent: vi.fn().mockResolvedValue({
          ok: false,
          code: "GOOGLE_API_ERROR",
        }),
        deleteEvent: vi.fn(),
      },
    });

    const result = await confirmBooking(deps, {
      bundle: sampleBundle,
      body: sampleBody,
      bookedBy: "scheduler",
    });

    expect(result).toEqual({ ok: false, code: "GOOGLE_ERROR" });
    expect(mockInsertReturning).not.toHaveBeenCalled();
  });

  it("returns MIN_NOTICE_VIOLATION for guest bookings inside notice window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-03T14:00:00.000Z"));

    const deps = createMockDeps();
    const result = await confirmBooking(deps, {
      bundle: { ...sampleBundle, minNoticeHours: 24 },
      body: {
        ...sampleBody,
        startsAt: "2026-06-04T10:00:00.000Z",
        viewerTimezone: "Asia/Kolkata",
      },
      bookedBy: "guest",
    });

    expect(result).toEqual({ ok: false, code: MIN_NOTICE_VIOLATION });
    expect(deps.slots.assignMember).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("sets guestEmail for guest bookings", async () => {
    const deps = createMockDeps();
    mockInsertReturning.mockResolvedValue([
      {
        ...insertedMeetingRow,
        bookedBy: "guest",
        guestEmail: "guest@example.com",
      },
    ]);

    await confirmBooking(deps, {
      bundle: sampleBundle,
      body: {
        ...sampleBody,
        guestEmail: "guest@example.com",
      },
      bookedBy: "guest",
    });

    expect(deps.google.createMeetingEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        attendeeEmails: [
          "member@acme.com",
          "candidate@example.com",
          "guest@example.com",
        ],
      }),
    );
    expect(mockInsertReturning).toHaveBeenCalled();
  });

  it("includes guestEmail as attendee when invitees list is empty", async () => {
    const deps = createMockDeps();

    await confirmBooking(deps, {
      bundle: sampleBundle,
      body: {
        ...sampleBody,
        invitees: [],
        guestEmail: "guest@example.com",
      },
      bookedBy: "guest",
    });

    expect(deps.google.createMeetingEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        attendeeEmails: ["member@acme.com", "guest@example.com"],
      }),
    );
  });

  it("deduplicates guestEmail when also listed in invitees", async () => {
    const deps = createMockDeps();

    await confirmBooking(deps, {
      bundle: sampleBundle,
      body: {
        ...sampleBody,
        invitees: ["guest@example.com", "candidate@example.com"],
        guestEmail: "guest@example.com",
      },
      bookedBy: "guest",
    });

    expect(deps.google.createMeetingEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        attendeeEmails: [
          "member@acme.com",
          "guest@example.com",
          "candidate@example.com",
        ],
      }),
    );
  });
});

describe("cancelMeeting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDelete.mockResolvedValue(undefined);
  });

  it("deletes Google event and DB row", async () => {
    mockSelect.mockReturnValue({
      from: () => ({
        innerJoin: () => ({
          innerJoin: () => ({
            where: () => ({
              limit: () =>
                Promise.resolve([
                  {
                    meeting: insertedMeetingRow,
                    organizerEmail: "scheduler@acme.com",
                  },
                ]),
            }),
          }),
        }),
      }),
    });

    const deps = createMockDeps();
    const result = await cancelMeeting(deps, "meet-1", "sched-1");

    expect(result).toEqual({ ok: true });
    expect(deps.google.deleteEvent).toHaveBeenCalledWith(
      "scheduler@acme.com",
      "evt-123",
    );
    expect(mockDelete).toHaveBeenCalled();
  });

  it("returns GOOGLE_ERROR and skips DB delete when Google fails", async () => {
    mockSelect.mockReturnValue({
      from: () => ({
        innerJoin: () => ({
          innerJoin: () => ({
            where: () => ({
              limit: () =>
                Promise.resolve([
                  {
                    meeting: insertedMeetingRow,
                    organizerEmail: "scheduler@acme.com",
                  },
                ]),
            }),
          }),
        }),
      }),
    });

    const deps = createMockDeps();
    deps.google.deleteEvent = vi
      .fn()
      .mockRejectedValue(new Error("Google API error"));

    const result = await cancelMeeting(deps, "meet-1", "sched-1");

    expect(result).toEqual({
      ok: false,
      code: "GOOGLE_ERROR",
      message: "Google API error",
    });
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("cancels meetings with stub google event ids without calling Google", async () => {
    mockSelect.mockReturnValue({
      from: () => ({
        innerJoin: () => ({
          innerJoin: () => ({
            where: () => ({
              limit: () =>
                Promise.resolve([
                  {
                    meeting: {
                      ...insertedMeetingRow,
                      googleEventId: "stub-event-202606031200",
                    },
                    organizerEmail: "scheduler@acme.com",
                  },
                ]),
            }),
          }),
        }),
      }),
    });

    const deps = createMockDeps();
    const result = await cancelMeeting(deps, "meet-1", "sched-1");

    expect(result).toEqual({ ok: true });
    expect(deps.google.deleteEvent).toHaveBeenCalledWith(
      "scheduler@acme.com",
      "stub-event-202606031200",
    );
    expect(mockDelete).toHaveBeenCalled();
  });

  it("returns NOT_FOUND when meeting missing", async () => {
    mockSelect.mockReturnValue({
      from: () => ({
        innerJoin: () => ({
          innerJoin: () => ({
            where: () => ({
              limit: () => Promise.resolve([]),
            }),
          }),
        }),
      }),
    });

    const deps = createMockDeps();
    const result = await cancelMeeting(deps, "missing", "sched-1");

    expect(result).toEqual({ ok: false, code: "NOT_FOUND" });
  });
});

describe("parseSlotsQuery", () => {
  it("parses valid query params", () => {
    const params = new URLSearchParams({
      duration: "30",
      from: "2026-06-01T00:00:00.000Z",
      to: "2026-06-08T00:00:00.000Z",
      tz: "America/New_York",
    });

    const result = parseSlotsQuery(params, [30, 60]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.params.durationMinutes).toBe(30);
      expect(result.params.viewerTimezone).toBe("America/New_York");
    }
  });

  it("rejects disallowed duration", () => {
    const params = new URLSearchParams({
      duration: "45",
      from: "2026-06-01T00:00:00.000Z",
      to: "2026-06-08T00:00:00.000Z",
      tz: "UTC",
    });

    const result = parseSlotsQuery(params, [30]);
    expect(result.ok).toBe(false);
  });
});

describe("slots cache", () => {
  beforeEach(() => {
    clearSlotsCache();
  });

  it("stores and retrieves cached slots", () => {
    const slots = [
      {
        startsAt: "2026-06-10T14:00:00.000Z",
        durationMinutes: 30,
        eligibleMemberCount: 1,
      },
    ];
    setCachedSlots("test-key", slots);
    expect(getCachedSlots("test-key")).toEqual(slots);
  });

  it("clearSlotsCacheForCalendar evicts only matching calendar", () => {
    const cal1Key = slotsCacheKey({
      scope: "public",
      calendarId: "cal-1",
      duration: 30,
      from: "2026-06-01T00:00:00.000Z",
      to: "2026-06-08T00:00:00.000Z",
      tz: "UTC",
    });
    const cal2Key = slotsCacheKey({
      scope: "public",
      calendarId: "cal-2",
      duration: 30,
      from: "2026-06-01T00:00:00.000Z",
      to: "2026-06-08T00:00:00.000Z",
      tz: "UTC",
    });
    const slot = {
      startsAt: "2026-06-10T14:00:00.000Z",
      durationMinutes: 30,
      eligibleMemberCount: 1,
    };
    setCachedSlots(cal1Key, [slot]);
    setCachedSlots(cal2Key, [slot]);

    clearSlotsCacheForCalendar("cal-1");

    expect(getCachedSlots(cal1Key)).toBeNull();
    expect(getCachedSlots(cal2Key)).toEqual([slot]);
  });
});

describe("public mappers", () => {
  it("maps calendar to public shape", () => {
    expect(toPublicCalendar(sampleBundle)).toEqual({
      name: "Engineering Panel",
      slug: "eng-panel",
      durations: [30, 60],
      bookingWindowDays: 14,
      minNoticeHours: 4,
    });
  });

  it("maps meeting to public shape", () => {
    expect(toPublicMeeting(insertedMeetingRow as never)).toEqual({
      startsAt: sampleBody.startsAt,
      durationMinutes: 30,
      subject: sampleBody.subject,
      meetLink: "https://meet.google.com/abc",
    });
  });
});
