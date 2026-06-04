import { describe, expect, it, vi } from "vitest";
import { violatesMinNotice } from "./validate-min-notice";

describe("violatesMinNotice", () => {
  it("returns false when minNoticeHours is 0", () => {
    expect(
      violatesMinNotice({
        startsAt: "2026-06-03T15:00:00.000Z",
        minNoticeHours: 0,
        viewerTimezone: "UTC",
        now: new Date("2026-06-03T14:00:00.000Z"),
      }),
    ).toBe(false);
  });

  it("returns true when startsAt is before viewer-local earliest", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-03T14:00:00.000Z")); // 19:30 IST

    expect(
      violatesMinNotice({
        startsAt: "2026-06-04T10:00:00.000Z", // 15:30 IST Thu — before 19:30 + 24h
        minNoticeHours: 24,
        viewerTimezone: "Asia/Kolkata",
      }),
    ).toBe(true);

    vi.useRealTimers();
  });
});
