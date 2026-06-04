import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("SP-09 public shell and 404", () => {
  it("uses Gushwork CDN brand assets in preset", () => {
    const source = readFileSync(
      join(process.cwd(), "lib/brand/gushwork-preset.ts"),
      "utf8",
    );
    expect(source).toContain("https://cdn.gushwork.ai/gush_new_logo.png");
    expect(source).toContain("https://cdn.gushwork.ai/gush_fav.ico");
    expect(source).toContain("Gush Cal");
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
