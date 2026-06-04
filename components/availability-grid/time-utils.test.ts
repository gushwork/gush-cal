import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  GRID_COLUMN_HEADER_HEIGHT_PX,
  GRID_TOTAL_MINUTES,
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
