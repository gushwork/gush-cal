import type { AppDeps } from "@/lib/deps";
import type { CalendarBundle, Slot } from "@/lib/types";
import {
  getCachedSlots,
  setCachedSlots,
  slotsCacheKey,
} from "./slots-cache";
import type { SlotsQueryParams } from "./parse-slots-query";

export async function getAvailableSlotsForCalendar(
  deps: AppDeps,
  bundle: CalendarBundle,
  params: SlotsQueryParams,
  cacheScope: string,
): Promise<Slot[]> {
  const key = slotsCacheKey({
    scope: cacheScope,
    calendarId: bundle.id,
    duration: params.durationMinutes,
    from: params.rangeStart,
    to: params.rangeEnd,
    tz: params.viewerTimezone,
    teamId: params.teamId ?? "",
    memberId: params.memberId ?? "",
  });

  const cached = getCachedSlots(key);
  if (cached) {
    return cached;
  }

  const slots = await deps.slots.getAvailableSlots({
    bundle,
    durationMinutes: params.durationMinutes,
    rangeStart: params.rangeStart,
    rangeEnd: params.rangeEnd,
    viewerTimezone: params.viewerTimezone,
    bookingPolicy: cacheScope === "public" ? "guest" : "admin",
    teamId: params.teamId,
    memberId: params.memberId,
  });

  setCachedSlots(key, slots);
  return slots;
}
