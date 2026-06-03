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
  const dayStart = startOfUtcDay(slotStart);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60_000);
  const weekStart = new Date(slotStart.getTime() - 7 * 24 * 60 * 60_000);
  const weekEnd = new Date(slotStart.getTime() + 24 * 60 * 60_000);

  const counts = new Map<string, { daily: number; weekly: number }>();

  await Promise.all(
    members.map(async (member) => {
      const [daily, weekly] = await Promise.all([
        db.countMeetingsForMemberOnDay(
          member.id,
          dayStart.toISOString(),
          dayEnd.toISOString(),
        ),
        db.countMeetingsForMember(
          member.id,
          weekStart.toISOString(),
          weekEnd.toISOString(),
        ),
      ]);
      counts.set(member.id, { daily, weekly });
    }),
  );

  return counts;
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export async function getEligibleMembers(
  ctx: Omit<EligibilityContext, "meetingCounts"> & { db: DbMeetingCounter },
): Promise<CalendarMember[]> {
  const meetingCounts = await buildMeetingCounts(
    ctx.bundle.members,
    ctx.startsAt,
    ctx.db,
  );

  const fullCtx: EligibilityContext = { ...ctx, meetingCounts };

  return ctx.bundle.members.filter((member) => isMemberEligible(fullCtx, member));
}
