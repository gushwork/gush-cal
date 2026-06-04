import type { AssignMemberRequest } from "@/lib/ports/slot-engine";
import {
  buildMeetingCountsFromPrefetch,
  getEligibleMembers,
} from "./eligibility";
import type { SlotEngineDeps } from "./generate-slots";

export function createAssignMember(deps: SlotEngineDeps) {
  return async function assignMember(req: AssignMemberRequest) {
    const startsAt = new Date(req.startsAt);
    const weekStart = new Date(startsAt.getTime() - 7 * 24 * 60 * 60_000);
    const weekEnd = new Date(startsAt.getTime() + 24 * 60 * 60_000);

    const [freeBusy, prefetchedMeetings] = await Promise.all([
      deps.google.queryFreeBusy({
        memberEmails: req.bundle.members.map((m) => m.email),
        timeMin: req.startsAt,
        timeMax: new Date(
          startsAt.getTime() + req.durationMinutes * 60_000,
        ).toISOString(),
      }),
      deps.db.listMeetingStartsForMembers(
        req.bundle.members.map((member) => member.id),
        weekStart.toISOString(),
        weekEnd.toISOString(),
      ),
    ]);

    const eligible = await getEligibleMembers({
      bundle: req.bundle,
      startsAt,
      durationMinutes: req.durationMinutes,
      viewerTimezone: req.viewerTimezone,
      freeBusyByEmail: freeBusy.byEmail,
      db: deps.db,
      prefetchedMeetings,
    });

    if (eligible.length === 0) {
      return { ok: false as const, code: "SLOT_UNAVAILABLE" as const };
    }

    const meetingCounts = buildMeetingCountsFromPrefetch(
      eligible,
      startsAt,
      prefetchedMeetings,
    );

    const scored = eligible.map((member) => {
      const counts = meetingCounts.get(member.id) ?? { daily: 0, weekly: 0 };
      return {
        member,
        weekly: counts.weekly,
        daily: counts.daily,
      };
    });

    scored.sort((a, b) => {
      if (a.weekly !== b.weekly) {
        return a.weekly - b.weekly;
      }
      if (a.daily !== b.daily) {
        return a.daily - b.daily;
      }
      return a.member.sortOrder - b.member.sortOrder;
    });

    return { ok: true as const, member: scored[0]!.member };
  };
}
