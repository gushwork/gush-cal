import { eq } from "drizzle-orm";
import type { AppDeps } from "@/lib/deps";
import { getDb } from "@/lib/db/client";
import { loadCalendarBundleByCalendarId } from "@/lib/db/assemble-calendar-bundle";
import { toMeeting } from "@/lib/db/mappers";
import {
  calendarSettings,
  calendars,
  meetings,
  schedulers,
} from "@/lib/db/schema";
import type { CalendarBundle, Meeting } from "@/lib/types";
import {
  defaultCalendarSettings,
  type CalendarSettings,
} from "@/lib/types/platform";
import { normalizeCalendarSettings } from "@/lib/scheduling/normalize-settings";
import { advanceAssignmentState } from "@/lib/booking/advance-assignment-state";
import { violatesMinNotice } from "@/lib/slots/validate-min-notice";
import { clearSlotsCacheForCalendar } from "./slots-cache";

export type MeetingManageContext = {
  meeting: Meeting;
  bundle: CalendarBundle;
  settings: CalendarSettings;
  organizerEmail: string;
};

export type RescheduleMeetingInput = {
  meetingId: string;
  startsAt: string;
  durationMinutes: number;
  viewerTimezone: string;
};

export type RescheduleMeetingResult =
  | { ok: true; meeting: Meeting; manageUrl: string }
  | {
      ok: false;
      code:
        | "NOT_FOUND"
        | "CANCELLED"
        | "PAST"
        | "SLOT_UNAVAILABLE"
        | "MIN_NOTICE_VIOLATION"
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

export async function loadMeetingManageContext(
  meetingId: string,
): Promise<MeetingManageContext | null> {
  const db = getDb();

  const [row] = await db
    .select({
      meeting: meetings,
      organizerEmail: schedulers.email,
    })
    .from(meetings)
    .innerJoin(calendars, eq(meetings.calendarId, calendars.id))
    .innerJoin(schedulers, eq(calendars.schedulerId, schedulers.id))
    .where(eq(meetings.id, meetingId))
    .limit(1);

  if (!row) {
    return null;
  }

  const bundle = await loadCalendarBundleByCalendarId(
    db,
    row.meeting.calendarId,
  );
  if (!bundle) {
    return null;
  }

  const [settingsRow] = await db
    .select({ settings: calendarSettings.settings })
    .from(calendarSettings)
    .where(eq(calendarSettings.calendarId, row.meeting.calendarId))
    .limit(1);

  return {
    meeting: toMeeting(row.meeting),
    bundle,
    settings: normalizeCalendarSettings(
      settingsRow?.settings ?? defaultCalendarSettings(),
    ),
    organizerEmail: row.organizerEmail,
  };
}

export type ValidateManageTokenResult =
  | { ok: true; ctx: MeetingManageContext }
  | { ok: false; code: "INVALID" | "EXPIRED" | "REVOKED" | "NOT_FOUND" };

export async function validateManageToken(
  deps: AppDeps,
  token: string,
): Promise<ValidateManageTokenResult> {
  const validation = await deps.manageToken.validate(token);
  if (!validation.ok) {
    return { ok: false, code: validation.code };
  }

  const ctx = await loadMeetingManageContext(validation.meetingId);
  if (!ctx) {
    return { ok: false, code: "NOT_FOUND" };
  }

  return { ok: true, ctx };
}

export async function rescheduleMeeting(
  deps: AppDeps,
  input: RescheduleMeetingInput,
): Promise<RescheduleMeetingResult> {
  const ctx = await loadMeetingManageContext(input.meetingId);
  if (!ctx) {
    return { ok: false, code: "NOT_FOUND" };
  }

  const { meeting, bundle, settings, organizerEmail } = ctx;

  if (meeting.cancelledAt) {
    return { ok: false, code: "CANCELLED" };
  }

  if (isMeetingPast(meeting)) {
    return { ok: false, code: "PAST" };
  }

  if (
    violatesMinNotice({
      startsAt: input.startsAt,
      minNoticeHours: bundle.minNoticeHours,
      viewerTimezone: input.viewerTimezone,
    })
  ) {
    return { ok: false, code: "MIN_NOTICE_VIOLATION" };
  }

  const assignInput =
    settings.scheduling.rescheduleAssignment === "keep_member"
      ? {
          memberId: meeting.assignedMemberId,
          teamId: meeting.teamId ?? undefined,
        }
      : {
          teamId: meeting.teamId ?? undefined,
        };

  const assignment = await deps.slots.assignMember({
    bundle,
    startsAt: input.startsAt,
    durationMinutes: input.durationMinutes,
    viewerTimezone: input.viewerTimezone,
    scheduling: settings.scheduling,
    ...assignInput,
  });

  if (!assignment.ok) {
    return { ok: false, code: "SLOT_UNAVAILABLE" };
  }

  const attendeeEmails = buildAttendeeEmails(
    assignment.member.email,
    meeting,
  );

  // BUG-020: create new event FIRST so a create failure leaves the old event
  // + DB row intact (no orphaned googleEventId).
  const googleResult = await deps.google.createMeetingEvent({
    organizerEmail,
    startsAt: input.startsAt,
    durationMinutes: input.durationMinutes,
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
      startsAt: input.startsAt,
      durationMinutes: input.durationMinutes,
      assignedMemberId: assignment.member.id,
      googleEventId: googleResult.googleEventId,
      meetLink: googleResult.meetLink,
    })
    .where(eq(meetings.id, meeting.id));

  // Old event delete is best-effort: DB already points at the new event.
  try {
    await deps.google.deleteEvent(organizerEmail, meeting.googleEventId);
  } catch (error) {
    console.error("[rescheduleMeeting] stale event delete failed", {
      meetingId: meeting.id,
      googleEventId: meeting.googleEventId,
      error,
    });
  }

  const updatedMeeting: Meeting = {
    ...meeting,
    startsAt: input.startsAt,
    durationMinutes: input.durationMinutes,
    assignedMemberId: assignment.member.id,
    googleEventId: googleResult.googleEventId,
    meetLink: googleResult.meetLink,
  };
  clearSlotsCacheForCalendar(bundle.id);

  if (settings.scheduling.rescheduleAssignment === "rerun_round_robin") {
    await advanceAssignmentState({
      calendarId: bundle.id,
      scheduling: settings.scheduling,
      teamId: meeting.teamId ?? undefined,
      member: assignment.member,
      eligibleMembers: assignment.eligibleMembers,
    });
  }

  void deps.email.cancelPendingEmailSteps(meeting.id);
  void deps.email.enqueueSequenceForMeeting(meeting.id, "meeting.rescheduled");
  void deps.email.reenqueueMeetingAnchoredSteps(meeting.id);

  void deps.events.emit({
    calendarId: bundle.id,
    eventType: "meeting.rescheduled",
    meetingId: meeting.id,
    payload: {
      meetingId: meeting.id,
      startsAt: input.startsAt,
      previousStartsAt: meeting.startsAt,
      memberId: assignment.member.id,
    },
  });
  void deps.events.scheduleRelativeTriggers(meeting.id);
  void deps.salesforce.syncFieldMap(bundle.id, "reschedule", {
    meetingId: meeting.id,
    guestEmail: meeting.guestEmail,
    memberEmail: assignment.member.email,
    startsAt: input.startsAt,
  });

  await deps.manageToken.revokeForMeeting(meeting.id);
  const { manageUrl } = await deps.manageToken.createForMeeting(meeting.id);

  return { ok: true, meeting: updatedMeeting, manageUrl };
}
