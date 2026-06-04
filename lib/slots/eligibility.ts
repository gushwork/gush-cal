import type { GoogleCalendarPort } from "@/lib/ports/google-calendar";
import type { DbMeetingCounter } from "@/lib/ports/meeting-counter";
import type {
  CalendarBundle,
  CalendarMember,
  IanaTimezone,
  UtcInstant,
} from "@/lib/types";
import { effectiveCaps } from "./cap-limits";
import {
  effectiveTimezone,
  effectiveWorkingHours,
  isWithinWorkingHours,
} from "./working-hours";

export type EligibilityContext = {
  bundle: CalendarBundle;
  startsAt: Date;
  durationMinutes: number;
  viewerTimezone: IanaTimezone;
  freeBusyByEmail: Awaited<
    ReturnType<GoogleCalendarPort["queryFreeBusy"]>
  >["byEmail"];
  meetingCounts: Map<
    string,
    { daily: number; weekly: number }
  >;
};

export function isSlotBusyForMember(
  startsAt: Date,
  durationMinutes: number,
  busyBlocks: Array<{ start: UtcInstant; end: UtcInstant }>,
): boolean {
  const slotEnd = new Date(startsAt.getTime() + durationMinutes * 60_000);

  return busyBlocks.some((block) => {
    const busyStart = new Date(block.start);
    const busyEnd = new Date(block.end);
    return startsAt < busyEnd && slotEnd > busyStart;
  });
}

export function isMemberEligible(ctx: EligibilityContext, member: CalendarMember): boolean {
  const { bundle, startsAt, durationMinutes, freeBusyByEmail, meetingCounts } = ctx;

  const hours = effectiveWorkingHours(member, bundle);
  const memberTimezone = effectiveTimezone(member, bundle);
  if (!isWithinWorkingHours(startsAt, durationMinutes, hours, memberTimezone)) {
    return false;
  }

  const busyEntry = freeBusyByEmail[member.email];
  if (!busyEntry || busyEntry.status === "error") {
    return false;
  }

  if (isSlotBusyForMember(startsAt, durationMinutes, busyEntry.busy)) {
    return false;
  }

  const caps = effectiveCaps(member, bundle);
  const counts = meetingCounts.get(member.id) ?? { daily: 0, weekly: 0 };

  if (counts.daily >= caps.maxPerDay || counts.weekly >= caps.maxPerWeek) {
    return false;
  }

  return true;
}

export async function buildMeetingCounts(
  members: CalendarMember[],
  slotStart: Date,
  db: DbMeetingCounter,
): Promise<Map<string, { daily: number; weekly: number }>> {
  const weekStart = new Date(slotStart.getTime() - 7 * 24 * 60 * 60_000);
  const weekEnd = new Date(slotStart.getTime() + 24 * 60 * 60_000);
  const prefetched = await db.listMeetingStartsForMembers(
    members.map((member) => member.id),
    weekStart.toISOString(),
    weekEnd.toISOString(),
  );

  return buildMeetingCountsFromPrefetch(members, slotStart, prefetched);
}

export function buildMeetingCountsFromPrefetch(
  members: CalendarMember[],
  slotStart: Date,
  prefetchedMeetings: Map<string, UtcInstant[]>,
): Map<string, { daily: number; weekly: number }> {
  const counts = new Map<string, { daily: number; weekly: number }>();

  for (const member of members) {
    counts.set(
      member.id,
      meetingCountsForSlot(
        slotStart,
        prefetchedMeetings.get(member.id) ?? [],
      ),
    );
  }

  return counts;
}

export function meetingCountsForSlot(
  slotStart: Date,
  meetingStarts: UtcInstant[],
): { daily: number; weekly: number } {
  const dayStart = startOfUtcDay(slotStart);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60_000);
  const weekStart = new Date(slotStart.getTime() - 7 * 24 * 60 * 60_000);
  const weekEnd = new Date(slotStart.getTime() + 24 * 60 * 60_000);
  const dayStartMs = dayStart.getTime();
  const dayEndMs = dayEnd.getTime();
  const weekStartMs = weekStart.getTime();
  const weekEndMs = weekEnd.getTime();

  let daily = 0;
  let weekly = 0;

  for (const start of meetingStarts) {
    const time = new Date(start).getTime();
    if (time >= dayStartMs && time < dayEndMs) {
      daily++;
    }
    if (time >= weekStartMs && time < weekEndMs) {
      weekly++;
    }
  }

  return { daily, weekly };
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function getEligibleMembersSync(
  ctx: Omit<EligibilityContext, "meetingCounts"> & {
    prefetchedMeetings: Map<string, UtcInstant[]>;
  },
): CalendarMember[] {
  const meetingCounts = buildMeetingCountsFromPrefetch(
    ctx.bundle.members,
    ctx.startsAt,
    ctx.prefetchedMeetings,
  );
  const fullCtx: EligibilityContext = { ...ctx, meetingCounts };
  return ctx.bundle.members.filter((member) => isMemberEligible(fullCtx, member));
}

export async function getEligibleMembers(
  ctx: Omit<EligibilityContext, "meetingCounts"> & {
    db: DbMeetingCounter;
    prefetchedMeetings?: Map<string, UtcInstant[]>;
  },
): Promise<CalendarMember[]> {
  if (ctx.prefetchedMeetings) {
    return getEligibleMembersSync({
      ...ctx,
      prefetchedMeetings: ctx.prefetchedMeetings,
    });
  }

  const meetingCounts = await buildMeetingCounts(
    ctx.bundle.members,
    ctx.startsAt,
    ctx.db,
  );
  const fullCtx: EligibilityContext = { ...ctx, meetingCounts };

  return ctx.bundle.members.filter((member) => isMemberEligible(fullCtx, member));
}
