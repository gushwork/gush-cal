import type { CalendarSchedulingSettings } from "@/lib/types/platform";
import type { CalendarMember } from "@/lib/types";
import {
  advanceStrictRotation,
  advanceWeightedDeficits,
} from "@/lib/scheduling/load-scheduling-settings";
import { schedulingPoolKey } from "@/lib/scheduling/pool-key";

export async function advanceAssignmentState(input: {
  calendarId: string;
  scheduling: CalendarSchedulingSettings;
  teamId?: string;
  member: CalendarMember;
  eligibleMembers: CalendarMember[];
}): Promise<void> {
  const mode = input.scheduling.assignmentMode;
  const poolKey = schedulingPoolKey(input.calendarId, input.teamId);

  if (mode === "strict_round_robin") {
    await advanceStrictRotation(input.calendarId, poolKey, input.member.id);
    return;
  }

  if (mode === "weighted_round_robin") {
    const weights = Object.fromEntries(
      input.eligibleMembers.map((member) => [
        member.id,
        member.assignmentWeight,
      ]),
    );
    await advanceWeightedDeficits(
      input.calendarId,
      poolKey,
      input.member.id,
      input.eligibleMembers.map((member) => member.id),
      weights,
    );
  }
}
