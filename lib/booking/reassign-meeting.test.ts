import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppDeps } from "@/lib/deps";
import { createPlatformDepsStub } from "@/lib/test/mock-platform-deps";
import type { CalendarBundle, Meeting } from "@/lib/types";
import { reassignMeeting } from "./reassign-meeting";

vi.mock("@/lib/scheduling/load-scheduling-settings", () => ({
  loadCalendarSchedulingSettings: vi.fn().mockResolvedValue({
    assignmentMode: "load_balanced_round_robin",
    teamSelectionMode: "url_with_default",
    defaultTeamId: null,
    rescheduleAssignment: "keep_member",
    strictRotation: {},
    weightedDeficits: {},
  }),
}));

const FUTURE_START = "2027-06-10T14:00:00.000Z";

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

const mockLoadMeetingForScheduler = vi.fn();
const mockLoadBundle = vi.fn();
const mockUpdateSet = vi.fn();
const mockUpdateWhere = vi.fn();

vi.mock("./cancel-meeting", () => ({
  loadMeetingForScheduler: (...args: unknown[]) =>
    mockLoadMeetingForScheduler(...args),
}));

vi.mock("@/lib/db/client", () => ({
  getDb: () => ({
    update: () => ({
      set: (values: unknown) => {
        mockUpdateSet(values);
        return { where: mockUpdateWhere };
      },
    }),
  }),
}));

vi.mock("@/lib/db/assemble-calendar-bundle", () => ({
  loadCalendarBundleByCalendarId: (...args: unknown[]) =>
    mockLoadBundle(...args),
}));

function createMockDeps(overrides?: Partial<AppDeps>): AppDeps {
  const platform = createPlatformDepsStub();
  return {
    ...platform,
    slots: {
      getAvailableSlots: vi.fn(),
      assignMember: vi.fn().mockResolvedValue({
        ok: true,
        member: sampleBundle.members[1],
        eligibleMembers: sampleBundle.members,
      }),
    },
    google: {
      queryFreeBusy: vi.fn(),
      createMeetingEvent: vi.fn().mockResolvedValue({
        ok: true,
        googleEventId: "evt-reassigned",
        meetLink: "https://meet.google.com/reassigned",
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

function mockSchedulerMeeting(meeting: Meeting = activeMeeting) {
  mockLoadMeetingForScheduler.mockResolvedValue({
    meeting,
    organizerEmail: "scheduler@acme.com",
  });
  mockLoadBundle.mockResolvedValue(sampleBundle);
  mockUpdateWhere.mockResolvedValue(undefined);
}

describe("reassignMeeting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(new Date("2027-06-01T12:00:00.000Z"));
  });

  it("reassigns to eligible member and updates Google attendees", async () => {
    mockSchedulerMeeting();

    const deps = createMockDeps();
    const result = await reassignMeeting(deps, {
      meetingId: "meet-1",
      schedulerId: "sched-1",
      newMemberId: "m-2",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.meeting.assignedMemberId).toBe("m-2");
    expect(deps.slots.assignMember).toHaveBeenCalledWith(
      expect.objectContaining({
        memberId: "m-2",
        startsAt: FUTURE_START,
        durationMinutes: 30,
      }),
    );
    expect(deps.google.deleteEvent).toHaveBeenCalledWith(
      "scheduler@acme.com",
      "evt-123",
    );
    expect(deps.google.createMeetingEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        organizerEmail: "scheduler@acme.com",
        startsAt: FUTURE_START,
        attendeeEmails: expect.arrayContaining([
          "member2@acme.com",
          "candidate@example.com",
        ]),
      }),
    );
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        assignedMemberId: "m-2",
        googleEventId: "evt-reassigned",
        meetLink: "https://meet.google.com/reassigned",
      }),
    );
    expect(deps.manageToken.revokeForMeeting).toHaveBeenCalledWith("meet-1");
    expect(deps.manageToken.createForMeeting).toHaveBeenCalledWith("meet-1");
  });

  it("returns MEMBER_INELIGIBLE when target member cannot take the slot", async () => {
    mockSchedulerMeeting();

    const deps = createMockDeps();
    deps.slots.assignMember = vi
      .fn()
      .mockResolvedValue({ ok: false, code: "SLOT_UNAVAILABLE" });

    const result = await reassignMeeting(deps, {
      meetingId: "meet-1",
      schedulerId: "sched-1",
      newMemberId: "m-2",
    });

    expect(result).toEqual({ ok: false, code: "MEMBER_INELIGIBLE" });
    expect(deps.google.deleteEvent).not.toHaveBeenCalled();
    expect(deps.google.createMeetingEvent).not.toHaveBeenCalled();
  });

  it("returns NOT_FOUND when meeting is missing or not owned by scheduler", async () => {
    mockLoadMeetingForScheduler.mockResolvedValue(null);

    const deps = createMockDeps();
    const result = await reassignMeeting(deps, {
      meetingId: "missing",
      schedulerId: "sched-1",
      newMemberId: "m-2",
    });

    expect(result).toEqual({ ok: false, code: "NOT_FOUND" });
  });

  it("returns CANCELLED for cancelled meetings", async () => {
    mockSchedulerMeeting({
      ...activeMeeting,
      cancelledAt: "2027-06-09T00:00:00.000Z",
    });

    const deps = createMockDeps();
    const result = await reassignMeeting(deps, {
      meetingId: "meet-1",
      schedulerId: "sched-1",
      newMemberId: "m-2",
    });

    expect(result).toEqual({ ok: false, code: "CANCELLED" });
  });

  it("returns PAST for meetings that already occurred", async () => {
    mockSchedulerMeeting({
      ...activeMeeting,
      startsAt: "2026-01-01T10:00:00.000Z",
    });

    const deps = createMockDeps();
    const result = await reassignMeeting(deps, {
      meetingId: "meet-1",
      schedulerId: "sched-1",
      newMemberId: "m-2",
    });

    expect(result).toEqual({ ok: false, code: "PAST" });
  });

  it("returns GOOGLE_ERROR when creating the new event fails, leaving old event + DB intact", async () => {
    mockSchedulerMeeting();

    const deps = createMockDeps();
    deps.google.createMeetingEvent = vi
      .fn()
      .mockResolvedValue({ ok: false, code: "calendar_error" });

    const result = await reassignMeeting(deps, {
      meetingId: "meet-1",
      schedulerId: "sched-1",
      newMemberId: "m-2",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.code).toBe("GOOGLE_ERROR");
    // BUG-045: old event must NOT be deleted and DB untouched on create failure.
    expect(deps.google.deleteEvent).not.toHaveBeenCalled();
    expect(mockUpdateSet).not.toHaveBeenCalled();
  });

  it("treats old-event delete as best-effort (succeeds even if delete fails)", async () => {
    mockSchedulerMeeting();

    const deps = createMockDeps();
    deps.google.deleteEvent = vi
      .fn()
      .mockRejectedValue(new Error("Insufficient Permission"));

    const result = await reassignMeeting(deps, {
      meetingId: "meet-1",
      schedulerId: "sched-1",
      newMemberId: "m-2",
    });

    expect(result.ok).toBe(true);
    expect(deps.google.createMeetingEvent).toHaveBeenCalled();
    expect(mockUpdateSet).toHaveBeenCalled();
    expect(deps.google.deleteEvent).toHaveBeenCalledWith(
      "scheduler@acme.com",
      "evt-123",
    );
  });

  it("BUG-046: same-member reassign is a no-op (no Google churn, no token rotation)", async () => {
    mockSchedulerMeeting();

    const deps = createMockDeps();
    const emailSpy = vi.spyOn(deps.email, "enqueueSequenceForMeeting");

    const result = await reassignMeeting(deps, {
      meetingId: "meet-1",
      schedulerId: "sched-1",
      newMemberId: "m-1",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.meeting.assignedMemberId).toBe("m-1");
    expect(deps.slots.assignMember).not.toHaveBeenCalled();
    expect(deps.google.createMeetingEvent).not.toHaveBeenCalled();
    expect(deps.google.deleteEvent).not.toHaveBeenCalled();
    expect(mockUpdateSet).not.toHaveBeenCalled();
    expect(deps.manageToken.revokeForMeeting).not.toHaveBeenCalled();
    expect(deps.manageToken.createForMeeting).not.toHaveBeenCalled();
    expect(emailSpy).not.toHaveBeenCalled();
  });

  it("emits meeting.reassigned and syncs salesforce on success", async () => {
    mockSchedulerMeeting();

    const deps = createMockDeps();
    const result = await reassignMeeting(deps, {
      meetingId: "meet-1",
      schedulerId: "sched-1",
      newMemberId: "m-2",
    });

    expect(result.ok).toBe(true);
    expect(deps.events.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "meeting.reassigned",
        meetingId: "meet-1",
        payload: {
          meetingId: "meet-1",
          oldMemberId: "m-1",
          newMemberId: "m-2",
        },
      }),
    );
    expect(deps.salesforce.syncFieldMap).toHaveBeenCalledWith(
      "cal-1",
      "reassign",
      expect.objectContaining({
        meetingId: "meet-1",
        memberEmail: "member2@acme.com",
        oldMemberId: "m-1",
        newMemberId: "m-2",
      }),
    );
  });
});
