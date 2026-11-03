import { describe, expect, it } from "vitest";
import {
  formatLeadTime,
  formatRelative,
  leadingDayKeys,
  localWeekdayHour,
  median,
  parseAnalyticsRange,
  percentChange,
  trailingDayKeys,
} from "./time";

describe("analytics time helpers", () => {
  it("parses only supported ranges", () => {
    expect(parseAnalyticsRange("7")).toBe(7);
    expect(parseAnalyticsRange(["90", "7"])).toBe(90);
    expect(parseAnalyticsRange("14")).toBe(30);
    expect(parseAnalyticsRange(undefined)).toBe(30);
  });

  it("builds trailing and leading local day keys across a DST change", () => {
    // US DST ended 2026-11-01; keys must still be consecutive calendar days.
    const now = new Date("2026-11-03T15:00:00Z");
    expect(trailingDayKeys(now, 4, "America/New_York")).toEqual([
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
    ]);
    expect(leadingDayKeys(now, 2, "Asia/Tokyo")).toEqual(["2026-11-04", "2026-11-05"]);
  });

  it("buckets weekday (Mon=0) and hour in the given timezone", () => {
    // 2026-11-02 is a Monday; 23:30 UTC is Tuesday 08:30 in Tokyo.
    expect(localWeekdayHour(new Date("2026-11-02T23:30:00Z"), "Asia/Tokyo")).toEqual({
      weekday: 1,
      hour: 8,
    });
    expect(localWeekdayHour(new Date("2026-11-08T12:00:00Z"), "UTC")).toEqual({
      weekday: 6,
      hour: 12,
    });
  });

  it("computes percent change, median and labels", () => {
    expect(percentChange(15, 10)).toBe(50);
    expect(percentChange(0, 0)).toBe(0);
    expect(percentChange(3, 0)).toBeNull();
    expect(median([5, 1, 3])).toBe(3);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBeNull();
    expect(formatLeadTime(0.5)).toBe("30m");
    expect(formatLeadTime(20)).toBe("20h");
    expect(formatLeadTime(72)).toBe("3d");
    const now = new Date("2026-11-03T12:00:00Z");
    expect(formatRelative("2026-11-03T09:00:00Z", now)).toBe("3h ago");
    expect(formatRelative(null, now)).toBe("Never");
  });
});
