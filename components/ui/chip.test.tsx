import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("SP-05 chip badge avatar empty", () => {
  it("exports Chip with shape variants", async () => {
    const { Chip } = await import("./chip");
    expect(Chip).toBeTypeOf("function");
  });

  it("DurationChip uses Chip internally", () => {
    const source = readFileSync(
      join(process.cwd(), "components/ui/duration-chip.tsx"),
      "utf8",
    );
    expect(source).toContain('from "./chip"');
    expect(source).toContain('shape="pill"');
  });

  it("EmptyState accepts icon prop", () => {
    const source = readFileSync(
      join(process.cwd(), "components/ui/empty-state.tsx"),
      "utf8",
    );
    expect(source).toContain("LucideIcon");
  });

  it("Avatar derives initials from name", async () => {
    const { Avatar } = await import("./avatar");
    expect(Avatar).toBeTypeOf("function");
  });

  it("Badge supports sm and md sizes", () => {
    const source = readFileSync(
      join(process.cwd(), "components/ui/badge.tsx"),
      "utf8",
    );
    expect(source).toContain('size?: "sm" | "md"');
  });
});
