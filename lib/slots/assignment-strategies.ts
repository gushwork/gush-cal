import type { CalendarMember } from "@/lib/types";
import type { AssignmentMode } from "@/lib/types/platform";

export type PickAssignedMemberInput = {
  mode: AssignmentMode;
  eligible: CalendarMember[];
  meetingCounts: Map<string, { daily: number; weekly: number }>;
  poolKey: string;
  strictRotation: Record<string, string>;
  weightedDeficits: Record<string, Record<string, number>>;
};

function bySortOrder(a: CalendarMember, b: CalendarMember): number {
  return a.sortOrder - b.sortOrder;
}

function pickStrictRoundRobin(
  eligible: CalendarMember[],
  poolKey: string,
  strictRotation: Record<string, string>,
): CalendarMember {
  const sorted = [...eligible].sort(bySortOrder);
  const lastId = strictRotation[poolKey];
  const lastIndex = lastId
    ? sorted.findIndex((member) => member.id === lastId)
    : -1;

  for (let offset = 1; offset <= sorted.length; offset++) {
    const member = sorted[(lastIndex + offset) % sorted.length]!;
    if (eligible.some((candidate) => candidate.id === member.id)) {
      return member;
    }
  }

  return sorted[0]!;
}

function pickLoadBalanced(
  eligible: CalendarMember[],
  meetingCounts: Map<string, { daily: number; weekly: number }>,
): CalendarMember {
  const scored = eligible.map((member) => {
    const counts = meetingCounts.get(member.id) ?? { daily: 0, weekly: 0 };
    return { member, weekly: counts.weekly, daily: counts.daily };
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

  return scored[0]!.member;
}

function pickWeightedRoundRobin(
  eligible: CalendarMember[],
  poolKey: string,
  weightedDeficits: Record<string, Record<string, number>>,
): CalendarMember {
  const poolDeficits = weightedDeficits[poolKey] ?? {};
  const scored = eligible.map((member) => ({
    member,
    deficit: (poolDeficits[member.id] ?? 0) + member.assignmentWeight,
    sortOrder: member.sortOrder,
  }));

  scored.sort((a, b) => {
    if (a.deficit !== b.deficit) {
      return b.deficit - a.deficit;
    }
    return a.sortOrder - b.sortOrder;
  });

  return scored[0]!.member;
}

export function pickAssignedMember(input: PickAssignedMemberInput): CalendarMember {
  const { mode, eligible, meetingCounts, poolKey, strictRotation, weightedDeficits } =
    input;

  if (eligible.length === 0) {
    throw new Error("pickAssignedMember requires at least one eligible member");
  }

  switch (mode) {
    case "first_free":
      return [...eligible].sort(bySortOrder)[0]!;
    case "strict_round_robin":
      return pickStrictRoundRobin(eligible, poolKey, strictRotation);
    case "load_balanced_round_robin":
      return pickLoadBalanced(eligible, meetingCounts);
    case "weighted_round_robin":
      return pickWeightedRoundRobin(eligible, poolKey, weightedDeficits);
    case "random":
      return eligible[Math.floor(Math.random() * eligible.length)]!;
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}
