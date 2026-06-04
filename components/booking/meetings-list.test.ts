import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("SP-23 meetings list", () => {
  const listPath = join(process.cwd(), "components/booking/meetings-list.tsx");

  it("uses Dialog for cancel confirm instead of inline card", () => {
    const source = readFileSync(listPath, "utf8");
    expect(source).toContain("<Dialog");
    expect(source).toContain("Yes, cancel meeting");
    expect(source).toContain("Keep meeting");
    expect(source).not.toContain("border-primary/30 bg-primary-soft/40");
  });

  it("shows toast on cancel success", () => {
    const source = readFileSync(listPath, "utf8");
    expect(source).toContain('from "@/components/ui/toast"');
    expect(source).toContain("toast(");
    expect(source).toContain('variant: "success"');
  });

  it("empty state uses Button asChild Link as sole CTA", () => {
    const source = readFileSync(listPath, "utf8");
    expect(source).toContain("EmptyState");
    expect(source).toContain("Button asChild");
    expect(source).toContain("initialMeetings");
    expect(source).toContain("loadMeetings(initialMeetings.length > 0)");
  });
});
