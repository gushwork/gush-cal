import type { GoogleCalendarPort } from "@/lib/ports/google-calendar";
import type { DbMeetingCounter } from "@/lib/ports/meeting-counter";
import type { GetSlotsRequest } from "@/lib/ports/slot-engine";
import type { Slot } from "@/lib/types";
import { filterBundleMembers } from "./filter-members";
import { getEligibleMembersSync } from "./eligibility";
import {
  freeBusyCacheKey,
  getCachedFreeBusy,
  setCachedFreeBusy,
} from "./freebusy-cache";
import {
  SLOT_INCREMENT_MINUTES,
  addMinutes,
  getBookingWindow,
} from "./time";

export type SlotEngineDeps = {
  google: GoogleCalendarPort;
  db: DbMeetingCounter;
};

export async function computeAvailableSlots(
  deps: SlotEngineDeps,
  req: GetSlotsRequest,
): Promise<Slot[]> {
  const members = await filterBundleMembers(req.bundle, {
    teamId: req.teamId,
    memberId: req.memberId,
  });
  if (members.length === 0) {
    return [];
  }
  const bundle = { ...req.bundle, members };

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
      req.bundle.minNoticeHours,
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

  const freeBusyKey = freeBusyCacheKey({
    calendarId: bundle.id,
    timeMin: windowStart.toISOString(),
    timeMax: windowEnd.toISOString(),
    emails: bundle.members.map((m) => m.email).join(","),
  });

  let freeBusy = getCachedFreeBusy(freeBusyKey);
  if (!freeBusy) {
    freeBusy = await deps.google.queryFreeBusy({
      memberEmails: bundle.members.map((m) => m.email),
      timeMin: windowStart.toISOString(),
      timeMax: windowEnd.toISOString(),
    });
    setCachedFreeBusy(freeBusyKey, freeBusy);
  }

  const memberIds = bundle.members.map((member) => member.id);
  const prefetchedMeetings = await deps.db.listMeetingStartsForMembers(
    memberIds,
    new Date(windowStart.getTime() - 7 * 24 * 60 * 60_000).toISOString(),
    new Date(windowEnd.getTime() + 24 * 60 * 60_000).toISOString(),
  );

  const slots: Slot[] = [];
  let cursor = alignToIncrement(windowStart, SLOT_INCREMENT_MINUTES);

  while (
    cursor.getTime() + req.durationMinutes * 60_000 <=
    windowEnd.getTime()
  ) {
    const eligible = getEligibleMembersSync({
      bundle,
      startsAt: cursor,
      durationMinutes: req.durationMinutes,
      viewerTimezone: req.viewerTimezone,
      freeBusyByEmail: freeBusy.byEmail,
      prefetchedMeetings,
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
}

export function createGenerateSlots(deps: SlotEngineDeps) {
  return async function getAvailableSlots(
    req: GetSlotsRequest,
  ): Promise<Slot[]> {
    return computeAvailableSlots(deps, req);
  };
}

function alignToIncrement(date: Date, incrementMinutes: number): Date {
  const ms = incrementMinutes * 60_000;
  return new Date(Math.ceil(date.getTime() / ms) * ms);
}
