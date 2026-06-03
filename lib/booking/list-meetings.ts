import { and, asc, eq, gte, lt } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { toMeeting } from "@/lib/db/mappers";
import { calendars, meetings } from "@/lib/db/schema";
import type { Meeting, UtcInstant } from "@/lib/types";

export async function listMeetingsForCalendar(
  calendarId: string,
  schedulerId: string,
  rangeStart?: UtcInstant,
  rangeEnd?: UtcInstant,
): Promise<Meeting[] | null> {
  const db = getDb();

  const [calendar] = await db
    .select({ id: calendars.id })
    .from(calendars)
    .where(
      and(eq(calendars.id, calendarId), eq(calendars.schedulerId, schedulerId)),
    )
    .limit(1);

  if (!calendar) {
    return null;
  }

  const filters = [eq(meetings.calendarId, calendarId)];
  if (rangeStart) {
    filters.push(gte(meetings.startsAt, rangeStart));
  }
  if (rangeEnd) {
    filters.push(lt(meetings.startsAt, rangeEnd));
  }

  const rows = await db
    .select()
    .from(meetings)
    .where(and(...filters))
    .orderBy(asc(meetings.startsAt));

  return rows.map(toMeeting);
}
