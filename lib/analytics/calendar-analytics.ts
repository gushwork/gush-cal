import type { Meeting } from "@/lib/types";
import {
  DAY_MS,
  formatDayKey,
  formatDayKeyWeekday,
  leadingDayKeys,
  localDayKey,
  localWeekdayHour,
  median,
  percentChange,
  trailingDayKeys,
} from "./time";

/** Meeting fields the Calendar analytics read (no subject/body needed). */
export type AnalyticsMeeting = Pick<
  Meeting,
  | "id"
  | "assignedMemberId"
  | "startsAt"
  | "durationMinutes"
  | "bookedBy"
  | "guestEmail"
  | "invitees"
  | "teamId"
  | "bookingLinkId"
  | "cancelledAt"
  | "createdAt"
>;

export type CalendarAnalyticsInput = {
  meetings: AnalyticsMeeting[];
  members: Array<{ id: string; email: string; displayName: string | null }>;
  teams: Array<{ id: string; name: string }>;
  links: Array<{ id: string; slug: string; kind: string }>;
  /** Counts of outbox events in the current window, keyed by event type. */
  eventCounts: Record<string, number>;
  /** Calendar timezone: all day/hour bucketing uses it (deterministic on the server). */
  timeZone: string;
  now: Date;
  rangeDays: number;
};

export type Metric = {
  value: number;
  previous: number;
  /** Percent change vs previous window; null when there is no baseline. */
  deltaPct: number | null;
};

export type DailyBookings = {
  key: string;
  label: string;
  weekday: string;
  guest: number;
  scheduler: number;
  cancelled: number;
};

export type MemberLoad = {
  id: string;
  name: string;
  email: string;
  /** Active Meetings that started (or start) within the window. */
  meetings: number;
  share: number;
  upcoming: number;
  hours: number;
};

export type BreakdownRow = { label: string; count: number; share: number };

export type CalendarAnalytics = {
  rangeDays: number;
  timeZone: string;
  isEmpty: boolean;
  kpis: {
    booked: Metric;
    held: Metric;
    hours: Metric;
    cancellationRate: { value: number | null; previous: number | null };
    selfServeShare: number | null;
    medianLeadHours: number | null;
    uniqueGuests: number;
    upcomingTotal: number;
    upcomingNext7: number;
    reschedules: number;
    reassignments: number;
    duplicatesBlocked: number;
  };
  daily: DailyBookings[];
  heatmap: {
    /** cells[weekday 0=Mon][hour] */
    cells: number[][];
    max: number;
    hourStart: number;
    hourEnd: number;
    total: number;
    busiest: { weekday: number; hour: number; count: number } | null;
  };
  members: MemberLoad[];
  idleMembers: number;
  sources: {
    guest: number;
    scheduler: number;
    byTeam: BreakdownRow[];
    byLink: BreakdownRow[];
  };
  durations: BreakdownRow[];
  upcomingByDay: Array<{ key: string; label: string; weekday: string; count: number }>;
};

function ms(instant: string): number {
  return new Date(instant).getTime();
}

function metric(value: number, previous: number): Metric {
  return { value, previous, deltaPct: percentChange(value, previous) };
}

function ratio(part: number, whole: number): number | null {
  return whole === 0 ? null : part / whole;
}

function toBreakdown(counts: Map<string, number>, total: number): BreakdownRow[] {
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count, share: total === 0 ? 0 : count / total }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/**
 * Pure analytics for one Calendar over a rolling window of `rangeDays`,
 * compared against the window immediately before it.
 *
 * - "Booked" counts Meetings created in the window (even if later cancelled).
 * - "Held" counts active Meetings whose start fell in the window and has passed.
 * - Cancelled Meetings never count toward load, hours, or upcoming.
 */
export function computeCalendarAnalytics(input: CalendarAnalyticsInput): CalendarAnalytics {
  const { meetings, timeZone, now, rangeDays } = input;
  const nowMs = now.getTime();
  const windowStart = nowMs - rangeDays * DAY_MS;
  const prevStart = nowMs - 2 * rangeDays * DAY_MS;

  const inWindow = (t: number) => t >= windowStart && t <= nowMs;
  const inPrev = (t: number) => t >= prevStart && t < windowStart;

  const bookedNow = meetings.filter((m) => inWindow(ms(m.createdAt)));
  const bookedPrev = meetings.filter((m) => inPrev(ms(m.createdAt)));

  const active = meetings.filter((m) => m.cancelledAt === null);
  const heldNow = active.filter((m) => inWindow(ms(m.startsAt)));
  const heldPrev = active.filter((m) => inPrev(ms(m.startsAt)));
  const sumHours = (list: AnalyticsMeeting[]) =>
    list.reduce((total, m) => total + m.durationMinutes, 0) / 60;

  const cancelledNow = bookedNow.filter((m) => m.cancelledAt !== null).length;
  const cancelledPrev = bookedPrev.filter((m) => m.cancelledAt !== null).length;
  const guestNow = bookedNow.filter((m) => m.bookedBy === "guest").length;

  const leadHours = bookedNow
    .map((m) => (ms(m.startsAt) - ms(m.createdAt)) / 3_600_000)
    .filter((h) => h >= 0);

  const guests = new Set<string>();
  for (const m of bookedNow) {
    const emails = m.guestEmail ? [m.guestEmail] : m.invitees;
    for (const email of emails) guests.add(email.trim().toLowerCase());
  }

  const upcoming = active.filter((m) => ms(m.startsAt) > nowMs);
  const upcomingNext7 = upcoming.filter((m) => ms(m.startsAt) <= nowMs + 7 * DAY_MS);

  // Daily bookings by creation day in the Calendar timezone.
  const dayKeys = trailingDayKeys(now, rangeDays, timeZone);
  const dayIndex = new Map(dayKeys.map((key, index) => [key, index]));
  const daily: DailyBookings[] = dayKeys.map((key) => ({
    key,
    label: formatDayKey(key),
    weekday: formatDayKeyWeekday(key),
    guest: 0,
    scheduler: 0,
    cancelled: 0,
  }));
  for (const m of bookedNow) {
    const index = dayIndex.get(localDayKey(new Date(m.createdAt), timeZone));
    if (index === undefined) continue;
    daily[index][m.bookedBy === "guest" ? "guest" : "scheduler"] += 1;
  }
  for (const m of meetings) {
    if (!m.cancelledAt || !inWindow(ms(m.cancelledAt))) continue;
    const index = dayIndex.get(localDayKey(new Date(m.cancelledAt), timeZone));
    if (index !== undefined) daily[index].cancelled += 1;
  }

  // When Meetings happen: active Meetings starting in the window or upcoming.
  const cells = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  let heatTotal = 0;
  for (const m of active) {
    if (ms(m.startsAt) < windowStart) continue;
    const { weekday, hour } = localWeekdayHour(new Date(m.startsAt), timeZone);
    cells[weekday][hour] += 1;
    heatTotal += 1;
  }
  let max = 0;
  let busiest: CalendarAnalytics["heatmap"]["busiest"] = null;
  let minHour = 24;
  let maxHour = -1;
  cells.forEach((row, weekday) =>
    row.forEach((count, hour) => {
      if (count === 0) return;
      minHour = Math.min(minHour, hour);
      maxHour = Math.max(maxHour, hour);
      if (count > max) {
        max = count;
        busiest = { weekday, hour, count };
      }
    }),
  );
  const hourStart = Math.min(8, minHour === 24 ? 8 : minHour);
  const hourEnd = Math.max(18, maxHour);

  // Member load over Meetings that started in the window or are upcoming.
  const loadMeetings = active.filter((m) => ms(m.startsAt) >= windowStart);
  const loadTotal = loadMeetings.length;
  const members: MemberLoad[] = input.members
    .map((member) => {
      const own = loadMeetings.filter((m) => m.assignedMemberId === member.id);
      return {
        id: member.id,
        name: member.displayName?.trim() || member.email,
        email: member.email,
        meetings: own.length,
        share: loadTotal === 0 ? 0 : own.length / loadTotal,
        upcoming: own.filter((m) => ms(m.startsAt) > nowMs).length,
        hours: sumHours(own),
      };
    })
    .sort((a, b) => b.meetings - a.meetings || a.name.localeCompare(b.name));

  const teamNames = new Map(input.teams.map((t) => [t.id, t.name]));
  const linkNames = new Map(input.links.map((l) => [l.id, `/${l.slug}`]));
  const byTeam = new Map<string, number>();
  const byLink = new Map<string, number>();
  for (const m of bookedNow) {
    const team = m.teamId ? (teamNames.get(m.teamId) ?? "Removed team") : "No team";
    byTeam.set(team, (byTeam.get(team) ?? 0) + 1);
    const link = m.bookingLinkId
      ? (linkNames.get(m.bookingLinkId) ?? "Removed link")
      : m.bookedBy === "guest"
        ? "Main public link"
        : "Scheduler booking";
    byLink.set(link, (byLink.get(link) ?? 0) + 1);
  }

  const durationCounts = new Map<string, number>();
  for (const m of bookedNow) {
    const label = `${m.durationMinutes} min`;
    durationCounts.set(label, (durationCounts.get(label) ?? 0) + 1);
  }

  const upcomingKeys = leadingDayKeys(now, 7, timeZone);
  const upcomingByDay = upcomingKeys.map((key) => ({
    key,
    label: formatDayKey(key),
    weekday: formatDayKeyWeekday(key),
    count: 0,
  }));
  const upcomingIndex = new Map(upcomingKeys.map((key, index) => [key, index]));
  for (const m of upcomingNext7) {
    const index = upcomingIndex.get(localDayKey(new Date(m.startsAt), timeZone));
    if (index !== undefined) upcomingByDay[index].count += 1;
  }

  return {
    rangeDays,
    timeZone,
    isEmpty: meetings.length === 0,
    kpis: {
      booked: metric(bookedNow.length, bookedPrev.length),
      held: metric(heldNow.length, heldPrev.length),
      hours: metric(sumHours(heldNow), sumHours(heldPrev)),
      cancellationRate: {
        value: ratio(cancelledNow, bookedNow.length),
        previous: ratio(cancelledPrev, bookedPrev.length),
      },
      selfServeShare: ratio(guestNow, bookedNow.length),
      medianLeadHours: median(leadHours),
      uniqueGuests: guests.size,
      upcomingTotal: upcoming.length,
      upcomingNext7: upcomingNext7.length,
      reschedules: input.eventCounts["meeting.rescheduled"] ?? 0,
      reassignments: input.eventCounts["meeting.reassigned"] ?? 0,
      duplicatesBlocked: input.eventCounts["booking.duplicate_blocked"] ?? 0,
    },
    daily,
    heatmap: { cells, max, hourStart, hourEnd, total: heatTotal, busiest },
    members,
    idleMembers: members.filter((m) => m.meetings === 0).length,
    sources: {
      guest: guestNow,
      scheduler: bookedNow.length - guestNow,
      byTeam: toBreakdown(byTeam, bookedNow.length),
      byLink: toBreakdown(byLink, bookedNow.length),
    },
    durations: toBreakdown(durationCounts, bookedNow.length),
    upcomingByDay,
  };
}
