import { and, count, eq, gte, lt } from "drizzle-orm";
import type { DbMeetingCounter } from "@/lib/ports/meeting-counter";
import type { UtcInstant } from "@/lib/types";
import { getDb, type AppDatabase } from "./client";
import { meetings } from "./schema";

export function createMeetingCounter(database?: AppDatabase): DbMeetingCounter {
  const db = database ?? getDb();
  return {
    async countMeetingsForMember(
      memberId: string,
      windowStart: UtcInstant,
      windowEnd: UtcInstant,
    ): Promise<number> {
      const [row] = await db
        .select({ value: count() })
        .from(meetings)
        .where(
          and(
            eq(meetings.assignedMemberId, memberId),
            gte(meetings.startsAt, windowStart),
            lt(meetings.startsAt, windowEnd),
          ),
        );

      return row?.value ?? 0;
    },

    async countMeetingsForMemberOnDay(
      memberId: string,
      dayStart: UtcInstant,
      dayEnd: UtcInstant,
    ): Promise<number> {
      return this.countMeetingsForMember(memberId, dayStart, dayEnd);
    },
  };
}
