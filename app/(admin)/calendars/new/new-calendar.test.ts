import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("SP-13 new calendar page", () => {
  it("uses narrow container and settings section heading", () => {
    const source = readFileSync(
      join(process.cwd(), "app/(admin)/calendars/new/page.tsx"),
      "utf8",
    );
    expect(source).toContain('variant="narrow"');
    expect(source).toContain("text-heading");
    expect(source).toContain("New Calendar");
  });
});
