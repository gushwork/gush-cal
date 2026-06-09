import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("AvailabilityDatePicker", () => {
  it("exports a popover calendar trigger with week range modifiers", async () => {
    const { AvailabilityDatePicker } = await import("./availability-date-picker");
    expect(AvailabilityDatePicker).toBeTypeOf("function");
  });

  it("uses ghost trigger, chevron, and week range styling", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "components/availability-grid/availability-date-picker.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("availability-date-trigger");
    expect(source).toContain("ChevronDown");
    expect(source).toContain("weekRange");
    expect(source).toContain("bg-primary-100");
    expect(source).toContain("PopoverContent");
  });
});
