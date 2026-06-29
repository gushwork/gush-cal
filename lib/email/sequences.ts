import { and, asc, eq } from "drizzle-orm";
import { getDb, type AppDatabase } from "@/lib/db/client";
import {
  calendarSettings,
  emailSequenceSteps,
  emailSequences,
  meetings,
  scheduledTriggers,
} from "@/lib/db/schema";
import type { ManageTokenPort } from "@/lib/ports/manage-token";
import type {
  AppEventType,
  EmailSequence,
  EmailSequenceStep,
  SequenceStepAction,
  SequenceTimingAnchor,
} from "@/lib/types/platform";
import { defaultCalendarSettings } from "@/lib/types/platform";
import { createManageTokenStub } from "@/lib/stubs/manage-token-stub";

export const EMAIL_STEP_TRIGGER_TYPE = "email.step";

const APP_EVENT_TYPES = new Set<AppEventType>([
  "meeting.booked",
  "meeting.cancelled",
  "meeting.rescheduled",
  "meeting.reassigned",
  "meeting.before",
  "meeting.after",
  "salesforce.sync_succeeded",
  "salesforce.sync_failed",
  "booking.duplicate_blocked",
  "routing.owner_overflow",
]);

export function isAppEventType(value: unknown): value is AppEventType {
  return typeof value === "string" && APP_EVENT_TYPES.has(value as AppEventType);
}

/** Bad request from sequence input; routes map this to a 400. */
export class SequenceValidationError extends Error {}

export type MeetingSequenceTrigger =
  | "meeting.booked"
  | "meeting.cancelled"
  | "meeting.rescheduled"
  | "meeting.reassigned";

let dbOverride: AppDatabase | null = null;
let manageTokenOverride: ManageTokenPort | null = null;

/** @internal test seam */
export function setEmailDbForTest(db: AppDatabase | null) {
  dbOverride = db;
}

/** @internal test seam */
export function setEmailManageTokenForTest(port: ManageTokenPort | null) {
  manageTokenOverride = port;
}

function db() {
  return dbOverride ?? getDb();
}

function resolveManageToken(): ManageTokenPort {
  if (manageTokenOverride) {
    return manageTokenOverride;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("@/lib/meeting-tokens") as {
      createManageTokenPort?: () => ManageTokenPort;
    };
    if (typeof mod.createManageTokenPort === "function") {
      return mod.createManageTokenPort();
    }
  } catch {
    // module not present
  }
  return createManageTokenStub();
}

function toSequence(row: typeof emailSequences.$inferSelect): EmailSequence {
  return {
    id: row.id,
    calendarId: row.calendarId,
    name: row.name,
    enabled: row.enabled,
    triggerEvent: row.triggerEvent as AppEventType,
  };
}

function toStep(row: typeof emailSequenceSteps.$inferSelect): EmailSequenceStep {
  return {
    id: row.id,
    sequenceId: row.sequenceId,
    order: row.stepOrder,
    delayMinutes: row.delayMinutes,
    timingAnchor: row.timingAnchor,
    action: row.action,
    ...(row.subjectTemplate ? { subjectTemplate: row.subjectTemplate } : {}),
    ...(row.bodyTemplate ? { bodyTemplate: row.bodyTemplate } : {}),
  };
}

function computeFireAt(baseIso: string, delayMinutes: number): string {
  const date = new Date(baseIso);
  date.setUTCMinutes(date.getUTCMinutes() + delayMinutes);
  return date.toISOString();
}

export function computeStepFireAt(
  anchor: SequenceTimingAnchor,
  delayMinutes: number,
  bookingTime: string,
  meetingStartsAt: string,
): string {
  switch (anchor) {
    case "after_booking":
      return computeFireAt(bookingTime, delayMinutes);
    case "before_meeting":
      return computeFireAt(meetingStartsAt, -delayMinutes);
    case "after_meeting":
      return computeFireAt(meetingStartsAt, delayMinutes);
  }
}

export type CreateSequenceInput = {
  name: string;
  enabled?: boolean;
  triggerEvent: AppEventType;
};

export type UpdateSequenceInput = {
  name?: string;
  enabled?: boolean;
  triggerEvent?: AppEventType;
};

export type CreateStepInput = {
  order: number;
  delayMinutes: number;
  timingAnchor?: SequenceTimingAnchor;
  action: SequenceStepAction;
  subjectTemplate?: string;
  bodyTemplate?: string;
};

export type UpdateStepInput = Partial<CreateStepInput>;

export async function listSequences(calendarId: string): Promise<EmailSequence[]> {
  const rows = await db()
    .select()
    .from(emailSequences)
    .where(eq(emailSequences.calendarId, calendarId))
    .orderBy(asc(emailSequences.name));

  return rows.map(toSequence);
}

export async function getSequence(
  calendarId: string,
  sequenceId: string,
): Promise<EmailSequence | null> {
  const [row] = await db()
    .select()
    .from(emailSequences)
    .where(
      and(
        eq(emailSequences.id, sequenceId),
        eq(emailSequences.calendarId, calendarId),
      ),
    )
    .limit(1);

  return row ? toSequence(row) : null;
}

export async function createSequence(
  calendarId: string,
  input: CreateSequenceInput,
): Promise<EmailSequence> {
  const [row] = await db()
    .insert(emailSequences)
    .values({
      calendarId,
      name: input.name,
      enabled: input.enabled ?? true,
      triggerEvent: input.triggerEvent,
    })
    .returning();

  if (!row) {
    throw new Error("Failed to create sequence");
  }
  return toSequence(row);
}

export async function updateSequence(
  calendarId: string,
  sequenceId: string,
  input: UpdateSequenceInput,
): Promise<EmailSequence | null> {
  const patch = {
    ...(input.name != null ? { name: input.name } : {}),
    ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
    ...(input.triggerEvent != null ? { triggerEvent: input.triggerEvent } : {}),
  };

  // BUG-054: empty .set({}) errors in postgres — no-op returns current row.
  if (Object.keys(patch).length === 0) {
    return getSequence(calendarId, sequenceId);
  }

  const [row] = await db()
    .update(emailSequences)
    .set(patch)
    .where(
      and(
        eq(emailSequences.id, sequenceId),
        eq(emailSequences.calendarId, calendarId),
      ),
    )
    .returning();

  return row ? toSequence(row) : null;
}

export async function deleteSequence(
  calendarId: string,
  sequenceId: string,
): Promise<boolean> {
  const deleted = await db()
    .delete(emailSequences)
    .where(
      and(
        eq(emailSequences.id, sequenceId),
        eq(emailSequences.calendarId, calendarId),
      ),
    )
    .returning({ id: emailSequences.id });

  return deleted.length > 0;
}

export async function listSequenceSteps(
  calendarId: string,
  sequenceId: string,
): Promise<EmailSequenceStep[] | null> {
  const sequence = await getSequence(calendarId, sequenceId);
  if (!sequence) {
    return null;
  }

  const rows = await db()
    .select()
    .from(emailSequenceSteps)
    .where(eq(emailSequenceSteps.sequenceId, sequenceId))
    .orderBy(asc(emailSequenceSteps.stepOrder));

  return rows.map(toStep);
}

export async function createSequenceStep(
  calendarId: string,
  sequenceId: string,
  input: CreateStepInput,
): Promise<EmailSequenceStep | null> {
  const sequence = await getSequence(calendarId, sequenceId);
  if (!sequence) {
    return null;
  }

  const [row] = await db()
    .insert(emailSequenceSteps)
    .values({
      sequenceId,
      stepOrder: input.order,
      delayMinutes: input.delayMinutes,
      timingAnchor: input.timingAnchor ?? "after_booking",
      action: input.action,
      subjectTemplate: input.subjectTemplate ?? null,
      bodyTemplate: input.bodyTemplate ?? null,
    })
    .returning();

  return row ? toStep(row) : null;
}

export async function updateSequenceStep(
  calendarId: string,
  sequenceId: string,
  stepId: string,
  input: UpdateStepInput,
): Promise<EmailSequenceStep | null> {
  const sequence = await getSequence(calendarId, sequenceId);
  if (!sequence) {
    return null;
  }

  const [row] = await db()
    .update(emailSequenceSteps)
    .set({
      ...(input.order != null ? { stepOrder: input.order } : {}),
      ...(input.delayMinutes != null ? { delayMinutes: input.delayMinutes } : {}),
      ...(input.timingAnchor != null ? { timingAnchor: input.timingAnchor } : {}),
      ...(input.action != null ? { action: input.action } : {}),
      ...(input.subjectTemplate !== undefined
        ? { subjectTemplate: input.subjectTemplate ?? null }
        : {}),
      ...(input.bodyTemplate !== undefined
        ? { bodyTemplate: input.bodyTemplate ?? null }
        : {}),
    })
    .where(
      and(
        eq(emailSequenceSteps.id, stepId),
        eq(emailSequenceSteps.sequenceId, sequenceId),
      ),
    )
    .returning();

  return row ? toStep(row) : null;
}

export async function deleteSequenceStep(
  calendarId: string,
  sequenceId: string,
  stepId: string,
): Promise<boolean> {
  const sequence = await getSequence(calendarId, sequenceId);
  if (!sequence) {
    return false;
  }

  const deleted = await db()
    .delete(emailSequenceSteps)
    .where(
      and(
        eq(emailSequenceSteps.id, stepId),
        eq(emailSequenceSteps.sequenceId, sequenceId),
      ),
    )
    .returning({ id: emailSequenceSteps.id });

  return deleted.length > 0;
}

export async function replaceSequenceSteps(
  calendarId: string,
  sequenceId: string,
  steps: CreateStepInput[],
): Promise<EmailSequenceStep[] | null> {
  const sequence = await getSequence(calendarId, sequenceId);
  if (!sequence) {
    return null;
  }

  // BUG-053: stepOrder must be distinct across the replace payload.
  const orders = steps.map((step) => step.order);
  if (new Set(orders).size !== orders.length) {
    throw new SequenceValidationError("stepOrder values must be distinct");
  }

  // BUG-028: delete + insert in one transaction so a failed insert rolls
  // back the delete (existing steps survive instead of being wiped).
  return db().transaction(async (tx) => {
    await tx
      .delete(emailSequenceSteps)
      .where(eq(emailSequenceSteps.sequenceId, sequenceId));

    if (steps.length === 0) {
      return [];
    }

    const rows = await tx
      .insert(emailSequenceSteps)
      .values(
        steps.map((step) => ({
          sequenceId,
          stepOrder: step.order,
          delayMinutes: step.delayMinutes,
          timingAnchor: step.timingAnchor ?? "after_booking",
          action: step.action,
          subjectTemplate: step.subjectTemplate ?? null,
          bodyTemplate: step.bodyTemplate ?? null,
        })),
      )
      .returning();

    return rows.map(toStep);
  });
}

export async function renderManageUrl(meetingId: string): Promise<string> {
  const { manageUrl } = await resolveManageToken().createForMeeting(meetingId);
  return manageUrl;
}

export async function cancelPendingEmailSteps(meetingId: string): Promise<void> {
  await db()
    .update(scheduledTriggers)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(scheduledTriggers.meetingId, meetingId),
        eq(scheduledTriggers.triggerType, EMAIL_STEP_TRIGGER_TYPE),
        eq(scheduledTriggers.status, "pending"),
      ),
    );
}

async function buildStepTriggers(
  meeting: { id: string; calendarId: string; startsAt: string },
  sequences: (typeof emailSequences.$inferSelect)[],
  bookingTime: string,
  manageUrl: string,
  stepFilter?: (anchor: SequenceTimingAnchor) => boolean,
): Promise<(typeof scheduledTriggers.$inferInsert)[]> {
  const triggerRows: (typeof scheduledTriggers.$inferInsert)[] = [];

  for (const sequence of sequences) {
    const steps = await db()
      .select()
      .from(emailSequenceSteps)
      .where(eq(emailSequenceSteps.sequenceId, sequence.id))
      .orderBy(asc(emailSequenceSteps.stepOrder));

    for (const step of steps) {
      const anchor = step.timingAnchor;
      if (stepFilter && !stepFilter(anchor)) {
        continue;
      }
      triggerRows.push({
        calendarId: meeting.calendarId,
        meetingId: meeting.id,
        triggerType: EMAIL_STEP_TRIGGER_TYPE,
        fireAt: computeStepFireAt(
          anchor,
          step.delayMinutes,
          bookingTime,
          meeting.startsAt,
        ),
        status: "pending",
        payload: {
          sequenceId: sequence.id,
          stepId: step.id,
          meetingId: meeting.id,
          manageUrl,
        },
      });
    }
  }

  return triggerRows;
}

export async function enqueueSequenceForMeeting(
  meetingId: string,
  triggerEvent: MeetingSequenceTrigger,
): Promise<void> {
  const [meeting] = await db()
    .select({
      id: meetings.id,
      calendarId: meetings.calendarId,
      startsAt: meetings.startsAt,
      cancelledAt: meetings.cancelledAt,
    })
    .from(meetings)
    .where(eq(meetings.id, meetingId))
    .limit(1);

  if (!meeting) {
    return;
  }

  if (meeting.cancelledAt && triggerEvent !== "meeting.cancelled") {
    return;
  }

  const sequences = await db()
    .select()
    .from(emailSequences)
    .where(
      and(
        eq(emailSequences.calendarId, meeting.calendarId),
        eq(emailSequences.enabled, true),
        eq(emailSequences.triggerEvent, triggerEvent),
      ),
    );

  if (sequences.length === 0) {
    return;
  }

  const manageUrl = await renderManageUrl(meetingId);
  const bookingTime = new Date().toISOString();
  const triggerRows = await buildStepTriggers(
    meeting,
    sequences,
    bookingTime,
    manageUrl,
  );

  if (triggerRows.length === 0) {
    return;
  }

  await db().insert(scheduledTriggers).values(triggerRows);
}

export async function reenqueueMeetingAnchoredSteps(
  meetingId: string,
): Promise<void> {
  const [meeting] = await db()
    .select({
      id: meetings.id,
      calendarId: meetings.calendarId,
      startsAt: meetings.startsAt,
      cancelledAt: meetings.cancelledAt,
    })
    .from(meetings)
    .where(eq(meetings.id, meetingId))
    .limit(1);

  if (!meeting || meeting.cancelledAt) {
    return;
  }

  const sequences = await db()
    .select()
    .from(emailSequences)
    .where(
      and(
        eq(emailSequences.calendarId, meeting.calendarId),
        eq(emailSequences.enabled, true),
        eq(emailSequences.triggerEvent, "meeting.booked"),
      ),
    );

  if (sequences.length === 0) {
    return;
  }

  const manageUrl = await renderManageUrl(meetingId);
  const bookingTime = new Date().toISOString();
  const triggerRows = await buildStepTriggers(
    meeting,
    sequences,
    bookingTime,
    manageUrl,
    (anchor) => anchor === "before_meeting" || anchor === "after_meeting",
  );

  if (triggerRows.length === 0) {
    return;
  }

  await db().insert(scheduledTriggers).values(triggerRows);
}

export async function loadCalendarManageUrlInjection(
  calendarId: string,
): Promise<"auto_inject" | "template_opt_in"> {
  const [row] = await db()
    .select({ settings: calendarSettings.settings })
    .from(calendarSettings)
    .where(eq(calendarSettings.calendarId, calendarId))
    .limit(1);

  return row?.settings?.manageUrlInjection ?? defaultCalendarSettings().manageUrlInjection;
}
