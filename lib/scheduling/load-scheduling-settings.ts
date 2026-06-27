import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import type { AppDatabase } from "@/lib/db/client";
import { calendarSettings } from "@/lib/db/schema";
import type { CalendarSchedulingSettings } from "@/lib/types/platform";
import { defaultSchedulingSettings } from "./pool-key";
import { normalizeCalendarSettings } from "./normalize-settings";

let dbOverride: AppDatabase | null = null;

/** @internal test seam */
export function setSchedulingSettingsDbForTest(db: AppDatabase | null): void {
  dbOverride = db;
}

function db() {
  return dbOverride ?? getDb();
}

export async function loadCalendarSchedulingSettings(
  calendarId: string,
): Promise<CalendarSchedulingSettings> {
  const [row] = await db()
    .select()
    .from(calendarSettings)
    .where(eq(calendarSettings.calendarId, calendarId))
    .limit(1);

  if (!row) {
    return defaultSchedulingSettings();
  }

  return normalizeCalendarSettings(row.settings).scheduling;
}

export async function loadAndUpdateSchedulingSettings(
  calendarId: string,
  updater: (current: CalendarSchedulingSettings) => CalendarSchedulingSettings,
): Promise<void> {
  const [row] = await db()
    .select()
    .from(calendarSettings)
    .where(eq(calendarSettings.calendarId, calendarId))
    .limit(1);

  const settings = normalizeCalendarSettings(row?.settings);
  const nextScheduling = updater(settings.scheduling);

  await db()
    .insert(calendarSettings)
    .values({
      calendarId,
      settings: { ...settings, scheduling: nextScheduling },
    })
    .onConflictDoUpdate({
      target: calendarSettings.calendarId,
      set: { settings: { ...settings, scheduling: nextScheduling } },
    });
}

export async function advanceStrictRotation(
  calendarId: string,
  poolKey: string,
  memberId: string,
): Promise<void> {
  await loadAndUpdateSchedulingSettings(calendarId, (current) => ({
    ...current,
    strictRotation: { ...current.strictRotation, [poolKey]: memberId },
  }));
}

export async function advanceWeightedDeficits(
  calendarId: string,
  poolKey: string,
  memberId: string,
  eligibleMemberIds: string[],
  weightsByMemberId: Record<string, number>,
): Promise<void> {
  const totalWeight = eligibleMemberIds.reduce(
    (sum, id) => sum + (weightsByMemberId[id] ?? 100),
    0,
  );

  await loadAndUpdateSchedulingSettings(calendarId, (current) => {
    const pool = { ...(current.weightedDeficits[poolKey] ?? {}) };

    for (const id of eligibleMemberIds) {
      pool[id] = (pool[id] ?? 0) + (weightsByMemberId[id] ?? 100);
    }
    pool[memberId] = (pool[memberId] ?? 0) - totalWeight;

    return {
      ...current,
      weightedDeficits: {
        ...current.weightedDeficits,
        [poolKey]: pool,
      },
    };
  });
}
