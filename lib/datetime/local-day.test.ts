import { describe, expect, it, vi } from "vitest";
import { getBookingWindow } from "@/lib/slots/time";
import { addLocalDays, endOfLocalDay, startOfLocalDay } from "./local-day";

const IST = "Asia/Kolkata";

describe("addLocalDays", () => {
  it("adds one calendar day across month boundaries in IST", () => {
    const jan31 = startOfLocalDay(new Date("2026-01-30T18:30:00.000Z"), IST);
    const feb1 = addLocalDays(jan31, 1, IST);
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: IST,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(feb1);
    expect(parts).toBe("2026-02-01");
  });
});

describe("getBookingWindow", () => {
  it("uses end of calendar day N days ahead in IST, not rolling 24h", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-03T04:30:00.000Z")); // 10:00 IST

    const { latest } = getBookingWindow(new Date(), 4, 1, IST);
    const tomorrowEnd = endOfLocalDay(
      addLocalDays(startOfLocalDay(new Date(), IST), 1, IST),
      IST,
    );

    expect(latest.getTime()).toBe(tomorrowEnd.getTime());
    vi.useRealTimers();
  });
});
