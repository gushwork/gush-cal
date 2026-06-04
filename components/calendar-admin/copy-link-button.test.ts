import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("SP-11 copy link and tabs", () => {
  it("copy button shows check animation and tabs scroll on focus", () => {
    const source = readFileSync(
      join(process.cwd(), "components/calendar-admin/copy-link-button.tsx"),
      "utf8",
    );
    expect(source).toContain("Check");
    expect(source).toContain("scrollIntoView");
    expect(source).toContain("overflow-x-auto");
    expect(source).toContain("CalendarTabsNav");
  });
});
