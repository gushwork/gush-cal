import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ARBITRARY_SPACING =
  /\bgap-5\b|\bmb-7\b|\bp-5\b|\bmt-9\b|\bpy-7\b|\bpx-5\b|\bgap-7\b|\bmb-9\b|\bpt-7\b/;

function collectTsxFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      collectTsxFiles(path, out);
    } else if (entry.endsWith(".tsx")) {
      out.push(path);
    }
  }
  return out;
}

describe("SP-26 typography and spacing", () => {
  const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

  it("defines line-height, label, prose, and numeric utilities", () => {
    expect(css).toContain(".leading-display");
    expect(css).toContain(".leading-heading");
    expect(css).toContain(".leading-body");
    expect(css).toContain(".leading-ui");
    expect(css).toContain(".label-secondary");
    expect(css).toContain(".prose-measure");
    expect(css).toContain(".numeric");
    expect(css).toContain("tabular-nums");
  });

  it("applies label-secondary and numeric in calendar stats", () => {
    const source = readFileSync(
      join(process.cwd(), "components/calendar-admin/calendar-stats.tsx"),
      "utf8",
    );
    expect(source).toContain("label-secondary");
    expect(source).toContain("numeric");
  });

  it("form labels use label-secondary via Label component", () => {
    const source = readFileSync(
      join(process.cwd(), "components/ui/label.tsx"),
      "utf8",
    );
    expect(source).toContain("label-secondary");
  });

  it("has no arbitrary spacing violations in tsx", () => {
    const violations: string[] = [];
    for (const file of collectTsxFiles(process.cwd())) {
      const source = readFileSync(file, "utf8");
      if (ARBITRARY_SPACING.test(source)) {
        violations.push(file.replace(process.cwd() + "/", ""));
      }
    }
    expect(violations).toEqual([]);
  });
});
