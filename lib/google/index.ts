import type { GoogleCalendarPort } from "@/lib/ports/google-calendar";
import { createMeetingEvent } from "./create-event";
import { deleteEvent } from "./delete-event";
import { queryFreeBusy } from "./freebusy";

export function createGoogleCalendarPort(): GoogleCalendarPort {
  return {
    queryFreeBusy,
    createMeetingEvent,
    deleteEvent,
  };
}
