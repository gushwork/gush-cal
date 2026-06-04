"use server";

import { loadCalendarBundle } from "@/components/calendar-admin/load-calendar-bundle";
import { getSchedulerId } from "@/lib/auth";
import { createAppDeps } from "@/lib/deps";
import {
  getCachedSlots,
  setCachedSlots,
  slotsCacheKey,
} from "@/lib/booking/slots-cache";
import { fetchBookableSlotsBatch } from "@/lib/slots/fetch-bookable-slots-batch";
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

  const cacheKey = slotsCacheKey({
    scope: "admin-availability",
    calendarId: params.calendarId,
    duration: params.durationMinutes,
    from: params.rangeStart,
    to: params.rangeEnd,
    tz: params.viewerTimezone,
  });

  const cached = getCachedSlots(cacheKey);
  if (cached) {
    return cached;
  }

  const deps = createAppDeps();
  const slots = await fetchBookableSlotsBatch(deps, {
    bundle,
    durationMinutes: params.durationMinutes,
    rangeStart: params.rangeStart,
    rangeEnd: params.rangeEnd,
    viewerTimezone: params.viewerTimezone,
    bookingPolicy: "admin",
  });

  setCachedSlots(cacheKey, slots);
  return slots;
}
