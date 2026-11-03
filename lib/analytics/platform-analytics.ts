import type { Metric } from "./calendar-analytics";
import {
  DAY_MS,
  formatDayKey,
  formatDayKeyWeekday,
  localDayKey,
  percentChange,
  trailingDayKeys,
} from "./time";

/** Platform-wide charts bucket by UTC day so every App Admin sees the same chart. */
export const PLATFORM_TIMEZONE = "UTC";

export type PlatformScheduler = { id: string; email: string; name: string; createdAt: string };
export type PlatformCalendar = {
  id: string;
  schedulerId: string;
  name: string;
  slug: string;
  createdAt: string;
};
export type PlatformMeeting = {
  calendarId: string;
  bookedBy: "guest" | "scheduler";
  durationMinutes: number;
  startsAt: string;
  createdAt: string;
  cancelledAt: string | null;
};

export const ADOPTION_FEATURES = [
  "teams",
  "bookingLinks",
  "webhooks",
  "apiKeys",
  "sequences",
  "salesforce",
] as const;
export type AdoptionFeature = (typeof ADOPTION_FEATURES)[number];

export type PlatformAnalyticsInput = {
  schedulers: PlatformScheduler[];
  calendars: PlatformCalendar[];
  /** Member count per Calendar id. */
  memberCounts: Record<string, number>;
  /** Meetings created or starting in the current + previous window. */
  meetings: PlatformMeeting[];
  /** Most recent Meeting creation per Calendar id (all time). */
  lastBookedAt: Record<string, string>;
  totalMeetingsAllTime: number;
  /** Calendar ids that use each feature. */
  adoption: Record<AdoptionFeature, string[]>;
  outbox: { pending: number; failed: number; delivered: number };
  apiKeys: { active: number; usedInWindow: number };
  now: Date;
  rangeDays: number;
};

export type SchedulerUsage = {
  id: string;
  name: string;
  email: string;
  joinedAt: string;
  calendars: number;
  members: number;
  booked: number;
  cancelled: number;
  lastActiveAt: string | null;
  status: "active" | "idle" | "new";
};

export type CalendarUsage = {
  id: string;
  schedulerId: string;
  name: string;
  slug: string;
  ownerName: string;
  ownerEmail: string;
  members: number;
  booked: number;
  cancelled: number;
  guestShare: number | null;
  lastBookedAt: string | null;
};

export type PlatformDaily = {
  key: string;
  label: string;
  weekday: string;
  guest: number;
  scheduler: number;
  cancelled: number;
  signups: number;
};

export type PlatformAnalytics = {
  rangeDays: number;
  kpis: {
    schedulers: { total: number; active: number; new: Metric };
    calendars: { total: number; active: number; new: Metric };
    members: number;
    booked: Metric;
    held: Metric;
    hours: Metric;
    cancellationRate: { value: number | null; previous: number | null };
    guestShare: number | null;
    totalMeetingsAllTime: number;
    avgMembersPerCalendar: number | null;
  };
  daily: PlatformDaily[];
  topCalendars: CalendarUsage[];
  dormantCalendars: number;
  schedulers: SchedulerUsage[];
  adoption: Array<{ feature: AdoptionFeature; calendars: number; share: number }>;
  health: PlatformAnalyticsInput["outbox"] & PlatformAnalyticsInput["apiKeys"];
};

function ms(instant: string): number {
  return new Date(instant).getTime();
}

function metric(value: number, previous: number): Metric {
  return { value, previous, deltaPct: percentChange(value, previous) };
}

function laterOf(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return ms(a) >= ms(b) ? a : b;
}

/** Pure, platform-wide usage rollup across every Scheduler and Calendar. */
export function computePlatformAnalytics(input: PlatformAnalyticsInput): PlatformAnalytics {
  const { now, rangeDays } = input;
  const nowMs = now.getTime();
  const windowStart = nowMs - rangeDays * DAY_MS;
  const prevStart = nowMs - 2 * rangeDays * DAY_MS;
  const inWindow = (t: number) => t >= windowStart && t <= nowMs;
  const inPrev = (t: number) => t >= prevStart && t < windowStart;

  const bookedNow = input.meetings.filter((m) => inWindow(ms(m.createdAt)));
  const bookedPrev = input.meetings.filter((m) => inPrev(ms(m.createdAt)));
  const active = input.meetings.filter((m) => m.cancelledAt === null);
  const heldNow = active.filter((m) => inWindow(ms(m.startsAt)));
  const heldPrev = active.filter((m) => inPrev(ms(m.startsAt)));
  const hours = (list: PlatformMeeting[]) =>
    list.reduce((total, m) => total + m.durationMinutes, 0) / 60;
  const cancelled = (list: PlatformMeeting[]) => list.filter((m) => m.cancelledAt).length;

  // Per-Calendar rollup of the current window.
  const perCalendar = new Map<string, { booked: number; cancelled: number; guest: number }>();
  for (const m of bookedNow) {
    const row = perCalendar.get(m.calendarId) ?? { booked: 0, cancelled: 0, guest: 0 };
    row.booked += 1;
    if (m.cancelledAt) row.cancelled += 1;
    if (m.bookedBy === "guest") row.guest += 1;
    perCalendar.set(m.calendarId, row);
  }

  const schedulerById = new Map(input.schedulers.map((s) => [s.id, s]));
  const calendarUsage: CalendarUsage[] = input.calendars.map((calendar) => {
    const owner = schedulerById.get(calendar.schedulerId);
    const usage = perCalendar.get(calendar.id) ?? { booked: 0, cancelled: 0, guest: 0 };
    return {
      id: calendar.id,
      schedulerId: calendar.schedulerId,
      name: calendar.name,
      slug: calendar.slug,
      ownerName: owner?.name ?? "Unknown",
      ownerEmail: owner?.email ?? "",
      members: input.memberCounts[calendar.id] ?? 0,
      booked: usage.booked,
      cancelled: usage.cancelled,
      guestShare: usage.booked === 0 ? null : usage.guest / usage.booked,
      lastBookedAt: input.lastBookedAt[calendar.id] ?? null,
    };
  });

  const topCalendars = calendarUsage
    .filter((c) => c.booked > 0)
    .sort((a, b) => b.booked - a.booked || a.name.localeCompare(b.name))
    .slice(0, 8);
  const activeCalendarIds = new Set(calendarUsage.filter((c) => c.booked > 0).map((c) => c.id));

  const schedulers: SchedulerUsage[] = input.schedulers
    .map((scheduler) => {
      const owned = calendarUsage.filter((c) => c.schedulerId === scheduler.id);
      const booked = owned.reduce((total, c) => total + c.booked, 0);
      const lastBooked = owned.reduce<string | null>(
        (latest, c) => laterOf(latest, c.lastBookedAt),
        null,
      );
      const isNew = inWindow(ms(scheduler.createdAt));
      return {
        id: scheduler.id,
        name: scheduler.name,
        email: scheduler.email,
        joinedAt: scheduler.createdAt,
        calendars: owned.length,
        members: owned.reduce((total, c) => total + c.members, 0),
        booked,
        cancelled: owned.reduce((total, c) => total + c.cancelled, 0),
        lastActiveAt: lastBooked,
        status: booked > 0 ? "active" : isNew ? "new" : "idle",
      } satisfies SchedulerUsage;
    })
    .sort(
      (a, b) =>
        b.booked - a.booked ||
        ms(b.lastActiveAt ?? b.joinedAt) - ms(a.lastActiveAt ?? a.joinedAt),
    );

  const dayKeys = trailingDayKeys(now, rangeDays, PLATFORM_TIMEZONE);
  const dayIndex = new Map(dayKeys.map((key, index) => [key, index]));
  const daily: PlatformDaily[] = dayKeys.map((key) => ({
    key,
    label: formatDayKey(key),
    weekday: formatDayKeyWeekday(key),
    guest: 0,
    scheduler: 0,
    cancelled: 0,
    signups: 0,
  }));
  const bump = (instant: string, field: "guest" | "scheduler" | "cancelled" | "signups") => {
    const index = dayIndex.get(localDayKey(new Date(instant), PLATFORM_TIMEZONE));
    if (index !== undefined) daily[index][field] += 1;
  };
  for (const m of bookedNow) bump(m.createdAt, m.bookedBy === "guest" ? "guest" : "scheduler");
  for (const m of input.meetings) {
    if (m.cancelledAt && inWindow(ms(m.cancelledAt))) bump(m.cancelledAt, "cancelled");
  }
  for (const s of input.schedulers) {
    if (inWindow(ms(s.createdAt))) bump(s.createdAt, "signups");
  }

  const totalCalendars = input.calendars.length;
  const totalMembers = Object.values(input.memberCounts).reduce((a, b) => a + b, 0);
  const countCreated = <T extends { createdAt: string }>(list: T[], test: (t: number) => boolean) =>
    list.filter((item) => test(ms(item.createdAt))).length;

  return {
    rangeDays,
    kpis: {
      schedulers: {
        total: input.schedulers.length,
        active: schedulers.filter((s) => s.status === "active").length,
        new: metric(
          countCreated(input.schedulers, inWindow),
          countCreated(input.schedulers, inPrev),
        ),
      },
      calendars: {
        total: totalCalendars,
        active: activeCalendarIds.size,
        new: metric(
          countCreated(input.calendars, inWindow),
          countCreated(input.calendars, inPrev),
        ),
      },
      members: totalMembers,
      booked: metric(bookedNow.length, bookedPrev.length),
      held: metric(heldNow.length, heldPrev.length),
      hours: metric(hours(heldNow), hours(heldPrev)),
      cancellationRate: {
        value: bookedNow.length === 0 ? null : cancelled(bookedNow) / bookedNow.length,
        previous: bookedPrev.length === 0 ? null : cancelled(bookedPrev) / bookedPrev.length,
      },
      guestShare:
        bookedNow.length === 0
          ? null
          : bookedNow.filter((m) => m.bookedBy === "guest").length / bookedNow.length,
      totalMeetingsAllTime: input.totalMeetingsAllTime,
      avgMembersPerCalendar: totalCalendars === 0 ? null : totalMembers / totalCalendars,
    },
    daily,
    topCalendars,
    dormantCalendars: totalCalendars - activeCalendarIds.size,
    schedulers,
    adoption: ADOPTION_FEATURES.map((feature) => {
      const calendars = new Set(input.adoption[feature]).size;
      return {
        feature,
        calendars,
        share: totalCalendars === 0 ? 0 : calendars / totalCalendars,
      };
    }),
    health: { ...input.outbox, ...input.apiKeys },
  };
}
