import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("SP-09 public shell and 404", () => {
  it("uses local brand assets", () => {
    const source = readFileSync(
      join(process.cwd(), "lib/brand/gushwork-preset.ts"),
      "utf8",
    );
    expect(source).toContain("/brand/logo.svg");
    expect(source).not.toContain("cdn.gushwork.ai");
  });

  it("authed not-found wraps admin shell", () => {
    const source = readFileSync(
      join(process.cwd(), "app/not-found.tsx"),
      "utf8",
    );
    expect(source).toContain('variant="admin"');
    expect(source).toContain("auth()");
  });

  it("book not-found uses safe CTA", () => {
    const source = readFileSync(
      join(process.cwd(), "app/book/not-found.tsx"),
      "utf8",
    );
    expect(source).toContain('href="/login"');
    expect(source).not.toContain('href="/"');
  });
});
