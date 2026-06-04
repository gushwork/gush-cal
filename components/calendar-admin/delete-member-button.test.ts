import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("SP-12 delete member", () => {
  it("uses toast on compact errors and touch-visible delete", () => {
    const source = readFileSync(
      join(process.cwd(), "components/calendar-admin/delete-member-button.tsx"),
      "utf8",
    );
    expect(source).toContain("toast");
    expect(source).toContain("md:opacity-0");
    expect(source).not.toContain("alert(");
  });
});
