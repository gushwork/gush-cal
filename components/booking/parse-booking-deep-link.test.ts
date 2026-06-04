import { describe, expect, it } from "vitest";
import {
  findSlotForDeepLink,
  normalizeBookingTimeParam,
  parseBookingDeepLink,
} from "./parse-booking-deep-link";
import type { Slot } from "@/lib/types";

describe("parseBookingDeepLink", () => {
  it("parses date, time, and duration from search params", () => {
    const params = new URLSearchParams({
      date: "2026-06-05",
      time: "09:00",
      duration: "60",
    });
    expect(parseBookingDeepLink(params, [30, 60])).toEqual({
      date: "2026-06-05",
      time: "09:00",
      durationMinutes: 60,
    });
  });

  it("normalizes single-digit hours", () => {
    const params = new URLSearchParams({
      date: "2026-06-05",
      time: "9:00",
    });
    expect(parseBookingDeepLink(params, [60])?.time).toBe("09:00");
  });

  it("returns null for invalid params", () => {
    expect(
      parseBookingDeepLink(
        new URLSearchParams({ date: "bad", time: "09:00" }),
        [60],
      ),
    ).toBeNull();
    expect(normalizeBookingTimeParam("9")).toBeNull();
  });
});

describe("findSlotForDeepLink", () => {
  it("matches slot by local date and time in viewer timezone", () => {
    const slots: Slot[] = [
      {
        startsAt: "2026-06-05T03:30:00.000Z",
        durationMinutes: 60,
        eligibleMemberCount: 1,
      },
    ];
    const match = findSlotForDeepLink(
      slots,
      { date: "2026-06-05", time: "09:00" },
      "Asia/Kolkata",
    );
    expect(match?.startsAt).toBe("2026-06-05T03:30:00.000Z");
  });
});
