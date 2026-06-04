import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("SP-11 calendar detail overview", () => {
  it("uses PageHeader, tabs nav, and overview shell", () => {
    const source = readFileSync(
      join(process.cwd(), "app/(admin)/calendars/[id]/page.tsx"),
      "utf8",
    );
    expect(source).toContain("PageHeader");
    expect(source).toContain("CalendarTabsNav");
    expect(source).toContain("CopyLinkButton");
    expect(source).not.toContain("sm:text-3xl");
    expect(source).toContain('tab === "overview"');
    expect(source).toContain("calendarId={id}");
  });
});
