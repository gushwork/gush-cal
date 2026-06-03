import { describe, expect, it } from "vitest";
import {
  addLocalDays,
  blockPositionPercent,
  endOfLocalDay,
  startOfLocalDay,
  startOfLocalWeek,
  toUtcInstant,
} from "./time-utils";

const TZ = "America/New_York";

describe("time-utils", () => {
  it("computes day range boundaries in a timezone", () => {
    const date = new Date("2026-06-03T15:00:00.000Z");
    const start = startOfLocalDay(date, TZ);
    const end = endOfLocalDay(date, TZ);

    expect(start.getTime()).toBeLessThan(end.getTime());
    expect(
      new Intl.DateTimeFormat("en-US", {
        timeZone: TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "numeric",
        minute: "numeric",
        hour12: false,
      }).format(start),
    ).toBe("06/03/2026, 00:00");
    expect(
      new Intl.DateTimeFormat("en-US", {
        timeZone: TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "numeric",
        minute: "numeric",
        hour12: false,
      }).format(end),
    ).toBe("06/03/2026, 23:59");
    expect(end.getMilliseconds()).toBe(999);
  });

  it("starts week on Sunday in viewer timezone", () => {
    const wednesday = new Date("2026-06-03T15:00:00.000Z");
    const weekStart = startOfLocalWeek(wednesday, TZ);

    expect(
      new Intl.DateTimeFormat("en-US", {
        timeZone: TZ,
        weekday: "short",
      }).format(weekStart),
    ).toBe("Sun");
  });

  it("positions blocks within the day grid", () => {
    const rangeStart = "2026-06-03T04:00:00.000Z";
    const position = blockPositionPercent(
      "2026-06-03T14:00:00.000Z",
      "2026-06-03T15:00:00.000Z",
      rangeStart,
      TZ,
    );

    expect(position).not.toBeNull();
    expect(position!.top).toBeGreaterThan(0);
    expect(position!.height).toBeGreaterThan(0);
  });

  it("returns null for blocks outside the visible grid", () => {
    const rangeStart = "2026-06-03T04:00:00.000Z";
    const position = blockPositionPercent(
      "2026-06-03T02:00:00.000Z",
      "2026-06-03T03:00:00.000Z",
      rangeStart,
      TZ,
    );

    expect(position).toBeNull();
  });

  it("positions slots on the same local day as rangeStart", () => {
    const rangeStart = toUtcInstant(startOfLocalDay(new Date("2026-06-04T15:00:00.000Z"), TZ));
    const position = blockPositionPercent(
      "2026-06-04T14:00:00.000Z",
      "2026-06-04T15:00:00.000Z",
      rangeStart,
      TZ,
    );

    expect(position).not.toBeNull();
  });

  it("returns null when slot is on a different local day than rangeStart", () => {
    const rangeStart = toUtcInstant(startOfLocalDay(new Date("2026-06-03T15:00:00.000Z"), TZ));
    const position = blockPositionPercent(
      "2026-06-04T14:00:00.000Z",
      "2026-06-04T15:00:00.000Z",
      rangeStart,
      TZ,
    );

    expect(position).toBeNull();
  });

  it("addLocalDays lands on the next local calendar day", () => {
    const today = new Date("2026-06-03T18:00:00.000Z");
    const tomorrow = addLocalDays(today, 1, TZ);
    const start = startOfLocalDay(tomorrow, TZ);
    const end = endOfLocalDay(tomorrow, TZ);

    expect(start.getTime()).toBeLessThan(end.getTime());
    expect(
      new Intl.DateTimeFormat("en-US", {
        timeZone: TZ,
        month: "2-digit",
        day: "2-digit",
      }).format(start),
    ).toBe("06/04");
    expect(
      new Intl.DateTimeFormat("en-US", {
        timeZone: TZ,
        month: "2-digit",
        day: "2-digit",
      }).format(end),
    ).toBe("06/04");
  });
});
