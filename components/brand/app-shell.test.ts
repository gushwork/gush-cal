import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("SP-08 admin shell", () => {
  it("uses content-admin width and skip link", () => {
    const source = readFileSync(
      join(process.cwd(), "components/brand/app-shell.tsx"),
      "utf8",
    );
    expect(source).toContain("max-w-[var(--content-admin)]");
    expect(source).toContain("Skip to main content");
    expect(source).toContain("UserMenu");
    expect(source).toContain("AdminShellHeader");
  });
});
