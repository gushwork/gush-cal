import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  blockPositionPercent,
  GRID_COLUMN_HEADER_HEIGHT_PX,
  GRID_TOTAL_MINUTES,
  minutesSinceGridStart,
} from "./time-utils";

describe("availability grid column alignment", () => {
  it("uses a shared header height constant across day-view columns", () => {
    expect(GRID_COLUMN_HEADER_HEIGHT_PX).toBe(52);

    const member = readFileSync(
      join(process.cwd(), "components/availability-grid/member-column.tsx"),
      "utf8",
    );
    const bookable = readFileSync(
      join(process.cwd(), "components/availability-grid/bookable-overlay.tsx"),
      "utf8",
    );
    const grid = readFileSync(
      join(process.cwd(), "components/availability-grid/availability-grid.tsx"),
      "utf8",
    );

    expect(member).toContain("GRID_COLUMN_HEADER_HEIGHT_PX");
    expect(bookable).toContain("GRID_COLUMN_HEADER_HEIGHT_PX");
    expect(grid).toContain("GRID_COLUMN_HEADER_HEIGHT_PX}px +");
    expect(grid).toContain("GRID_TOTAL_MINUTES}px *");
    expect(grid).toContain("today-now-line");
  });

  it("renders dotted hour lines in grid bodies", () => {
    const source = readFileSync(
      join(process.cwd(), "components/availability-grid/grid-hour-lines.tsx"),
      "utf8",
    );
    expect(source).toContain("border-dotted");
    expect(source).toContain("grid-hour-lines");
  });
});

describe("minutesSinceGridStart cross-day offsets", () => {
  const tz = "UTC";
  const rangeStart = "2026-06-03T00:00:00.000Z";

  it("returns 0 at the 07:00 grid start", () => {
    expect(minutesSinceGridStart("2026-06-03T07:00:00.000Z", rangeStart, tz)).toBe(0);
  });

  it("subtracts a full day for prior-day instants", () => {
    expect(
      minutesSinceGridStart("2026-06-02T23:00:00.000Z", rangeStart, tz),
    ).toBe(-480);
  });

  it("adds a full day for next-day instants (handles month edges)", () => {
    // 2026-07-01 vs 2026-06-30: +1 day delta, no -1 sentinel.
    expect(
      minutesSinceGridStart(
        "2026-07-01T07:00:00.000Z",
        "2026-06-30T00:00:00.000Z",
        tz,
      ),
    ).toBe(24 * 60);
  });
});

describe("blockPositionPercent grid clamping (BUG-042/043)", () => {
  const tz = "UTC";
  const rangeStart = "2026-06-03T00:00:00.000Z";

  it("draws a cross-midnight block that overlaps the grid, clamped to the top", () => {
    const position = blockPositionPercent(
      "2026-06-02T23:00:00.000Z",
      "2026-06-03T08:00:00.000Z",
      rangeStart,
      tz,
    );
    expect(position).not.toBeNull();
    expect(position?.top).toBe(0);
  });

  it("clamps a same-day pre-07:00 block to the grid top instead of dropping it", () => {
    const position = blockPositionPercent(
      "2026-06-03T06:00:00.000Z",
      "2026-06-03T09:00:00.000Z",
      rangeStart,
      tz,
    );
    expect(position?.top).toBe(0);
  });

  it("returns null for a block entirely on the prior day", () => {
    expect(
      blockPositionPercent(
        "2026-06-02T09:00:00.000Z",
        "2026-06-02T10:00:00.000Z",
        rangeStart,
        tz,
      ),
    ).toBeNull();
  });

  it("returns null for a block entirely after the grid window", () => {
    expect(
      blockPositionPercent(
        "2026-06-03T21:00:00.000Z",
        "2026-06-03T22:00:00.000Z",
        rangeStart,
        tz,
      ),
    ).toBeNull();
  });

  it("returns null for a block on a later day", () => {
    expect(
      blockPositionPercent(
        "2026-06-04T09:00:00.000Z",
        "2026-06-04T10:00:00.000Z",
        rangeStart,
        tz,
      ),
    ).toBeNull();
  });
});
