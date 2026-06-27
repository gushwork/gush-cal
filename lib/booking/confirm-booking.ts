import type { AppDeps } from "@/lib/deps";
import { getDb } from "@/lib/db/client";
import { toMeeting } from "@/lib/db/mappers";
import { meetings } from "@/lib/db/schema";
import { defaultCalendarSettings } from "@/lib/types/platform";
import { loadCalendarSchedulingSettings } from "@/lib/scheduling/load-scheduling-settings";
import { advanceAssignmentState } from "@/lib/booking/advance-assignment-state";
import { violatesMinNotice } from "@/lib/slots/validate-min-notice";
import type {
  BookedBy,
  BookingTarget,
  CalendarBundle,
  ConfirmBookingBody,
  Meeting,
} from "@/lib/types";

export const MIN_NOTICE_VIOLATION = "MIN_NOTICE_VIOLATION" as const;

export type ConfirmBookingInput = {
  bundle: CalendarBundle;
  body: ConfirmBookingBody;
  bookedBy: BookedBy;
  target?: BookingTarget;
  bookingLinkId?: string;
  forceDuplicate?: boolean;
};

export type ConfirmBookingResult =
  | {
      ok: true;
      meeting: Meeting;
      duplicateWarning?: { existingMeetingId: string; manageUrl: string };
      redirectUrl?: string;
    }
  | {
      ok: false;
      code:
        | "SLOT_UNAVAILABLE"
        | "GOOGLE_ERROR"
        | typeof MIN_NOTICE_VIOLATION
        | "INVALID_EMAIL"
        | "DUPLICATE_MEETING";
      existingMeetingId?: string;
      manageUrl?: string;
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
  body: ConfirmBookingBody,
): string[] {
  const invitees = body.invitees ?? [];
  const guest = body.guestEmail?.trim();
  const extras = guest ? [...invitees, guest] : invitees;
  return uniqueAttendeeEmails(memberEmail, extras);
}

function resolveGuestEmail(
  body: ConfirmBookingBody,
  bookedBy: BookedBy,
): string | null {
  if (bookedBy === "scheduler") {
    return null;
  }
  return body.guestEmail?.trim() ?? body.invitees[0]?.trim() ?? null;
}

export async function confirmBooking(
  deps: AppDeps,
  input: ConfirmBookingInput,
): Promise<ConfirmBookingResult> {
  const { bundle, body, bookedBy, target, bookingLinkId, forceDuplicate } =
    input;

  if (
    bookedBy === "guest" &&
    violatesMinNotice({
      startsAt: body.startsAt,
      minNoticeHours: bundle.minNoticeHours,
      viewerTimezone: body.viewerTimezone,
    })
  ) {
    return { ok: false, code: MIN_NOTICE_VIOLATION };
  }

  const guestEmail = resolveGuestEmail(body, bookedBy);
  let duplicateWarning:
    | { existingMeetingId: string; manageUrl: string }
    | undefined;

  if (guestEmail && bookedBy === "guest") {
    const dup = await deps.duplicateGuard.check({
      calendarId: bundle.id,
      guestEmail,
      settings: defaultCalendarSettings().duplicate,
    });
    if (!dup.ok) {
      return { ok: false, code: "INVALID_EMAIL" };
    }
    if (!dup.allowed) {
      if (dup.mode === "hard_block" && !forceDuplicate && !body.forceDuplicate) {
        return {
          ok: false,
          code: "DUPLICATE_MEETING",
          existingMeetingId: dup.existingMeetingId,
          manageUrl: dup.manageUrl,
        };
      }
      if (!forceDuplicate && !body.forceDuplicate) {
        duplicateWarning = {
          existingMeetingId: dup.existingMeetingId,
          manageUrl: dup.manageUrl,
        };
      }
    }
  }

  const teamId = target?.teamId ?? body.teamId;
  const memberId = target?.memberId ?? body.memberId;
  const scheduling = await loadCalendarSchedulingSettings(bundle.id);

  const assignment = await deps.slots.assignMember({
    bundle,
    startsAt: body.startsAt,
    durationMinutes: body.durationMinutes,
    viewerTimezone: body.viewerTimezone,
    teamId,
    memberId,
    scheduling,
  });

  if (!assignment.ok) {
    return { ok: false, code: "SLOT_UNAVAILABLE" };
  }

  const attendeeEmails = buildAttendeeEmails(
    assignment.member.email,
    body,
  );

  const googleResult = await deps.google.createMeetingEvent({
    organizerEmail: bundle.scheduler.email,
    startsAt: body.startsAt,
    durationMinutes: body.durationMinutes,
    subject: body.subject,
    body: body.body,
    attendeeEmails,
    requestMeet: true,
  });

  if (!googleResult.ok) {
    return { ok: false, code: "GOOGLE_ERROR" };
  }

  try {
    const [row] = await getDb()
      .insert(meetings)
      .values({
        calendarId: bundle.id,
        assignedMemberId: assignment.member.id,
        teamId: teamId ?? null,
        bookingLinkId: bookingLinkId ?? body.bookingLinkId ?? null,
        startsAt: body.startsAt,
        durationMinutes: body.durationMinutes,
        subject: body.subject,
        body: body.body,
        invitees: body.invitees,
        googleEventId: googleResult.googleEventId,
        meetLink: googleResult.meetLink,
        bookedBy,
        guestEmail,
      })
      .returning();

    const meeting = toMeeting(row);

    if (!memberId) {
      await advanceAssignmentState({
        calendarId: bundle.id,
        scheduling,
        teamId,
        member: assignment.member,
        eligibleMembers: assignment.eligibleMembers,
      });
    }

    void deps.manageToken.createForMeeting(meeting.id);
    void deps.events.emit({
      calendarId: bundle.id,
      eventType: "meeting.booked",
      meetingId: meeting.id,
      payload: {
        meetingId: meeting.id,
        guestEmail,
        memberId: assignment.member.id,
        teamId,
        startsAt: body.startsAt,
      },
    });
    void deps.events.scheduleRelativeTriggers(meeting.id);
    void deps.salesforce.syncFieldMap(bundle.id, "book", {
      meetingId: meeting.id,
      guestEmail,
      memberEmail: assignment.member.email,
      startsAt: body.startsAt,
    });
    void deps.email.enqueueSequenceForMeeting(meeting.id, "meeting.booked");

    return {
      ok: true,
      meeting,
      ...(duplicateWarning ? { duplicateWarning } : {}),
    };
  } catch (error) {
    console.error(
      "Orphan Google event after DB insert failure:",
      googleResult.googleEventId,
      error,
    );
    throw error;
  }
}
