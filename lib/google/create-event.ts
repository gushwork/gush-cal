import { randomUUID } from "crypto";
import type {
  CreateMeetingEventRequest,
  CreateMeetingEventResult,
} from "@/lib/ports/google-calendar";
import { createImpersonatedClient } from "./calendar-client";

export async function createMeetingEvent(
  req: CreateMeetingEventRequest,
): Promise<CreateMeetingEventResult> {
  const calendar = createImpersonatedClient(req.organizerEmail);
  const start = new Date(req.startsAt);
  const end = new Date(start.getTime() + req.durationMinutes * 60_000);

  try {
    const response = await calendar.events.insert({
      calendarId: "primary",
      conferenceDataVersion: 1,
      sendUpdates: "all",
      requestBody: {
        summary: req.subject,
        description: req.body,
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
        attendees: req.attendeeEmails.map((email) => ({ email })),
        conferenceData: {
          createRequest: {
            requestId: randomUUID(),
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      },
    });

    const googleEventId = response.data.id;
    if (!googleEventId) {
      return { ok: false, code: "MISSING_EVENT_ID" };
    }

    const meetLink =
      response.data.hangoutLink ??
      response.data.conferenceData?.entryPoints?.find(
        (entry) => entry.entryPointType === "video",
      )?.uri ??
      "";

    if (!meetLink) {
      return { ok: false, code: "MISSING_MEET_LINK" };
    }

    return { ok: true, googleEventId, meetLink };
  } catch (error) {
    const code =
      error instanceof Error ? error.message.slice(0, 120) : "GOOGLE_ERROR";
    return { ok: false, code };
  }
}
