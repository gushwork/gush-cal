import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("SP-23 meetings page", () => {
  const pagePath = join(
    process.cwd(),
    "app/(admin)/calendars/[id]/meetings/page.tsx",
  );

  it("uses PageHeader.actions with Button asChild Link", () => {
    const source = readFileSync(pagePath, "utf8");
    expect(source).toContain("PageHeader");
    expect(source).toContain("actions={");
    expect(source).toContain("Button asChild");
    expect(source).toContain("Link");
    expect(source).not.toContain('<form action=');
  });

  it("stacks mobile CTA and passes server-fetched initialMeetings", () => {
    const source = readFileSync(pagePath, "utf8");
    expect(source).toContain("w-full sm:w-auto");
    expect(source).toContain("flex-col");
    expect(source).toContain("initialMeetings");
    expect(source).toContain("listMeetingsForCalendar");
    expect(source).toContain("hasMeetings");
  });
});
