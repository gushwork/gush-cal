import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("SP-12 member list", () => {
  it("uses Avatar, min height, and chevron affordance", () => {
    const source = readFileSync(
      join(process.cwd(), "components/calendar-admin/member-list.tsx"),
      "utf8",
    );
    expect(source).toContain("Avatar");
    expect(source).toContain("min-h-14");
    expect(source).toContain("ChevronRight");
  });
});
