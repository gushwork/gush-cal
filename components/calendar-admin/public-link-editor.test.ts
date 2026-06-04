import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("SP-13 public link editor", () => {
  it("uses AlertBanner for slug errors", () => {
    const source = readFileSync(
      join(process.cwd(), "components/calendar-admin/public-link-editor.tsx"),
      "utf8",
    );
    expect(source).toContain("AlertBanner");
    expect(source).not.toContain("bg-red-50");
  });
});
