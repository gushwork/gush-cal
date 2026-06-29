import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CalendarSettings } from "@/lib/types/platform";
import { defaultCalendarSettings } from "@/lib/types/platform";
import { createEmailPort } from "./index";
import {
  processDueEmailSteps,
  setEmailExecutorDbForTest,
  setEmailExecutorEventsForTest,
} from "./executor";
import {
  applyManageUrlInjection,
  EMAIL_FOOTER_LINE,
  renderTemplate,
} from "./render-template";
import { sendEmail, setEmailSendForTest } from "./send";
import {
  createSequence,
  createSequenceStep,
  deleteSequence,
  cancelPendingEmailSteps,
  computeStepFireAt,
  enqueueSequenceForMeeting,
  isAppEventType,
  listSequenceSteps,
  listSequences,
  replaceSequenceSteps,
  SequenceValidationError,
  setEmailDbForTest,
  setEmailManageTokenForTest,
  updateSequence,
} from "./sequences";
import { createEmailTestDb } from "./test-db";

const CALENDAR_ID = "cal-1";
const MEETING_ID = "meet-1";
const MEMBER_ID = "mem-1";
const SEQUENCE_ID = "seq-1";
const STEP_ID = "step-1";
const MANAGE_URL = "https://app.example.com/manage/token-abc";
const STARTS_AT = "2026-06-10T14:00:00.000Z";

let testDb: ReturnType<typeof createEmailTestDb>;
const mockEmit = vi.fn();
const mockSend = vi.fn();

function seedMeeting(
  store: ReturnType<typeof createEmailTestDb>["store"],
  overrides: Partial<{
    guestEmail: string | null;
    cancelledAt: string | null;
  }> = {},
) {
  store.meetings.push({
    id: MEETING_ID,
    calendarId: CALENDAR_ID,
    assignedMemberId: MEMBER_ID,
    startsAt: STARTS_AT,
    guestEmail: "guest@example.com",
    cancelledAt: null,
    ...overrides,
  });
  store.members.push({
    id: MEMBER_ID,
    calendarId: CALENDAR_ID,
    email: "member@example.com",
  });
}

function seedSettings(
  store: ReturnType<typeof createEmailTestDb>["store"],
  manageUrlInjection: CalendarSettings["manageUrlInjection"] = "auto_inject",
) {
  const settings: CalendarSettings = {
    ...defaultCalendarSettings(),
    manageUrlInjection,
  };
  store.settings.push({ calendarId: CALENDAR_ID, settings });
}

beforeEach(() => {
  vi.clearAllMocks();
  testDb = createEmailTestDb();
  // Stub db has no transaction(); run the callback against the same db so
  // replaceSequenceSteps works. Rollback-specific tests override this.
  (testDb.db as unknown as {
    transaction: <T>(fn: (tx: typeof testDb.db) => Promise<T>) => Promise<T>;
  }).transaction = (fn) => fn(testDb.db);
  setEmailDbForTest(testDb.db as never);
  setEmailExecutorDbForTest(testDb.db as never);
  setEmailManageTokenForTest({
    async createForMeeting() {
      return { token: "token-abc", manageUrl: MANAGE_URL };
    },
    async validate() {
      return { ok: false, code: "INVALID" };
    },
    async revokeForMeeting() {},
  });
  setEmailExecutorEventsForTest({ emit: mockEmit, scheduleRelativeTriggers: vi.fn() });
  setEmailSendForTest(mockSend.mockResolvedValue({ ok: true }));
  process.env.EMAIL_PROVIDER = "mock";
});

describe("render-template", () => {
  it("replaces merge fields including manageUrl", () => {
    const result = renderTemplate(
      "Hi {{guestEmail}}, meet {{memberEmail}} at {{startsAt}}. {{manageUrl}}",
      {
        guestEmail: "guest@example.com",
        memberEmail: "member@example.com",
        startsAt: STARTS_AT,
        manageUrl: MANAGE_URL,
      },
    );
    expect(result).toContain("guest@example.com");
    expect(result).toContain("member@example.com");
    expect(result).toContain(STARTS_AT);
    expect(result).toContain(MANAGE_URL);
  });

  it("auto_injects manageUrl footer when missing from template", () => {
    const body = applyManageUrlInjection(
      "Thanks for booking!",
      MANAGE_URL,
      "auto_inject",
    );
    expect(body).toContain("Thanks for booking!");
    expect(body).toContain(MANAGE_URL);
    expect(body).toContain(EMAIL_FOOTER_LINE.replace("{{manageUrl}}", "").trim());
  });

  it("does not auto-inject when template_opt_in", () => {
    const body = applyManageUrlInjection(
      "Thanks for booking!",
      MANAGE_URL,
      "template_opt_in",
    );
    expect(body).toBe("Thanks for booking!");
  });

  it("does not duplicate footer when manageUrl already in template", () => {
    const body = applyManageUrlInjection(
      "Link: {{manageUrl}}",
      MANAGE_URL,
      "auto_inject",
    );
    expect(body).toBe(`Link: ${MANAGE_URL}`);
  });
});

describe("sequence CRUD", () => {
  it("creates, lists, updates, and deletes sequences", async () => {
    const created = await createSequence(CALENDAR_ID, {
      name: "Welcome",
      triggerEvent: "meeting.booked",
    });
    expect(created.name).toBe("Welcome");
    expect(created.enabled).toBe(true);

    const listed = await listSequences(CALENDAR_ID);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe(created.id);

    const updated = await updateSequence(CALENDAR_ID, created.id, {
      name: "Welcome v2",
      enabled: false,
    });
    expect(updated?.name).toBe("Welcome v2");
    expect(updated?.enabled).toBe(false);

    const deleted = await deleteSequence(CALENDAR_ID, created.id);
    expect(deleted).toBe(true);
    expect(await listSequences(CALENDAR_ID)).toHaveLength(0);
  });

  it("manages steps via create and replace", async () => {
    const sequence = await createSequence(CALENDAR_ID, {
      name: "Drip",
      triggerEvent: "meeting.booked",
    });

    const step = await createSequenceStep(CALENDAR_ID, sequence.id, {
      order: 1,
      delayMinutes: 60,
      action: "send_email",
      subjectTemplate: "Reminder",
      bodyTemplate: "See {{manageUrl}}",
    });
    expect(step?.order).toBe(1);

    const steps = await listSequenceSteps(CALENDAR_ID, sequence.id);
    expect(steps).toHaveLength(1);

    const replaced = await replaceSequenceSteps(CALENDAR_ID, sequence.id, [
      {
        order: 1,
        delayMinutes: 0,
        action: "both",
        subjectTemplate: "Hi",
        bodyTemplate: "Body",
      },
      {
        order: 2,
        delayMinutes: 1440,
        action: "webhook",
      },
    ]);
    expect(replaced).toHaveLength(2);
    expect(replaced?.[1]?.action).toBe("webhook");
  });

  it("BUG-026/027: isAppEventType accepts known events, rejects junk", () => {
    expect(isAppEventType("meeting.booked")).toBe(true);
    expect(isAppEventType("routing.owner_overflow")).toBe(true);
    expect(isAppEventType("not.a.real.event")).toBe(false);
    expect(isAppEventType("")).toBe(false);
    expect(isAppEventType(undefined)).toBe(false);
    expect(isAppEventType(42)).toBe(false);
  });

  it("BUG-053: rejects duplicate stepOrder in a replace payload", async () => {
    const sequence = await createSequence(CALENDAR_ID, {
      name: "Dup",
      triggerEvent: "meeting.booked",
    });
    await expect(
      replaceSequenceSteps(CALENDAR_ID, sequence.id, [
        { order: 1, delayMinutes: 0, action: "webhook" },
        { order: 1, delayMinutes: 5, action: "webhook" },
      ]),
    ).rejects.toBeInstanceOf(SequenceValidationError);
  });

  it("BUG-054: empty patch is a no-op returning the existing sequence", async () => {
    const sequence = await createSequence(CALENDAR_ID, {
      name: "NoOp",
      triggerEvent: "meeting.booked",
    });
    // update() must not run for an empty patch (postgres errors on .set({})).
    const guarded = {
      ...(testDb.db as Record<string, unknown>),
      update: () => {
        throw new Error("update should not run for an empty patch");
      },
    };
    setEmailDbForTest(guarded as never);

    const result = await updateSequence(CALENDAR_ID, sequence.id, {});
    expect(result?.id).toBe(sequence.id);
    expect(result?.name).toBe("NoOp");
  });

  it("BUG-028: failed insert rolls back the step delete", async () => {
    const sequence = await createSequence(CALENDAR_ID, {
      name: "Tx",
      triggerEvent: "meeting.booked",
    });
    await createSequenceStep(CALENDAR_ID, sequence.id, {
      order: 1,
      delayMinutes: 0,
      action: "webhook",
    });

    const base = testDb.db as Record<string, unknown>;
    const txDb = {
      ...base,
      insert: () => ({
        values: () => ({
          returning: async () => {
            throw new Error("insert boom");
          },
        }),
      }),
      transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
        const snapshot = testDb.store.steps.map((s) => ({ ...s }));
        try {
          return await fn(txDb);
        } catch (error) {
          testDb.store.steps = snapshot;
          throw error;
        }
      },
    };
    setEmailDbForTest(txDb as never);

    await expect(
      replaceSequenceSteps(CALENDAR_ID, sequence.id, [
        { order: 1, delayMinutes: 0, action: "webhook" },
      ]),
    ).rejects.toThrow("insert boom");

    setEmailDbForTest(testDb.db as never);
    expect(await listSequenceSteps(CALENDAR_ID, sequence.id)).toHaveLength(1);
  });
});

describe("enqueueSequenceForMeeting", () => {
  it("schedules steps for enabled sequences matching trigger", async () => {
    seedMeeting(testDb.store);
    testDb.store.sequences.push({
      id: SEQUENCE_ID,
      calendarId: CALENDAR_ID,
      name: "Booked",
      enabled: true,
      triggerEvent: "meeting.booked",
    });
    testDb.store.steps.push({
      id: STEP_ID,
      sequenceId: SEQUENCE_ID,
      stepOrder: 1,
      delayMinutes: 30,
      timingAnchor: "after_booking",
      action: "send_email",
      subjectTemplate: "Hi",
      bodyTemplate: "Body",
    });

    await enqueueSequenceForMeeting(MEETING_ID, "meeting.booked");

    expect(testDb.store.triggers).toHaveLength(1);
    expect(testDb.store.triggers[0]?.triggerType).toBe("email.step");
    expect(testDb.store.triggers[0]?.payload).toMatchObject({
      sequenceId: SEQUENCE_ID,
      stepId: STEP_ID,
      meetingId: MEETING_ID,
      manageUrl: MANAGE_URL,
    });
  });

  it("skips disabled sequences", async () => {
    seedMeeting(testDb.store);
    testDb.store.sequences.push({
      id: SEQUENCE_ID,
      calendarId: CALENDAR_ID,
      name: "Off",
      enabled: false,
      triggerEvent: "meeting.booked",
    });

    await enqueueSequenceForMeeting(MEETING_ID, "meeting.booked");
    expect(testDb.store.triggers).toHaveLength(0);
  });

  it("schedules before_meeting steps relative to meeting start", async () => {
    seedMeeting(testDb.store);
    testDb.store.sequences.push({
      id: SEQUENCE_ID,
      calendarId: CALENDAR_ID,
      name: "Reminder",
      enabled: true,
      triggerEvent: "meeting.booked",
    });
    testDb.store.steps.push({
      id: STEP_ID,
      sequenceId: SEQUENCE_ID,
      stepOrder: 1,
      delayMinutes: 60,
      timingAnchor: "before_meeting",
      action: "send_email",
      subjectTemplate: "Hi",
      bodyTemplate: "Body",
    });

    await enqueueSequenceForMeeting(MEETING_ID, "meeting.booked");

    expect(testDb.store.triggers).toHaveLength(1);
    expect(testDb.store.triggers[0]?.fireAt).toBe(
      computeStepFireAt(
        "before_meeting",
        60,
        "2026-06-09T12:00:00.000Z",
        STARTS_AT,
      ),
    );
  });
});

describe("executor", () => {
  it("sends email on due schedule with rendered manageUrl", async () => {
    seedMeeting(testDb.store);
    seedSettings(testDb.store);
    testDb.store.sequences.push({
      id: SEQUENCE_ID,
      calendarId: CALENDAR_ID,
      name: "Booked",
      enabled: true,
      triggerEvent: "meeting.booked",
    });
    testDb.store.steps.push({
      id: STEP_ID,
      sequenceId: SEQUENCE_ID,
      stepOrder: 1,
      delayMinutes: 0,
      timingAnchor: "after_booking",
      action: "send_email",
      subjectTemplate: "Hi {{guestEmail}}",
      bodyTemplate: "Your meeting is at {{startsAt}}",
    });
    testDb.store.triggers.push({
      id: "trig-1",
      calendarId: CALENDAR_ID,
      meetingId: MEETING_ID,
      triggerType: "email.step",
      fireAt: "2020-01-01T00:00:00.000Z",
      status: "pending",
      payload: {
        sequenceId: SEQUENCE_ID,
        stepId: STEP_ID,
        meetingId: MEETING_ID,
        manageUrl: MANAGE_URL,
      },
    });

    const processed = await processDueEmailSteps();
    expect(processed).toBe(1);
    expect(mockSend).toHaveBeenCalledWith({
      to: "guest@example.com",
      subject: "Hi guest@example.com",
      body: expect.stringContaining(STARTS_AT),
    });
    expect(mockSend.mock.calls[0]?.[0].body).toContain(MANAGE_URL);
    expect(testDb.store.triggers[0]?.status).toBe("delivered");
  });

  it("emits webhook for webhook action", async () => {
    seedMeeting(testDb.store);
    testDb.store.sequences.push({
      id: SEQUENCE_ID,
      calendarId: CALENDAR_ID,
      name: "Hook",
      enabled: true,
      triggerEvent: "meeting.booked",
    });
    testDb.store.steps.push({
      id: STEP_ID,
      sequenceId: SEQUENCE_ID,
      stepOrder: 1,
      delayMinutes: 0,
      timingAnchor: "after_booking",
      action: "webhook",
      subjectTemplate: null,
      bodyTemplate: null,
    });
    testDb.store.triggers.push({
      id: "trig-2",
      calendarId: CALENDAR_ID,
      meetingId: MEETING_ID,
      triggerType: "email.step",
      fireAt: "2020-01-01T00:00:00.000Z",
      status: "pending",
      payload: {
        sequenceId: SEQUENCE_ID,
        stepId: STEP_ID,
        meetingId: MEETING_ID,
      },
    });

    await processDueEmailSteps();
    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "meeting.booked",
        meetingId: MEETING_ID,
      }),
    );
    expect(mockSend).not.toHaveBeenCalled();
  });
});

describe("createEmailPort", () => {
  it("exposes enqueueSequenceForMeeting and renderManageUrl", async () => {
    seedMeeting(testDb.store);
    const port = createEmailPort();

    const url = await port.renderManageUrl(MEETING_ID);
    expect(url).toBe(MANAGE_URL);

    testDb.store.sequences.push({
      id: SEQUENCE_ID,
      calendarId: CALENDAR_ID,
      name: "Booked",
      enabled: true,
      triggerEvent: "meeting.booked",
    });
    testDb.store.steps.push({
      id: STEP_ID,
      sequenceId: SEQUENCE_ID,
      stepOrder: 1,
      delayMinutes: 0,
      timingAnchor: "after_booking",
      action: "send_email",
      subjectTemplate: "S",
      bodyTemplate: "B",
    });

    await port.enqueueSequenceForMeeting(MEETING_ID, "meeting.booked");
    expect(testDb.store.triggers).toHaveLength(1);
  });
});

describe("sendEmail", () => {
  it("throws when EMAIL_PROVIDER is missing", async () => {
    setEmailSendForTest(null);
    const prev = process.env.EMAIL_PROVIDER;
    delete process.env.EMAIL_PROVIDER;
    await expect(
      sendEmail({ to: "a@b.com", subject: "s", body: "b" }),
    ).rejects.toThrow(/EMAIL_PROVIDER/);
    process.env.EMAIL_PROVIDER = prev;
    setEmailSendForTest(mockSend.mockResolvedValue({ ok: true }));
  });
});
