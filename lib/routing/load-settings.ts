import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import type { AppDatabase } from "@/lib/db/client";
import { calendarSettings } from "@/lib/db/schema";
import type { CalendarRoutingSettings } from "@/lib/types/platform";
import { normalizeCalendarSettings } from "@/lib/scheduling/normalize-settings";

let dbOverride: AppDatabase | null = null;

/** @internal test seam */
export function setRoutingSettingsDbForTest(db: AppDatabase | null): void {
  dbOverride = db;
}

function db() {
  return dbOverride ?? getDb();
}

export async function loadCalendarRoutingSettings(
  calendarId: string,
): Promise<CalendarRoutingSettings> {
  const [row] = await db()
    .select()
    .from(calendarSettings)
    .where(eq(calendarSettings.calendarId, calendarId))
    .limit(1);

  if (!row) {
    return normalizeCalendarSettings(undefined).routing;
  }

  return normalizeCalendarSettings(row.settings).routing;
}
