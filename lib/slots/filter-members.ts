import { getTeamMemberIds } from "@/lib/teams/teams";
import type { CalendarBundle, CalendarMember } from "@/lib/types";

export async function filterBundleMembers(
  bundle: CalendarBundle,
  opts: { teamId?: string; memberId?: string },
): Promise<CalendarMember[]> {
  if (opts.memberId) {
    return bundle.members.filter((member) => member.id === opts.memberId);
  }
  if (opts.teamId) {
    const ids = await getTeamMemberIds(opts.teamId);
    const idSet = new Set(ids);
    return bundle.members.filter((member) => idSet.has(member.id));
  }
  return bundle.members;
}
