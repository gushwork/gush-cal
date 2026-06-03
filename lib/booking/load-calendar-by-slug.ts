import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { toCalendar, toCalendarMember, toScheduler } from "@/lib/db/mappers";
import {
  calendarMembers,
  calendars,
  schedulers,
} from "@/lib/db/schema";
import type { CalendarBundle } from "@/lib/types";

export async function loadCalendarBundleBySlug(
  slug: string,
): Promise<CalendarBundle | null> {
  const db = getDb();

  const [row] = await db
    .select()
    .from(calendars)
    .where(eq(calendars.slug, slug))
    .limit(1);

  if (!row) {
    return null;
  }

  const [schedulerRow] = await db
    .select()
    .from(schedulers)
    .where(eq(schedulers.id, row.schedulerId))
    .limit(1);

  if (!schedulerRow) {
    return null;
  }

  const memberRows = await db
    .select()
    .from(calendarMembers)
    .where(eq(calendarMembers.calendarId, row.id))
    .orderBy(asc(calendarMembers.sortOrder));

  const scheduler = toScheduler(schedulerRow);

  return {
    ...toCalendar(row),
    members: memberRows.map(toCalendarMember),
    scheduler: {
      id: scheduler.id,
      email: scheduler.email,
      name: scheduler.name,
    },
  };
}
