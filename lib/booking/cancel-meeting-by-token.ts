import { eq } from "drizzle-orm";
import type { AppDeps } from "@/lib/deps";
import { getDb } from "@/lib/db/client";
import { meetings } from "@/lib/db/schema";
import { formatGoogleErrorMessage } from "@/lib/google/google-errors";
import { clearSlotsCacheForCalendar } from "./slots-cache";
import { loadMeetingManageContext } from "./reschedule-meeting";

export type CancelMeetingByTokenResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | "INVALID_TOKEN"
        | "NOT_FOUND"
        | "CANCELLED"
        | "PAST"
        | "GOOGLE_ERROR";
      message?: string;
    };

function isMeetingPast(startsAt: string, now = new Date()): boolean {
  return new Date(startsAt).getTime() <= now.getTime();
}

export async function cancelMeetingByToken(
  deps: AppDeps,
  input: { token: string },
): Promise<CancelMeetingByTokenResult> {
  const validation = await deps.manageToken.validate(input.token);
  if (!validation.ok) {
    return { ok: false, code: "INVALID_TOKEN" };
  }

  const ctx = await loadMeetingManageContext(validation.meetingId);
  if (!ctx) {
    return { ok: false, code: "NOT_FOUND" };
  }

  const { meeting, bundle, organizerEmail } = ctx;

  if (meeting.cancelledAt) {
    return { ok: false, code: "CANCELLED" };
  }

  if (isMeetingPast(meeting.startsAt)) {
    return { ok: false, code: "PAST" };
  }

  try {
    await deps.google.deleteEvent(organizerEmail, meeting.googleEventId);
  } catch (error) {
    console.error("[cancelMeetingByToken] Google delete failed", {
      meetingId: meeting.id,
      error,
    });
    return {
      ok: false,
      code: "GOOGLE_ERROR",
      message: formatGoogleErrorMessage(error),
    };
  }

  const now = new Date().toISOString();
  await getDb()
    .update(meetings)
    .set({ cancelledAt: now })
    .where(eq(meetings.id, meeting.id));

  clearSlotsCacheForCalendar(bundle.id);

  void deps.email.cancelPendingEmailSteps(meeting.id);
  void deps.email.enqueueSequenceForMeeting(meeting.id, "meeting.cancelled");

  void deps.events.emit({
    calendarId: bundle.id,
    eventType: "meeting.cancelled",
    meetingId: meeting.id,
    payload: { meetingId: meeting.id },
  });
  void deps.salesforce.syncFieldMap(bundle.id, "cancel", {
    meetingId: meeting.id,
  });

  await deps.manageToken.revokeForMeeting(meeting.id);

  return { ok: true };
}
