import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppDeps } from "@/lib/deps";
import { createPlatformDepsStub } from "@/lib/test/mock-platform-deps";
import type { CalendarBundle, Meeting } from "@/lib/types";
import { defaultCalendarSettings } from "@/lib/types/platform";
import { cancelMeetingByToken } from "./cancel-meeting-by-token";
import { rescheduleMeeting } from "./reschedule-meeting";

vi.mock("@/lib/booking/advance-assignment-state", () => ({
  advanceAssignmentState: vi.fn().mockResolvedValue(undefined),
}));

const FUTURE_START = "2027-06-10T14:00:00.000Z";
const NEW_START = "2027-06-12T15:00:00.000Z";

const sampleBundle: CalendarBundle = {
  id: "cal-1",
  schedulerId: "sched-1",
  name: "Engineering Panel",
  slug: "eng-panel",
  bookingWindowDays: 14,
  minNoticeHours: 0,
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
    {
      id: "m-2",
      calendarId: "cal-1",
      email: "member2@acme.com",
      displayName: "Member Two",
      maxPerDayOverride: null,
      maxPerWeekOverride: null,
      workingHoursOverride: null,
      timezone: null,
      sortOrder: 2,
      assignmentWeight: 100,
    },
  ],
};

const activeMeeting: Meeting = {
  id: "meet-1",
  calendarId: "cal-1",
  assignedMemberId: "m-1",
  startsAt: FUTURE_START,
  durationMinutes: 30,
  subject: "Panel interview",
  body: "Please join on time.",
  invitees: ["candidate@example.com"],
  googleEventId: "evt-123",
  meetLink: "https://meet.google.com/abc",
  bookedBy: "guest",
  guestEmail: "candidate@example.com",
  teamId: "team-1",
  bookingLinkId: null,
  cancelledAt: null,
  createdAt: "2026-06-03T12:00:00.000Z",
};

const mockSelectLimit = vi.fn();
const mockUpdateSet = vi.fn();
const mockUpdateWhere = vi.fn();

const mockLoadBundle = vi.fn();

vi.mock("@/lib/db/client", () => ({
  getDb: () => ({
    select: () => ({
      from: () => ({
        where: () => ({
          limit: mockSelectLimit,
        }),
        innerJoin: () => ({
          innerJoin: () => ({
            where: () => ({
              limit: mockSelectLimit,
            }),
          }),
        }),
      }),
    }),
    update: () => ({
      set: (values: unknown) => {
        mockUpdateSet(values);
        return { where: mockUpdateWhere };
      },
    }),
  }),
}));

vi.mock("@/lib/db/assemble-calendar-bundle", () => ({
  loadCalendarBundleByCalendarId: (...args: unknown[]) => mockLoadBundle(...args),
}));

function createMockDeps(overrides?: Partial<AppDeps>): AppDeps {
  const platform = createPlatformDepsStub();
  return {
    ...platform,
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
        googleEventId: "evt-new",
        meetLink: "https://meet.google.com/new",
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
    events: {
      ...platform.events,
      emit: vi.fn().mockResolvedValue(undefined),
      scheduleRelativeTriggers: vi.fn().mockResolvedValue(undefined),
    },
    salesforce: {
      ...platform.salesforce,
      syncFieldMap: vi.fn().mockResolvedValue({ ok: true }),
    },
    manageToken: {
      createForMeeting: vi.fn().mockResolvedValue({
        token: "new-token",
        manageUrl: "/manage/new-token",
      }),
      validate: vi.fn(),
      revokeForMeeting: vi.fn().mockResolvedValue(undefined),
    },
    ...overrides,
  };
}

function mockMeetingContext(
  meeting: Meeting = activeMeeting,
  settings = defaultCalendarSettings(),
) {
  mockSelectLimit.mockResolvedValueOnce([
    { meeting, organizerEmail: "scheduler@acme.com" },
  ]);
  mockLoadBundle.mockResolvedValue(sampleBundle);
  mockUpdateWhere.mockResolvedValue(undefined);

  if (settings !== defaultCalendarSettings()) {
    mockSelectLimit.mockResolvedValueOnce([{ settings }]);
  } else {
    mockSelectLimit.mockResolvedValueOnce([]);
  }
}

describe("rescheduleMeeting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(new Date("2027-06-01T12:00:00.000Z"));
  });

  it("keep_member passes assigned memberId to assignMember", async () => {
    mockMeetingContext(activeMeeting, {
      ...defaultCalendarSettings(),
      scheduling: {
        ...defaultCalendarSettings().scheduling,
        rescheduleAssignment: "keep_member",
      },
    });

    const deps = createMockDeps();
    const result = await rescheduleMeeting(deps, {
      meetingId: "meet-1",
      startsAt: NEW_START,
      durationMinutes: 30,
      viewerTimezone: "UTC",
    });

    expect(result.ok).toBe(true);
    expect(deps.slots.assignMember).toHaveBeenCalledWith(
      expect.objectContaining({
        memberId: "m-1",
        teamId: "team-1",
        startsAt: NEW_START,
      }),
    );
    expect(deps.manageToken.revokeForMeeting).toHaveBeenCalledWith("meet-1");
    expect(deps.manageToken.createForMeeting).toHaveBeenCalledWith("meet-1");
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        startsAt: NEW_START,
        assignedMemberId: "m-1",
        googleEventId: "evt-new",
      }),
    );
  });

  it("rerun_round_robin passes only teamId to assignMember", async () => {
    mockMeetingContext(activeMeeting, {
      ...defaultCalendarSettings(),
      scheduling: {
        ...defaultCalendarSettings().scheduling,
        rescheduleAssignment: "rerun_round_robin",
      },
    });

    const deps = createMockDeps();
    deps.slots.assignMember = vi.fn().mockResolvedValue({
      ok: true,
      member: sampleBundle.members[1],
      eligibleMembers: sampleBundle.members,
    });

    const result = await rescheduleMeeting(deps, {
      meetingId: "meet-1",
      startsAt: NEW_START,
      durationMinutes: 30,
      viewerTimezone: "UTC",
    });

    expect(result.ok).toBe(true);
    expect(deps.slots.assignMember).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: "team-1",
        startsAt: NEW_START,
      }),
    );
    const assignCall = vi.mocked(deps.slots.assignMember).mock.calls[0]![0];
    expect(assignCall.memberId).toBeUndefined();
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        assignedMemberId: "m-2",
      }),
    );
  });

  it("returns CANCELLED when meeting is cancelled", async () => {
    mockMeetingContext({ ...activeMeeting, cancelledAt: "2027-06-09T00:00:00.000Z" });

    const deps = createMockDeps();
    const result = await rescheduleMeeting(deps, {
      meetingId: "meet-1",
      startsAt: NEW_START,
      durationMinutes: 30,
      viewerTimezone: "UTC",
    });

    expect(result).toEqual({ ok: false, code: "CANCELLED" });
  });

  it("returns PAST when meeting already occurred", async () => {
    mockMeetingContext({
      ...activeMeeting,
      startsAt: "2026-01-01T10:00:00.000Z",
    });

    const deps = createMockDeps();
    const result = await rescheduleMeeting(deps, {
      meetingId: "meet-1",
      startsAt: NEW_START,
      durationMinutes: 30,
      viewerTimezone: "UTC",
    });

    expect(result).toEqual({ ok: false, code: "PAST" });
  });

  it("returns SLOT_UNAVAILABLE when assign fails", async () => {
    mockMeetingContext();

    const deps = createMockDeps();
    deps.slots.assignMember = vi
      .fn()
      .mockResolvedValue({ ok: false, code: "SLOT_UNAVAILABLE" });

    const result = await rescheduleMeeting(deps, {
      meetingId: "meet-1",
      startsAt: NEW_START,
      durationMinutes: 30,
      viewerTimezone: "UTC",
    });

    expect(result).toEqual({ ok: false, code: "SLOT_UNAVAILABLE" });
  });

  it("emits meeting.rescheduled and syncs salesforce on success", async () => {
    mockMeetingContext();

    const deps = createMockDeps();
    const result = await rescheduleMeeting(deps, {
      meetingId: "meet-1",
      startsAt: NEW_START,
      durationMinutes: 30,
      viewerTimezone: "UTC",
    });

    expect(result.ok).toBe(true);
    expect(deps.events.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "meeting.rescheduled",
        meetingId: "meet-1",
      }),
    );
    expect(deps.salesforce.syncFieldMap).toHaveBeenCalledWith(
      "cal-1",
      "reschedule",
      expect.objectContaining({ meetingId: "meet-1" }),
    );
  });
});

describe("cancelMeetingByToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(new Date("2027-06-01T12:00:00.000Z"));
  });

  it("sets cancelledAt instead of deleting the meeting row", async () => {
    const deps = createMockDeps();
    deps.manageToken.validate = vi.fn().mockResolvedValue({
      ok: true,
      meetingId: "meet-1",
    });
    mockMeetingContext();

    const result = await cancelMeetingByToken(deps, { token: "valid-token" });

    expect(result).toEqual({ ok: true });
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        cancelledAt: expect.any(String),
      }),
    );
    expect(deps.google.deleteEvent).toHaveBeenCalledWith(
      "scheduler@acme.com",
      "evt-123",
    );
    expect(deps.manageToken.revokeForMeeting).toHaveBeenCalledWith("meet-1");
    expect(deps.events.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "meeting.cancelled",
        meetingId: "meet-1",
      }),
    );
  });

  it("returns INVALID_TOKEN for unknown token", async () => {
    const deps = createMockDeps();
    deps.manageToken.validate = vi
      .fn()
      .mockResolvedValue({ ok: false, code: "INVALID" });

    const result = await cancelMeetingByToken(deps, { token: "bad" });

    expect(result).toEqual({ ok: false, code: "INVALID_TOKEN" });
  });

  it("returns INVALID_TOKEN for expired token", async () => {
    const deps = createMockDeps();
    deps.manageToken.validate = vi
      .fn()
      .mockResolvedValue({ ok: false, code: "EXPIRED" });

    const result = await cancelMeetingByToken(deps, { token: "expired" });

    expect(result).toEqual({ ok: false, code: "INVALID_TOKEN" });
  });
});
