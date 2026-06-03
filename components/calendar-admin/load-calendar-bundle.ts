import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { toCalendar, toCalendarMember, toScheduler } from "@/lib/db/mappers";
import {
  calendarMembers,
  calendars,
  schedulers,
} from "@/lib/db/schema";
import type { CalendarBundle } from "@/lib/types";

export async function loadCalendarBundle(
  calendarId: string,
  schedulerId: string,
): Promise<CalendarBundle | null> {
  const db = getDb();

  const [row] = await db
    .select()
    .from(calendars)
    .where(eq(calendars.id, calendarId))
    .limit(1);

  if (!row || row.schedulerId !== schedulerId) {
    return null;
  }

  const [schedulerRow] = await db
    .select()
    .from(schedulers)
    .where(eq(schedulers.id, schedulerId))
    .limit(1);

  if (!schedulerRow) {
    return null;
  }

  const memberRows = await db
    .select()
    .from(calendarMembers)
    .where(eq(calendarMembers.calendarId, calendarId))
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
