import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const BARE_EASING =
  /\bease-in-out\b|\bease-in\b|\bease-out\b|timing.*\blinear\b|transition[^;]*\bease[^-]/;

describe("SP-28 signature moments and animation", () => {
  const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

  it("defines signature keyframes and animation utilities", () => {
    expect(css).toContain("@keyframes fade-up");
    expect(css).toContain("@keyframes pop-in");
    expect(css).toContain(".animate-fade-up");
    expect(css).toContain(".animate-pop-in");
    expect(css).toContain(".animate-page-in");
    expect(css).toContain("var(--ease-expo)");
  });

  it("disables entry animations under prefers-reduced-motion", () => {
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toMatch(
      /\.animate-fade-up[\s\S]*\.animate-pop-in[\s\S]*animation: none/,
    );
  });

  it("has no bare easing in globals.css animations", () => {
    expect(css).not.toMatch(BARE_EASING);
  });

  it("booking success uses staggered reveal", () => {
    const source = readFileSync(
      join(process.cwd(), "components/booking/booking-success.tsx"),
      "utf8",
    );
    expect(source).toContain("animate-pop-in");
    expect(source).toContain("animate-fade-up");
    expect(source).toContain('animationDelay: "0ms"');
    expect(source).toContain('animationDelay: "80ms"');
    expect(source).toContain('animationDelay: "160ms"');
    expect(source).toContain('animationDelay: "240ms"');
    expect(source).not.toContain("animate-step-in");
  });

  it("login page uses staggered entry", () => {
    const source = readFileSync(
      join(process.cwd(), "app/(auth)/login/page.tsx"),
      "utf8",
    );
    expect(source).toContain("animate-fade-up");
    expect(source).toContain('animationDelay: "0ms"');
    expect(source).toContain('animationDelay: "80ms"');
    expect(source).toContain('animationDelay: "160ms"');
    expect(source).toContain('animationDelay: "240ms"');
    expect(source).toContain("leading-display");
  });

  it("admin shell main uses animate-page-in", () => {
    const source = readFileSync(
      join(process.cwd(), "components/brand/app-shell.tsx"),
      "utf8",
    );
    expect(source).toContain("animate-page-in");
  });
});
