import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("SP-12 members tab", () => {
  it("members tab uses Button asChild and Users empty state", () => {
    const source = readFileSync(
      join(process.cwd(), "app/(admin)/calendars/[id]/page.tsx"),
      "utf8",
    );
    const membersSection = source.slice(
      source.indexOf('{tab === "members"'),
      source.indexOf('{tab === "settings"'),
    );
    expect(membersSection).toContain("Button asChild");
    expect(membersSection).toContain("Users");
    expect(membersSection).toContain("EmptyState");
  });

  it("member routes use form-wide container", () => {
    for (const file of [
      "app/(admin)/calendars/[id]/members/new/page.tsx",
      "app/(admin)/calendars/[id]/members/[memberId]/page.tsx",
    ]) {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      expect(source).toContain('variant="form-wide"');
    }
  });
});
