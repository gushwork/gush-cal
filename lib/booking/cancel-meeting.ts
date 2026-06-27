import { and, eq } from "drizzle-orm";
import type { AppDeps } from "@/lib/deps";
import { getDb } from "@/lib/db/client";
import { toMeeting } from "@/lib/db/mappers";
import { calendars, meetings, schedulers } from "@/lib/db/schema";
import type { Meeting } from "@/lib/types";
import { formatGoogleErrorMessage } from "@/lib/google/google-errors";
import { clearSlotsCacheForCalendar } from "./slots-cache";

export type MeetingWithOrganizer = {
  meeting: Meeting;
  organizerEmail: string;
};

export type CancelMeetingResult =
  | { ok: true }
  | { ok: false; code: "NOT_FOUND" | "GOOGLE_ERROR"; message?: string };

export async function loadMeetingForScheduler(
  meetingId: string,
  schedulerId: string,
): Promise<MeetingWithOrganizer | null> {
  const db = getDb();

  const [row] = await db
    .select({
      meeting: meetings,
      organizerEmail: schedulers.email,
    })
    .from(meetings)
    .innerJoin(calendars, eq(meetings.calendarId, calendars.id))
    .innerJoin(schedulers, eq(calendars.schedulerId, schedulers.id))
    .where(
      and(eq(meetings.id, meetingId), eq(calendars.schedulerId, schedulerId)),
    )
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    meeting: toMeeting(row.meeting),
    organizerEmail: row.organizerEmail,
  };
}

export async function cancelMeeting(
  deps: AppDeps,
  meetingId: string,
  schedulerId: string,
): Promise<CancelMeetingResult> {
  const loaded = await loadMeetingForScheduler(meetingId, schedulerId);
  if (!loaded) {
    return { ok: false, code: "NOT_FOUND" };
  }

  try {
    await deps.google.deleteEvent(
      loaded.organizerEmail,
      loaded.meeting.googleEventId,
    );
  } catch (error) {
    console.error("[cancelMeeting] Google delete failed", {
      meetingId,
      googleEventId: loaded.meeting.googleEventId,
      organizerEmail: loaded.organizerEmail,
      error,
    });
    return {
      ok: false,
      code: "GOOGLE_ERROR",
      message: formatGoogleErrorMessage(error),
    };
  }

  await deps.email.cancelPendingEmailSteps(meetingId);
  void deps.email.enqueueSequenceForMeeting(meetingId, "meeting.cancelled");

  await getDb().delete(meetings).where(eq(meetings.id, meetingId));
  clearSlotsCacheForCalendar(loaded.meeting.calendarId);

  void deps.events.emit({
    calendarId: loaded.meeting.calendarId,
    eventType: "meeting.cancelled",
    meetingId,
    payload: { meetingId },
  });
  void deps.salesforce.syncFieldMap(loaded.meeting.calendarId, "cancel", {
    meetingId,
  });

  return { ok: true };
}
