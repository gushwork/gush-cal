import type { FreeBusyResult } from "@/lib/ports/google-calendar";
import type { CalendarMember, MemberBusyBlock } from "@/lib/types";

export function buildMemberBusyBlocks(
  members: CalendarMember[],
  freeBusy: FreeBusyResult,
): MemberBusyBlock[] {
  return members.map((member) => {
    const entry = freeBusy.byEmail[member.email];

    if (!entry || entry.status === "error") {
      return {
        memberId: member.id,
        email: member.email,
        status: "inaccessible",
        errorCode: entry?.status === "error" ? entry.code : "NOT_FOUND",
        busy: [],
      };
    }

    return {
      memberId: member.id,
      email: member.email,
      status: "accessible",
      busy: entry.busy,
    };
  });
}
