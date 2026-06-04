import type { AppDeps } from "@/lib/deps";
import { getDb } from "@/lib/db/client";
import { toMeeting } from "@/lib/db/mappers";
import { meetings } from "@/lib/db/schema";
import { violatesMinNotice } from "@/lib/slots/validate-min-notice";
import type {
  BookedBy,
  CalendarBundle,
  ConfirmBookingBody,
  Meeting,
} from "@/lib/types";

export const MIN_NOTICE_VIOLATION = "MIN_NOTICE_VIOLATION" as const;

export type ConfirmBookingInput = {
  bundle: CalendarBundle;
  body: ConfirmBookingBody;
  bookedBy: BookedBy;
};

export type ConfirmBookingResult =
  | { ok: true; meeting: Meeting }
  | {
      ok: false;
      code: "SLOT_UNAVAILABLE" | "GOOGLE_ERROR" | typeof MIN_NOTICE_VIOLATION;
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
  const { bundle, body, bookedBy } = input;

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

  const assignment = await deps.slots.assignMember({
    bundle,
    startsAt: body.startsAt,
    durationMinutes: body.durationMinutes,
    viewerTimezone: body.viewerTimezone,
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
        startsAt: body.startsAt,
        durationMinutes: body.durationMinutes,
        subject: body.subject,
        body: body.body,
        invitees: body.invitees,
        googleEventId: googleResult.googleEventId,
        meetLink: googleResult.meetLink,
        bookedBy,
        guestEmail: resolveGuestEmail(body, bookedBy),
      })
      .returning();

    return { ok: true, meeting: toMeeting(row) };
  } catch (error) {
    console.error(
      "Orphan Google event after DB insert failure:",
      googleResult.googleEventId,
      error,
    );
    throw error;
  }
}
