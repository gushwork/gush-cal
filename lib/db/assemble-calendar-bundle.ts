import { asc, eq } from "drizzle-orm";
import type { AppDatabase } from "@/lib/db/client";
import { toCalendar, toCalendarMember, toScheduler } from "@/lib/db/mappers";
import {
  calendarMembers,
  calendars,
  schedulers,
  type CalendarRow,
} from "@/lib/db/schema";
import type { CalendarBundle } from "@/lib/types";

export async function assembleCalendarBundle(
  db: AppDatabase,
  calendarRow: CalendarRow,
): Promise<CalendarBundle | null> {
  const [schedulerRow, memberRows] = await Promise.all([
    db
      .select()
      .from(schedulers)
      .where(eq(schedulers.id, calendarRow.schedulerId))
      .limit(1),
    db
      .select()
      .from(calendarMembers)
      .where(eq(calendarMembers.calendarId, calendarRow.id))
      .orderBy(asc(calendarMembers.sortOrder)),
  ]);

  const scheduler = schedulerRow[0];
  if (!scheduler) {
    return null;
  }

  const mappedScheduler = toScheduler(scheduler);

  return {
    ...toCalendar(calendarRow),
    members: memberRows.map(toCalendarMember),
    scheduler: {
      id: mappedScheduler.id,
      email: mappedScheduler.email,
      name: mappedScheduler.name,
    },
  };
}

export async function loadCalendarBundleByCalendarId(
  db: AppDatabase,
  calendarId: string,
  schedulerId?: string,
): Promise<CalendarBundle | null> {
  const [row] = await db
    .select()
    .from(calendars)
    .where(eq(calendars.id, calendarId))
    .limit(1);

  if (!row || (schedulerId != null && row.schedulerId !== schedulerId)) {
    return null;
  }

  return assembleCalendarBundle(db, row);
}

export async function loadCalendarBundleBySlugRow(
  db: AppDatabase,
  slug: string,
): Promise<CalendarBundle | null> {
  const [row] = await db
    .select()
    .from(calendars)
    .where(eq(calendars.slug, slug))
    .limit(1);

  if (!row) {
    return null;
  }

  return assembleCalendarBundle(db, row);
}
