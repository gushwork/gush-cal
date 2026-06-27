import type { AssignMemberRequest } from "@/lib/ports/slot-engine";
import { schedulingPoolKey } from "@/lib/scheduling/pool-key";
import { filterBundleMembers } from "./filter-members";
import {
  buildMeetingCountsFromPrefetch,
  getEligibleMembers,
} from "./eligibility";
import { pickAssignedMember } from "./assignment-strategies";
import type { SlotEngineDeps } from "./generate-slots";

export function createAssignMember(deps: SlotEngineDeps) {
  return async function assignMember(req: AssignMemberRequest) {
    const members = await filterBundleMembers(req.bundle, {
      teamId: req.teamId,
      memberId: req.memberId,
    });
    if (members.length === 0) {
      return { ok: false as const, code: "SLOT_UNAVAILABLE" as const };
    }
    const bundle = { ...req.bundle, members };

    const startsAt = new Date(req.startsAt);
    const weekStart = new Date(startsAt.getTime() - 7 * 24 * 60 * 60_000);
    const weekEnd = new Date(startsAt.getTime() + 24 * 60 * 60_000);

    const [freeBusy, prefetchedMeetings] = await Promise.all([
      deps.google.queryFreeBusy({
        memberEmails: bundle.members.map((m) => m.email),
        timeMin: req.startsAt,
        timeMax: new Date(
          startsAt.getTime() + req.durationMinutes * 60_000,
        ).toISOString(),
      }),
      deps.db.listMeetingStartsForMembers(
        bundle.members.map((member) => member.id),
        weekStart.toISOString(),
        weekEnd.toISOString(),
      ),
    ]);

    const eligible = await getEligibleMembers({
      bundle,
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

    if (req.memberId) {
      const pinned = eligible.find((member) => member.id === req.memberId);
      if (!pinned) {
        return { ok: false as const, code: "SLOT_UNAVAILABLE" as const };
      }
      return { ok: true as const, member: pinned, eligibleMembers: eligible };
    }

    const meetingCounts = buildMeetingCountsFromPrefetch(
      eligible,
      startsAt,
      prefetchedMeetings,
    );

    const poolKey = schedulingPoolKey(req.bundle.id, req.teamId);
    const member = pickAssignedMember({
      mode: req.scheduling.assignmentMode,
      eligible,
      meetingCounts,
      poolKey,
      strictRotation: req.scheduling.strictRotation,
      weightedDeficits: req.scheduling.weightedDeficits,
    });

    return { ok: true as const, member, eligibleMembers: eligible };
  };
}
