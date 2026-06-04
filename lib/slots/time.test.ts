import { describe, expect, it } from "vitest";
import { getBookingWindow } from "./time";

const IST = "Asia/Kolkata";

describe("getBookingWindow", () => {
  it("uses viewer timezone for earliest when minNoticeHours > 0", () => {
    const now = new Date("2026-06-03T14:00:00.000Z"); // 19:30 IST
    const { earliest } = getBookingWindow(now, 4, 14, IST);
    // 19:30 IST + 4h = 23:30 IST = 18:00 UTC
    expect(earliest.toISOString()).toBe("2026-06-03T18:00:00.000Z");
  });

  it("uses UTC offset when viewer timezone is omitted", () => {
    const now = new Date("2026-06-03T14:00:00.000Z");
    const { earliest } = getBookingWindow(now, 4, 14);
    expect(earliest.toISOString()).toBe("2026-06-03T18:00:00.000Z");
  });
});
