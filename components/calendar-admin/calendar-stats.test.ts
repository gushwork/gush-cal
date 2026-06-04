import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("SP-11 calendar stats", () => {
  it("links to members tab and meetings with icons", () => {
    const source = readFileSync(
      join(process.cwd(), "components/calendar-admin/calendar-stats.tsx"),
      "utf8",
    );
    expect(source).toContain("?tab=members");
    expect(source).toContain("/meetings");
    expect(source).toContain("Users");
    expect(source).toContain("CalendarClock");
  });
});
