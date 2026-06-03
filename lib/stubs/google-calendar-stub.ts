import type {
  CreateMeetingEventRequest,
  CreateMeetingEventResult,
  FreeBusyRequest,
  FreeBusyResult,
  GoogleCalendarPort,
} from "@/lib/ports/google-calendar";

export const STUB_GOOGLE_EVENT_ID_PREFIX = "stub-event-";

export function isStubGoogleEventId(googleEventId: string): boolean {
  return googleEventId.startsWith(STUB_GOOGLE_EVENT_ID_PREFIX);
}

/**
 * Deterministic stub for tests and pre-SP-02 development.
 * - All members appear free (empty busy arrays)
 * - createMeetingEvent returns fixed ids
 * - deleteEvent is a no-op
 */
export function createGoogleCalendarStub(): GoogleCalendarPort {
  return {
    async queryFreeBusy(req: FreeBusyRequest): Promise<FreeBusyResult> {
      const byEmail: FreeBusyResult["byEmail"] = {};
      for (const email of req.memberEmails) {
        byEmail[email] = { status: "ok", busy: [] };
      }
      return { byEmail };
    },

    async createMeetingEvent(
      req: CreateMeetingEventRequest,
    ): Promise<CreateMeetingEventResult> {
      const suffix = req.startsAt.replace(/[^0-9]/g, "").slice(0, 12);
      return {
        ok: true,
        googleEventId: `${STUB_GOOGLE_EVENT_ID_PREFIX}${suffix}`,
        meetLink: `https://meet.google.com/stub-${suffix}`,
      };
    },

    async deleteEvent(): Promise<void> {
      // no-op
    },
  };
}
