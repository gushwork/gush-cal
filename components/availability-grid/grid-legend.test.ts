import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("SP-20 grid legend", () => {
  it("exports GridLegend", async () => {
    const { GridLegend } = await import("./grid-legend");
    expect(GridLegend).toBeTypeOf("function");
  });

  it("uses visible Legend label and inaccessible tooltip", () => {
    const source = readFileSync(
      join(process.cwd(), "components/availability-grid/grid-legend.tsx"),
      "utf8",
    );
    expect(source).toContain("Legend:");
    expect(source).toContain("grid-legend-label");
    expect(source).toContain("Member calendar could not be read");
    expect(source).not.toContain("aria-pressed");
  });
});
