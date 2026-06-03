import type { UtcInstant } from "@/lib/types";

export type FreeBusyRequest = {
  memberEmails: string[];
  timeMin: UtcInstant;
  timeMax: UtcInstant;
};

export type FreeBusyEntry =
  | { status: "ok"; busy: Array<{ start: UtcInstant; end: UtcInstant }> }
  | { status: "error"; code: string };

export type FreeBusyResult = {
  byEmail: Record<string, FreeBusyEntry>;
};

export type CreateMeetingEventRequest = {
  organizerEmail: string;
  startsAt: UtcInstant;
  durationMinutes: number;
  subject: string;
  body: string;
  attendeeEmails: string[];
  requestMeet: true;
};

export type CreateMeetingEventResult =
  | { ok: true; googleEventId: string; meetLink: string }
  | { ok: false; code: string };

export interface GoogleCalendarPort {
  queryFreeBusy(req: FreeBusyRequest): Promise<FreeBusyResult>;
  createMeetingEvent(
    req: CreateMeetingEventRequest,
  ): Promise<CreateMeetingEventResult>;
  deleteEvent(organizerEmail: string, googleEventId: string): Promise<void>;
}
