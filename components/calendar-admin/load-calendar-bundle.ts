import { cache } from "react";
import { getDb } from "@/lib/db/client";
import {
  loadCalendarBundleByCalendarId,
} from "@/lib/db/assemble-calendar-bundle";
import type { CalendarBundle } from "@/lib/types";

export const loadCalendarBundle = cache(async function loadCalendarBundle(
  calendarId: string,
  schedulerId: string,
): Promise<CalendarBundle | null> {
  return loadCalendarBundleByCalendarId(getDb(), calendarId, schedulerId);
});
