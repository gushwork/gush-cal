import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("SP-07 login page", () => {
  it("uses auth-minimal shell and single H1", () => {
    const source = readFileSync(
      join(process.cwd(), "app/(auth)/login/page.tsx"),
      "utf8",
    );
    expect(source).toContain('variant="auth-minimal"');
    expect(source).toContain("AlertBanner");
    expect(source).toContain("lucide-react");
    expect(source).not.toContain("lg:flex-row");
  });
});
