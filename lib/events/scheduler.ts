import { and, eq, lte } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { calendarSettings, meetings, scheduledTriggers } from "@/lib/db/schema";
import type { AppEventType, CalendarSettings } from "@/lib/types/platform";
import { defaultCalendarSettings } from "@/lib/types/platform";
import { insertOutboxEvent } from "./outbox";

function computeFireAt(
  startsAt: string,
  type: "before" | "after",
  minutes: number,
): string {
  const date = new Date(startsAt);
  const delta = type === "before" ? -minutes : minutes;
  date.setUTCMinutes(date.getUTCMinutes() + delta);
  return date.toISOString();
}

async function loadCalendarSettings(calendarId: string): Promise<CalendarSettings> {
  const [row] = await getDb()
    .select({ settings: calendarSettings.settings })
    .from(calendarSettings)
    .where(eq(calendarSettings.calendarId, calendarId))
    .limit(1);

  return row?.settings ?? defaultCalendarSettings();
}

export async function scheduleRelativeTriggers(meetingId: string): Promise<void> {
  const [meeting] = await getDb()
    .select({
      id: meetings.id,
      calendarId: meetings.calendarId,
      startsAt: meetings.startsAt,
    })
    .from(meetings)
    .where(eq(meetings.id, meetingId))
    .limit(1);

  if (!meeting) {
    throw new Error("Meeting not found");
  }

  const settings = await loadCalendarSettings(meeting.calendarId);
  const rows = settings.triggerOffsets.map((offset) => {
    const triggerType: AppEventType =
      offset.type === "before" ? "meeting.before" : "meeting.after";

    return {
      calendarId: meeting.calendarId,
      meetingId: meeting.id,
      triggerType,
      fireAt: computeFireAt(meeting.startsAt, offset.type, offset.minutes),
      status: "pending",
      payload: { meetingId: meeting.id, offsetMinutes: offset.minutes },
    };
  });

  if (rows.length === 0) {
    return;
  }

  await getDb().insert(scheduledTriggers).values(rows);
}

export async function processDueTriggers(): Promise<number> {
  const now = new Date().toISOString();

  const due = await getDb()
    .select({
      id: scheduledTriggers.id,
      calendarId: scheduledTriggers.calendarId,
      meetingId: scheduledTriggers.meetingId,
      triggerType: scheduledTriggers.triggerType,
      payload: scheduledTriggers.payload,
    })
    .from(scheduledTriggers)
    .where(
      and(eq(scheduledTriggers.status, "pending"), lte(scheduledTriggers.fireAt, now)),
    );

  for (const trigger of due) {
    const payload =
      trigger.payload ??
      ({ meetingId: trigger.meetingId } satisfies Record<string, unknown>);

    await insertOutboxEvent({
      calendarId: trigger.calendarId,
      eventType: trigger.triggerType as AppEventType,
      meetingId: trigger.meetingId,
      payload,
    });

    await getDb()
      .update(scheduledTriggers)
      .set({ status: "delivered" })
      .where(eq(scheduledTriggers.id, trigger.id));
  }

  return due.length;
}
