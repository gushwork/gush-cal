import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("SP-12 members tab", () => {
  it("members page uses Button asChild and Users empty state", () => {
    const source = readFileSync(
      join(process.cwd(), "app/(admin)/calendars/[id]/members/page.tsx"),
      "utf8",
    );
    expect(source).toContain("Button asChild");
    expect(source).toContain("Users");
    expect(source).toContain("EmptyState");
  });

  it("member routes use form-wide max width", () => {
    for (const file of [
      "app/(admin)/calendars/[id]/members/new/page.tsx",
      "app/(admin)/calendars/[id]/members/[memberId]/page.tsx",
    ]) {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      expect(source).toContain("max-w-[var(--content-form-wide)]");
    }
  });
});
