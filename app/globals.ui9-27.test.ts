import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("SP-27 micro-interaction craft", () => {
  const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

  it("defines interaction utilities in globals.css", () => {
    expect(css).toContain(".interactive-lift");
    expect(css).toContain(".interactive-row");
    expect(css).toContain(".btn-press");
    expect(css).toContain(".focus-ring");
    expect(css).toContain(".scroll-shadow-top");
    expect(css).toContain("var(--ease-expo)");
  });

  it("button uses btn-press", () => {
    const source = readFileSync(
      join(process.cwd(), "components/ui/button.tsx"),
      "utf8",
    );
    expect(source).toContain("btn-press");
  });

  it("input and textarea use focus-ring", () => {
    const input = readFileSync(
      join(process.cwd(), "components/ui/input.tsx"),
      "utf8",
    );
    const textarea = readFileSync(
      join(process.cwd(), "components/ui/textarea.tsx"),
      "utf8",
    );
    expect(input).toContain("focus-ring");
    expect(textarea).toContain("focus-ring");
    expect(input).not.toContain("focus:ring-2");
    expect(textarea).not.toContain("focus:ring-2");
  });

  it("admin shell wires scroll shadow header", () => {
    const shell = readFileSync(
      join(process.cwd(), "components/brand/app-shell.tsx"),
      "utf8",
    );
    const header = readFileSync(
      join(process.cwd(), "components/brand/admin-shell-header.tsx"),
      "utf8",
    );
    expect(shell).toContain("AdminShellHeader");
    expect(header).toContain("scroll-shadow-top");
    expect(header).toContain("data-scrolled");
    expect(header).toContain("toggleAttribute");
  });

  it("meetings table rows use interactive-row", () => {
    const source = readFileSync(
      join(process.cwd(), "components/booking/meetings-table.tsx"),
      "utf8",
    );
    expect(source).toContain("interactive-row");
  });
});
