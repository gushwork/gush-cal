import type { GetSlotsRequest } from "@/lib/ports/slot-engine";
import type { Slot, UtcInstant } from "@/lib/types";
import { toDateKey } from "@/components/booking/group-slots-by-date";
import {
  addLocalDays,
  endOfLocalDay,
  startOfLocalDay,
} from "@/lib/datetime/local-day";
import type { SlotEngineDeps } from "./generate-slots";
import { computeAvailableSlots } from "./generate-slots";

export type FetchBookableSlotsParams = {
  calendarId: string;
  durationMinutes: number;
  rangeStart: UtcInstant;
  rangeEnd: UtcInstant;
  viewerTimezone: string;
};

export type FetchBookableSlotsBatchOptions = {
  onDayLoaded?: (dayKey: string, slots: Slot[]) => void;
};

/**
 * Fetches bookable slots for a range with a single FreeBusy round-trip and
 * optional per-day progressive callbacks for week UI.
 */
export async function fetchBookableSlotsBatch(
  deps: SlotEngineDeps,
  req: GetSlotsRequest,
  options?: FetchBookableSlotsBatchOptions,
): Promise<Slot[]> {
  const allSlots = await computeAvailableSlots(deps, req);

  if (!options?.onDayLoaded) {
    return allSlots;
  }

  const timeZone = req.viewerTimezone;
  const rangeStartDate = new Date(req.rangeStart);
  const rangeEndDate = new Date(req.rangeEnd);
  let day = startOfLocalDay(rangeStartDate, timeZone);

  while (day.getTime() <= rangeEndDate.getTime()) {
    const dayKey = toDateKey(day, timeZone);
    const daySlots = allSlots.filter(
      (slot) => toDateKey(new Date(slot.startsAt), timeZone) === dayKey,
    );
    options.onDayLoaded(dayKey, daySlots);
    day = addLocalDays(day, 1, timeZone);
  }

  return allSlots;
}
