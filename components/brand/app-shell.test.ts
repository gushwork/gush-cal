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

  it("public shell links to the GitHub repo", () => {
    const source = readFileSync(
      join(process.cwd(), "components/brand/app-shell.tsx"),
      "utf8",
    );
    expect(source).toContain("GITHUB_REPO_URL");
    expect(source).toContain("Like this? Star the repo");
    expect(source).toContain('aria-label="Star us on GitHub"');
    expect(source).toContain('rel="noopener noreferrer"');
  });
});
