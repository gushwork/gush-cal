import type { AssignMemberRequest } from "@/lib/ports/slot-engine";
import { getEligibleMembers } from "./eligibility";
import type { SlotEngineDeps } from "./generate-slots";

export function createAssignMember(deps: SlotEngineDeps) {
  return async function assignMember(req: AssignMemberRequest) {
    const startsAt = new Date(req.startsAt);
    const freeBusy = await deps.google.queryFreeBusy({
      memberEmails: req.bundle.members.map((m) => m.email),
      timeMin: req.startsAt,
      timeMax: new Date(
        startsAt.getTime() + req.durationMinutes * 60_000,
      ).toISOString(),
    });

    const eligible = await getEligibleMembers({
      bundle: req.bundle,
      startsAt,
      durationMinutes: req.durationMinutes,
      viewerTimezone: req.viewerTimezone,
      freeBusyByEmail: freeBusy.byEmail,
      db: deps.db,
    });

    if (eligible.length === 0) {
      return { ok: false as const, code: "SLOT_UNAVAILABLE" as const };
    }

    const weekStart = new Date(startsAt.getTime() - 7 * 24 * 60 * 60_000);
    const weekEnd = new Date(startsAt.getTime() + 24 * 60 * 60_000);
    const dayStart = new Date(
      Date.UTC(
        startsAt.getUTCFullYear(),
        startsAt.getUTCMonth(),
        startsAt.getUTCDate(),
      ),
    );
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60_000);

    const scored = await Promise.all(
      eligible.map(async (member) => {
        const [weekly, daily] = await Promise.all([
          deps.db.countMeetingsForMember(
            member.id,
            weekStart.toISOString(),
            weekEnd.toISOString(),
          ),
          deps.db.countMeetingsForMemberOnDay(
            member.id,
            dayStart.toISOString(),
            dayEnd.toISOString(),
          ),
        ]);
        return { member, weekly, daily };
      }),
    );

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
