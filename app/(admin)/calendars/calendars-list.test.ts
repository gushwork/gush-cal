import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("SP-10 calendars list", () => {
  it("uses Button asChild, icons, empty state, and row hover", () => {
    const source = readFileSync(
      join(process.cwd(), "app/(admin)/calendars/page.tsx"),
      "utf8",
    );
    expect(source).toContain("Button asChild");
    expect(source).toContain("CalendarDays");
    expect(source).toContain("Calendar");
    expect(source).toContain("EmptyState");
    expect(source).toContain("hover:bg-primary-soft/40");
    expect(source).toContain("min-h-11");
    expect(source).toContain("upcoming");
  });
});
