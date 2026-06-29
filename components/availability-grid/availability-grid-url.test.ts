import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("AvailabilityGrid URL sync", () => {
  it("reads and writes availability search params via the router", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "components/availability-grid/availability-grid.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("useSearchParams");
    expect(source).toContain("router.replace");
    expect(source).toContain("parseAvailabilitySearchParams");
    expect(source).toContain("buildAvailabilitySearchParams");
    expect(source).toContain("navigateToDate");
  });

  it("syncs state from external URL changes and drops the dead navigation ref", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "components/availability-grid/availability-grid.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("setAnchorDate(initialParams.anchorDate)");
    expect(source).toContain("setViewMode(initialParams.viewMode)");
    expect(source).not.toContain("userNavigatedRef");
  });
});
