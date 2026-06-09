import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("SP-20 availability toolbar", () => {
  it("exports AvailabilityGridToolbar", async () => {
    const { AvailabilityGridToolbar } = await import(
      "./availability-grid-toolbar"
    );
    expect(AvailabilityGridToolbar).toBeTypeOf("function");
  });

  it("uses chevron icons, two-row layout, PageHeader-style back link, and TZ label", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "components/availability-grid/availability-grid-toolbar.tsx",
      ),
      "utf8",
    );
    expect(source).toContain("ChevronLeft");
    expect(source).toContain("ChevronRight");
    expect(source).toContain("md:flex-row");
    expect(source).toContain("text-sm text-ink-muted");
    expect(source).toContain("Times in");
    expect(source).toContain("viewer-timezone");
    expect(source).toContain('data-testid="nav-prev"');
    expect(source).toContain("ChevronLeft");
    expect(source).toContain("ArrowRight");
    expect(source).toContain("AvailabilityDatePicker");
    expect(source).toContain("onSelectDate");
  });
});
