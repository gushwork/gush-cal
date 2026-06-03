import type { GoogleCalendarPort } from "@/lib/ports/google-calendar";
import type { DbMeetingCounter } from "@/lib/ports/meeting-counter";
import type { GetSlotsRequest } from "@/lib/ports/slot-engine";
import type { Slot } from "@/lib/types";
import { getEligibleMembers } from "./eligibility";
import {
  SLOT_INCREMENT_MINUTES,
  addMinutes,
  getBookingWindow,
} from "./time";

export type SlotEngineDeps = {
  google: GoogleCalendarPort;
  db: DbMeetingCounter;
};

export function createGenerateSlots(deps: SlotEngineDeps) {
  return async function getAvailableSlots(
    req: GetSlotsRequest,
  ): Promise<Slot[]> {
    const now = new Date();
    const rangeStart = new Date(req.rangeStart);
    const rangeEnd = new Date(req.rangeEnd);

    const policy = req.bookingPolicy ?? "guest";
    let windowStart = rangeStart;
    let windowEnd = rangeEnd;

    // viewerTimezone: booking window bounds and UI labels only — not working-hours eligibility.
    if (policy === "guest") {
      const { earliest, latest } = getBookingWindow(
        now,
        0,
        req.bundle.bookingWindowDays,
        req.viewerTimezone,
      );
      windowStart = new Date(
        Math.max(rangeStart.getTime(), earliest.getTime()),
      );
      windowEnd = new Date(Math.min(rangeEnd.getTime(), latest.getTime()));
    } else if (policy === "admin") {
      const { latest } = getBookingWindow(
        now,
        0,
        req.bundle.bookingWindowDays,
        req.viewerTimezone,
      );
      windowStart = new Date(Math.max(rangeStart.getTime(), now.getTime()));
      windowEnd = new Date(Math.min(rangeEnd.getTime(), latest.getTime()));
    } else {
      windowStart = new Date(Math.max(rangeStart.getTime(), now.getTime()));
      windowEnd = rangeEnd;
    }

    if (windowStart >= windowEnd) {
      return [];
    }

    const freeBusy = await deps.google.queryFreeBusy({
      memberEmails: req.bundle.members.map((m) => m.email),
      timeMin: windowStart.toISOString(),
      timeMax: windowEnd.toISOString(),
    });

    const slots: Slot[] = [];
    let cursor = alignToIncrement(windowStart, SLOT_INCREMENT_MINUTES);

    while (
      cursor.getTime() + req.durationMinutes * 60_000 <=
      windowEnd.getTime()
    ) {
      const eligible = await getEligibleMembers({
        bundle: req.bundle,
        startsAt: cursor,
        durationMinutes: req.durationMinutes,
        viewerTimezone: req.viewerTimezone,
        freeBusyByEmail: freeBusy.byEmail,
        db: deps.db,
      });

      if (eligible.length > 0) {
        slots.push({
          startsAt: cursor.toISOString(),
          durationMinutes: req.durationMinutes,
          eligibleMemberCount: eligible.length,
        });
      }

      cursor = addMinutes(cursor, SLOT_INCREMENT_MINUTES);
    }

    return slots;
  };
}

function alignToIncrement(date: Date, incrementMinutes: number): Date {
  const ms = incrementMinutes * 60_000;
  return new Date(Math.ceil(date.getTime() / ms) * ms);
}
