import { describe, expect, it } from "vitest";
import {
  countSlotsByDate,
  groupSlotsByDate,
  toDateKey,
} from "./group-slots-by-date";
import type { Slot } from "@/lib/types";

describe("groupSlotsByDate", () => {
  it("groups slots by local date in timezone", () => {
    const slots: Slot[] = [
      {
        startsAt: "2026-06-08T14:00:00.000Z",
        durationMinutes: 30,
        eligibleMemberCount: 2,
      },
      {
        startsAt: "2026-06-08T15:00:00.000Z",
        durationMinutes: 30,
        eligibleMemberCount: 1,
      },
      {
        startsAt: "2026-06-09T10:00:00.000Z",
        durationMinutes: 30,
        eligibleMemberCount: 1,
      },
    ];

    const grouped = groupSlotsByDate(slots, "UTC");
    expect(grouped.get("2026-06-08")).toHaveLength(2);
    expect(grouped.get("2026-06-09")).toHaveLength(1);
  });

  it("countSlotsByDate returns counts per day", () => {
    const slots: Slot[] = [
      {
        startsAt: "2026-06-08T14:00:00.000Z",
        durationMinutes: 30,
        eligibleMemberCount: 1,
      },
    ];
    const counts = countSlotsByDate(groupSlotsByDate(slots, "UTC"));
    expect(counts.get("2026-06-08")).toBe(1);
  });

  it("toDateKey respects timezone boundaries", () => {
    // Late UTC evening can be next day in Tokyo
    const key = toDateKey(new Date("2026-06-08T23:00:00.000Z"), "Asia/Tokyo");
    expect(key).toBe("2026-06-09");
  });
});
