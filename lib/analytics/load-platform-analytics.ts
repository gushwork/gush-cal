import { count, gte, isNull, max, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  apiKeys,
  bookingLinks,
  calendarMembers,
  calendars,
  emailSequences,
  eventOutbox,
  meetings,
  salesforceConnections,
  schedulers,
  teams,
  webhookEndpoints,
} from "@/lib/db/schema";
import type { PlatformAnalyticsInput } from "./platform-analytics";
import { DAY_MS } from "./time";

/**
 * Loads platform-wide rows for the App Admin dashboard. Every query runs in
 * parallel (one round trip). Only App Admins may call this; the `/admin` page
 * checks `isAppAdmin()` before loading.
 */
export async function loadPlatformAnalyticsData(
  rangeDays: number,
  now: Date,
): Promise<Omit<PlatformAnalyticsInput, "now" | "rangeDays">> {
  const db = getDb();
  const since = new Date(now.getTime() - 2 * rangeDays * DAY_MS).toISOString();
  const windowStart = new Date(now.getTime() - rangeDays * DAY_MS).toISOString();

  const [
    schedulerRows,
    calendarRows,
    memberRows,
    meetingRows,
    lastBookedRows,
    [{ total: totalMeetingsAllTime }],
    teamRows,
    linkRows,
    webhookRows,
    apiKeyRows,
    sequenceRows,
    salesforceRows,
    outboxRows,
    [{ active: activeKeys, used: usedKeys }],
  ] = await Promise.all([
    db
      .select({
        id: schedulers.id,
        email: schedulers.email,
        name: schedulers.name,
        createdAt: schedulers.createdAt,
      })
      .from(schedulers),
    db
      .select({
        id: calendars.id,
        schedulerId: calendars.schedulerId,
        name: calendars.name,
        slug: calendars.slug,
        createdAt: calendars.createdAt,
      })
      .from(calendars),
    db
      .select({ calendarId: calendarMembers.calendarId, total: count() })
      .from(calendarMembers)
      .groupBy(calendarMembers.calendarId),
    db
      .select({
        calendarId: meetings.calendarId,
        bookedBy: meetings.bookedBy,
        durationMinutes: meetings.durationMinutes,
        startsAt: meetings.startsAt,
        createdAt: meetings.createdAt,
        cancelledAt: meetings.cancelledAt,
      })
      .from(meetings)
      .where(or(gte(meetings.createdAt, since), gte(meetings.startsAt, since))),
    db
      .select({ calendarId: meetings.calendarId, last: max(meetings.createdAt) })
      .from(meetings)
      .groupBy(meetings.calendarId),
    db.select({ total: count() }).from(meetings),
    db.selectDistinct({ calendarId: teams.calendarId }).from(teams),
    db.selectDistinct({ calendarId: bookingLinks.calendarId }).from(bookingLinks),
    db
      .selectDistinct({ calendarId: webhookEndpoints.calendarId })
      .from(webhookEndpoints)
      .where(sql`${webhookEndpoints.enabled} = true`),
    db
      .selectDistinct({ calendarId: apiKeys.calendarId })
      .from(apiKeys)
      .where(isNull(apiKeys.revokedAt)),
    db
      .selectDistinct({ calendarId: emailSequences.calendarId })
      .from(emailSequences)
      .where(sql`${emailSequences.enabled} = true`),
    db.select({ calendarId: salesforceConnections.calendarId }).from(salesforceConnections),
    db
      .select({ status: eventOutbox.status, total: count() })
      .from(eventOutbox)
      .where(gte(eventOutbox.createdAt, windowStart))
      .groupBy(eventOutbox.status),
    db
      .select({
        active: sql<number>`count(*) filter (where ${apiKeys.revokedAt} is null)`,
        used: sql<number>`count(*) filter (where ${apiKeys.revokedAt} is null and ${apiKeys.lastUsedAt} >= ${windowStart})`,
      })
      .from(apiKeys),
  ]);

  const outboxCount = (status: string) =>
    Number(outboxRows.find((row) => row.status === status)?.total ?? 0);
  const ids = (rows: Array<{ calendarId: string }>) => rows.map((row) => row.calendarId);

  return {
    schedulers: schedulerRows,
    calendars: calendarRows,
    memberCounts: Object.fromEntries(memberRows.map((row) => [row.calendarId, Number(row.total)])),
    meetings: meetingRows,
    lastBookedAt: Object.fromEntries(
      lastBookedRows.flatMap((row) => (row.last ? [[row.calendarId, row.last]] : [])),
    ),
    totalMeetingsAllTime: Number(totalMeetingsAllTime),
    adoption: {
      teams: ids(teamRows),
      bookingLinks: ids(linkRows),
      webhooks: ids(webhookRows),
      apiKeys: ids(apiKeyRows),
      sequences: ids(sequenceRows),
      salesforce: ids(salesforceRows),
    },
    outbox: {
      pending: outboxCount("pending"),
      failed: outboxCount("failed"),
      delivered: outboxCount("delivered"),
    },
    apiKeys: { active: Number(activeKeys ?? 0), usedInWindow: Number(usedKeys ?? 0) },
  };
}
