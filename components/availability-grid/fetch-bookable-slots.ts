"use server";

import { loadCalendarBundle } from "@/components/calendar-admin/load-calendar-bundle";
import { getSchedulerId } from "@/lib/auth";
import { createAppDeps } from "@/lib/deps";
import type { IanaTimezone, Slot, UtcInstant } from "@/lib/types";

export async function fetchBookableSlots(params: {
  calendarId: string;
  durationMinutes: number;
  rangeStart: UtcInstant;
  rangeEnd: UtcInstant;
  viewerTimezone: IanaTimezone;
}): Promise<Slot[]> {
  const schedulerId = await getSchedulerId();
  if (!schedulerId) {
    return [];
  }

  const bundle = await loadCalendarBundle(params.calendarId, schedulerId);
  if (!bundle) {
    return [];
  }

  const deps = createAppDeps();
  return deps.slots.getAvailableSlots({
    bundle,
    durationMinutes: params.durationMinutes,
    rangeStart: params.rangeStart,
    rangeEnd: params.rangeEnd,
    viewerTimezone: params.viewerTimezone,
    bookingPolicy: "admin",
  });
}
