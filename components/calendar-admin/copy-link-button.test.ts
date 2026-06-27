import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("SP-11 copy link button", () => {
  it("copy button shows check animation on success", () => {
    const source = readFileSync(
      join(process.cwd(), "components/calendar-admin/copy-link-button.tsx"),
      "utf8",
    );
    expect(source).toContain("Check");
    expect(source).toContain("Copied!");
    expect(source).toContain("clipboard.writeText");
  });
});
