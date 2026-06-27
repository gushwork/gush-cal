import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("SP-11 calendar detail overview", () => {
  it("uses layout shell with sidebar and overview stats", () => {
    const layout = readFileSync(
      join(process.cwd(), "app/(admin)/calendars/[id]/layout.tsx"),
      "utf8",
    );
    const page = readFileSync(
      join(process.cwd(), "app/(admin)/calendars/[id]/page.tsx"),
      "utf8",
    );
    expect(layout).toContain("CalendarSidebar");
    expect(layout).toContain("PageHeader");
    expect(layout).toContain("CopyLinkButton");
    expect(page).toContain("CalendarStats");
    expect(page).toContain("calendarId={id}");
    expect(page).not.toContain("CalendarTabsNav");
  });
});
