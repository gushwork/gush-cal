import { eq } from "drizzle-orm";
import type { AppDeps } from "@/lib/deps";
import { getDb } from "@/lib/db/client";
import { loadCalendarBundleByCalendarId } from "@/lib/db/assemble-calendar-bundle";
import { meetings } from "@/lib/db/schema";
import { loadCalendarSchedulingSettings } from "@/lib/scheduling/load-scheduling-settings";
import type { Meeting } from "@/lib/types";
import { loadMeetingForScheduler } from "./cancel-meeting";
import { clearSlotsCacheForCalendar } from "./slots-cache";

export type ReassignMeetingInput = {
  meetingId: string;
  schedulerId: string;
  newMemberId: string;
};

export type ReassignMeetingResult =
  | { ok: true; meeting: Meeting }
  | {
      ok: false;
      code:
        | "NOT_FOUND"
        | "CANCELLED"
        | "PAST"
        | "MEMBER_INELIGIBLE"
        | "GOOGLE_ERROR";
      message?: string;
    };

function uniqueAttendeeEmails(memberEmail: string, invitees: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const email of [memberEmail, ...invitees]) {
    const normalized = email.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(email.trim());
  }

  return result;
}

function buildAttendeeEmails(
  memberEmail: string,
  meeting: Meeting,
): string[] {
  const extras = meeting.guestEmail
    ? [...meeting.invitees, meeting.guestEmail]
    : meeting.invitees;
  return uniqueAttendeeEmails(memberEmail, extras);
}

function isMeetingPast(meeting: Meeting, now = new Date()): boolean {
  return new Date(meeting.startsAt).getTime() <= now.getTime();
}

export async function reassignMeeting(
  deps: AppDeps,
  input: ReassignMeetingInput,
): Promise<ReassignMeetingResult> {
  const loaded = await loadMeetingForScheduler(
    input.meetingId,
    input.schedulerId,
  );
  if (!loaded) {
    return { ok: false, code: "NOT_FOUND" };
  }

  const { meeting, organizerEmail } = loaded;

  if (meeting.cancelledAt) {
    return { ok: false, code: "CANCELLED" };
  }

  if (isMeetingPast(meeting)) {
    return { ok: false, code: "PAST" };
  }

  // BUG-046: same-member reassign is a no-op — skip Google churn, token
  // rotation, and email. Also avoids eligibility seeing the member's own
  // existing event as busy (false 409).
  if (input.newMemberId === meeting.assignedMemberId) {
    return { ok: true, meeting };
  }

  const bundle = await loadCalendarBundleByCalendarId(
    getDb(),
    meeting.calendarId,
  );
  if (!bundle) {
    return { ok: false, code: "NOT_FOUND" };
  }

  const scheduling = await loadCalendarSchedulingSettings(meeting.calendarId);

  const assignment = await deps.slots.assignMember({
    bundle,
    startsAt: meeting.startsAt,
    durationMinutes: meeting.durationMinutes,
    viewerTimezone: bundle.timezone,
    memberId: input.newMemberId,
    teamId: meeting.teamId ?? undefined,
    scheduling,
  });

  if (!assignment.ok) {
    return { ok: false, code: "MEMBER_INELIGIBLE" };
  }

  const attendeeEmails = buildAttendeeEmails(
    assignment.member.email,
    meeting,
  );

  // BUG-045: create new event FIRST; on failure the old event + DB row stay
  // intact (do not delete the old event before the DB points at the new one).
  const googleResult = await deps.google.createMeetingEvent({
    organizerEmail,
    startsAt: meeting.startsAt,
    durationMinutes: meeting.durationMinutes,
    subject: meeting.subject,
    body: meeting.body,
    attendeeEmails,
    requestMeet: true,
  });

  if (!googleResult.ok) {
    return { ok: false, code: "GOOGLE_ERROR" };
  }

  await getDb()
    .update(meetings)
    .set({
      assignedMemberId: assignment.member.id,
      googleEventId: googleResult.googleEventId,
      meetLink: googleResult.meetLink,
    })
    .where(eq(meetings.id, meeting.id));

  // Old event delete is best-effort: DB already points at the new event.
  try {
    await deps.google.deleteEvent(organizerEmail, meeting.googleEventId);
  } catch (error) {
    console.error("[reassignMeeting] stale event delete failed", {
      meetingId: meeting.id,
      googleEventId: meeting.googleEventId,
      error,
    });
  }

  const updatedMeeting: Meeting = {
    ...meeting,
    assignedMemberId: assignment.member.id,
    googleEventId: googleResult.googleEventId,
    meetLink: googleResult.meetLink,
  };
  clearSlotsCacheForCalendar(bundle.id);

  void deps.email.enqueueSequenceForMeeting(meeting.id, "meeting.reassigned");

  void deps.events.emit({
    calendarId: bundle.id,
    eventType: "meeting.reassigned",
    meetingId: meeting.id,
    payload: {
      meetingId: meeting.id,
      oldMemberId: meeting.assignedMemberId,
      newMemberId: assignment.member.id,
    },
  });
  void deps.salesforce.syncFieldMap(bundle.id, "reassign", {
    meetingId: meeting.id,
    guestEmail: meeting.guestEmail,
    memberEmail: assignment.member.email,
    oldMemberId: meeting.assignedMemberId,
    newMemberId: assignment.member.id,
  });

  await deps.manageToken.revokeForMeeting(meeting.id);
  await deps.manageToken.createForMeeting(meeting.id);

  return { ok: true, meeting: updatedMeeting };
}
