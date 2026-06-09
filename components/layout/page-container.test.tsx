import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PageContainer } from "./page-container";

describe("SP-01 tokens and layout", () => {
  it("PageContainer default variant uses content-admin token", () => {
    expect(PageContainer({ children: null }).props.className).toContain(
      "max-w-[var(--content-admin)]",
    );
  });

  it("PageContainer supports form-wide variant", () => {
    expect(
      PageContainer({ variant: "form-wide", children: null }).props.className,
    ).toContain("max-w-[var(--content-form-wide)]");
  });

  it("PageContainer booking variant uses content-booking token", () => {
    expect(
      PageContainer({ variant: "booking", children: null }).props.className,
    ).toContain("max-w-[var(--content-booking)]");
  });

  it("globals.css defines content and typography tokens", () => {
    const css = readFileSync(
      join(process.cwd(), "app/globals.css"),
      "utf8",
    );
    expect(css).toContain("--content-admin:");
    expect(css).toContain("--content-booking:");
    expect(css).toContain("--content-form:");
    expect(css).toContain("--content-form-wide:");
    expect(css).toContain("--shadow-sm:");
    expect(css).toContain("--shadow-md:");
    expect(css).toContain("--text-body-size:");
    expect(css).toContain(".text-heading");
    expect(css).toContain(".text-caption");
    expect(css).toContain(".animate-page-in");
  });

  it("PageHeader does not use sm:text-3xl override", async () => {
    const source = readFileSync(
      join(process.cwd(), "components/ui/page-header.tsx"),
      "utf8",
    );
    expect(source).not.toContain("sm:text-3xl");
  });
});
