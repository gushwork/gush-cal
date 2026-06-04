import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("SP-21 availability grid body", () => {
  it("uses skeleton loading, debounce, AlertBanner, and deep links", () => {
    const grid = readFileSync(
      join(
        process.cwd(),
        "components/availability-grid/availability-grid.tsx",
      ),
      "utf8",
    );
    expect(grid).toContain("LOAD_DEBOUNCE_MS = 300");
    expect(grid).toContain("grid-skeleton");
    expect(grid).toContain('variant="info"');
    expect(grid).toContain("AvailabilityGridToolbar");
    expect(grid).toContain("nowLinePercent");
    expect(grid).toContain("today-now-line");
    expect(grid).toContain("GRID_COLUMN_HEADER_HEIGHT_PX");
    expect(grid).toContain("GridHourLines");
    expect(grid).toContain("revealedWeekDays");
  });

  it("member columns stretch and truncate with title", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "components/availability-grid/member-column.tsx",
      ),
      "utf8",
    );
    expect(source).toContain("min-w-0 flex-1");
    expect(source).toContain("truncate");
    expect(source).toContain("title={displayName}");
    expect(source).not.toContain("today-now-line");
  });

  it("bookable slots link to admin book with date and time", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "components/availability-grid/bookable-overlay.tsx",
      ),
      "utf8",
    );
    expect(source).toContain("/book?");
    expect(source).toContain("date");
    expect(source).toContain("time");
    expect(source).toContain("duration");
    expect(source).toContain("bookable-slot");
  });
});
