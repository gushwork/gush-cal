import { and, count, eq, gte, or } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { bookingLinks, eventOutbox, meetings, teams } from "@/lib/db/schema";
import type { AnalyticsMeeting, CalendarAnalyticsInput } from "./calendar-analytics";
import { DAY_MS } from "./time";

export type CalendarAnalyticsData = Omit<
  CalendarAnalyticsInput,
  "members" | "timeZone" | "now" | "rangeDays"
>;

/**
 * Loads the raw rows Calendar analytics need: Meetings created or starting in
 * the current + previous window (plus all upcoming), Teams, booking links, and
 * outbox event counts for the current window.
 *
 * Does not check ownership. Callers run it alongside `loadCalendarBundle(id,
 * schedulerId)` and call `notFound()` when the bundle is missing, so data for a
 * Calendar the Scheduler doesn't own is never rendered.
 */
export async function loadCalendarAnalyticsData(
  calendarId: string,
  rangeDays: number,
  now: Date,
): Promise<CalendarAnalyticsData> {
  const db = getDb();
  const since = new Date(now.getTime() - 2 * rangeDays * DAY_MS).toISOString();
  const windowStart = new Date(now.getTime() - rangeDays * DAY_MS).toISOString();

  const [meetingRows, teamRows, linkRows, eventRows] = await Promise.all([
    db
      .select({
        id: meetings.id,
        assignedMemberId: meetings.assignedMemberId,
        startsAt: meetings.startsAt,
        durationMinutes: meetings.durationMinutes,
        bookedBy: meetings.bookedBy,
        guestEmail: meetings.guestEmail,
        invitees: meetings.invitees,
        teamId: meetings.teamId,
        bookingLinkId: meetings.bookingLinkId,
        cancelledAt: meetings.cancelledAt,
        createdAt: meetings.createdAt,
      })
      .from(meetings)
      .where(
        and(
          eq(meetings.calendarId, calendarId),
          or(gte(meetings.createdAt, since), gte(meetings.startsAt, since)),
        ),
      ),
    db
      .select({ id: teams.id, name: teams.name })
      .from(teams)
      .where(eq(teams.calendarId, calendarId)),
    db
      .select({ id: bookingLinks.id, slug: bookingLinks.slug, kind: bookingLinks.kind })
      .from(bookingLinks)
      .where(eq(bookingLinks.calendarId, calendarId)),
    db
      .select({ eventType: eventOutbox.eventType, total: count() })
      .from(eventOutbox)
      .where(
        and(eq(eventOutbox.calendarId, calendarId), gte(eventOutbox.createdAt, windowStart)),
      )
      .groupBy(eventOutbox.eventType),
  ]);

  return {
    meetings: meetingRows satisfies AnalyticsMeeting[],
    teams: teamRows,
    links: linkRows,
    eventCounts: Object.fromEntries(eventRows.map((row) => [row.eventType, Number(row.total)])),
  };
}
