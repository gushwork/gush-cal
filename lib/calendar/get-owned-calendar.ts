import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { calendars, type CalendarRow } from "@/lib/db/schema";

export async function getOwnedCalendar(
  calendarId: string,
  schedulerId: string,
): Promise<CalendarRow | null> {
  const [calendar] = await getDb()
    .select()
    .from(calendars)
    .where(
      and(
        eq(calendars.id, calendarId),
        eq(calendars.schedulerId, schedulerId),
      ),
    )
    .limit(1);
  return calendar ?? null;
}
