import { and, eq, lte } from "drizzle-orm";
import { getDb, type AppDatabase } from "@/lib/db/client";
import {
  calendarMembers,
  emailSequenceSteps,
  emailSequences,
  meetings,
  scheduledTriggers,
} from "@/lib/db/schema";
import type { EventsPort } from "@/lib/ports/events";
import type { AppEventType } from "@/lib/types/platform";
import { createEventsStub } from "@/lib/stubs/events-stub";
import { applyManageUrlInjection, renderTemplate } from "./render-template";
import { sendEmail } from "./send";
import {
  EMAIL_STEP_TRIGGER_TYPE,
  loadCalendarManageUrlInjection,
} from "./sequences";

let dbOverride: AppDatabase | null = null;
let eventsOverride: EventsPort | null = null;

/** @internal test seam */
export function setEmailExecutorDbForTest(db: AppDatabase | null) {
  dbOverride = db;
}

/** @internal test seam */
export function setEmailExecutorEventsForTest(port: EventsPort | null) {
  eventsOverride = port;
}

function db() {
  return dbOverride ?? getDb();
}

function resolveEvents(): EventsPort {
  if (eventsOverride) {
    return eventsOverride;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("@/lib/events") as {
      createEventsPort?: () => EventsPort;
    };
    if (typeof mod.createEventsPort === "function") {
      return mod.createEventsPort();
    }
  } catch {
    // module not present
  }
  return createEventsStub();
}

type StepPayload = {
  sequenceId: string;
  stepId: string;
  meetingId: string;
  manageUrl?: string;
};

export async function executeEmailStep(
  trigger: {
    id: string;
    calendarId: string;
    meetingId: string;
    payload: StepPayload | null;
  },
  deps?: { events?: EventsPort },
): Promise<void> {
  const payload = trigger.payload;
  if (!payload?.stepId || !payload.sequenceId) {
    throw new Error("Invalid email step payload");
  }

  const [step] = await db()
    .select()
    .from(emailSequenceSteps)
    .where(eq(emailSequenceSteps.id, payload.stepId))
    .limit(1);

  if (!step) {
    throw new Error("Email sequence step not found");
  }

  const [sequence] = await db()
    .select()
    .from(emailSequences)
    .where(eq(emailSequences.id, payload.sequenceId))
    .limit(1);

  if (!sequence || !sequence.enabled) {
    return;
  }

  const [meeting] = await db()
    .select({
      id: meetings.id,
      calendarId: meetings.calendarId,
      startsAt: meetings.startsAt,
      guestEmail: meetings.guestEmail,
      assignedMemberId: meetings.assignedMemberId,
      cancelledAt: meetings.cancelledAt,
    })
    .from(meetings)
    .where(eq(meetings.id, trigger.meetingId))
    .limit(1);

  if (!meeting || !meeting.guestEmail) {
    return;
  }

  if (meeting.cancelledAt && sequence.triggerEvent !== "meeting.cancelled") {
    return;
  }

  const [member] = await db()
    .select({ email: calendarMembers.email })
    .from(calendarMembers)
    .where(eq(calendarMembers.id, meeting.assignedMemberId))
    .limit(1);

  const manageUrl = payload.manageUrl ?? "";
  const templateVars = {
    manageUrl,
    startsAt: meeting.startsAt,
    guestEmail: meeting.guestEmail,
    memberEmail: member?.email,
  };

  const events = deps?.events ?? resolveEvents();

  if (step.action === "send_email" || step.action === "both") {
    const injection = await loadCalendarManageUrlInjection(meeting.calendarId);
    const subject = renderTemplate(step.subjectTemplate ?? "Meeting reminder", templateVars);
    const body = applyManageUrlInjection(
      step.bodyTemplate ?? "",
      manageUrl,
      injection,
    );

    const result = await sendEmail({
      to: meeting.guestEmail,
      subject,
      body: renderTemplate(body, templateVars),
    });

    if (!result.ok) {
      throw new Error(result.error);
    }
  }

  if (step.action === "webhook" || step.action === "both") {
    await events.emit({
      calendarId: meeting.calendarId,
      eventType: sequence.triggerEvent as AppEventType,
      meetingId: meeting.id,
      payload: {
        meetingId: meeting.id,
        sequenceId: sequence.id,
        stepId: step.id,
        guestEmail: meeting.guestEmail,
        startsAt: meeting.startsAt,
      },
    });
  }
}

export async function processDueEmailSteps(
  deps?: { events?: EventsPort },
): Promise<number> {
  const now = new Date().toISOString();

  const due = await db()
    .select({
      id: scheduledTriggers.id,
      calendarId: scheduledTriggers.calendarId,
      meetingId: scheduledTriggers.meetingId,
      payload: scheduledTriggers.payload,
    })
    .from(scheduledTriggers)
    .where(
      and(
        eq(scheduledTriggers.triggerType, EMAIL_STEP_TRIGGER_TYPE),
        eq(scheduledTriggers.status, "pending"),
        lte(scheduledTriggers.fireAt, now),
      ),
    );

  for (const trigger of due) {
    await executeEmailStep(
      {
        ...trigger,
        payload: (trigger.payload as StepPayload | null) ?? null,
      },
      deps,
    );

    await db()
      .update(scheduledTriggers)
      .set({ status: "delivered" })
      .where(eq(scheduledTriggers.id, trigger.id));
  }

  return due.length;
}
