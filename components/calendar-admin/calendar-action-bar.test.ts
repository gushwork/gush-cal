import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("SP-11 calendar action bar", () => {
  it("uses Button asChild for secondary actions", () => {
    const source = readFileSync(
      join(process.cwd(), "components/calendar-admin/calendar-action-bar.tsx"),
      "utf8",
    );
    expect(source).toContain("Button asChild");
    expect(source).toContain('variant="secondary"');
    expect(source).not.toContain("linkButtonClassName");
  });
});
