import type { UtcInstant } from "@/lib/types";

export interface DbMeetingCounter {
  countMeetingsForMember(
    memberId: string,
    windowStart: UtcInstant,
    windowEnd: UtcInstant,
  ): Promise<number>;
  countMeetingsForMemberOnDay(
    memberId: string,
    dayStart: UtcInstant,
    dayEnd: UtcInstant,
  ): Promise<number>;
  listMeetingStartsForMembers(
    memberIds: string[],
    windowStart: UtcInstant,
    windowEnd: UtcInstant,
  ): Promise<Map<string, UtcInstant[]>>;
}
