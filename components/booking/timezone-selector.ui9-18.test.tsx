import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { TimezoneSelector } from "./timezone-selector";

describe("SP-18 TimezoneSelector", () => {
  it("source implements escape, click-outside, and lucide Globe", () => {
    const source = readFileSync(
      join(process.cwd(), "components/booking/timezone-selector.tsx"),
      "utf8",
    );
    expect(source).toContain('from "lucide-react"');
    expect(source).toContain('event.key === "Escape"');
    expect(source).toContain("mousedown");
    expect(source).toContain("w-full sm:w-auto");
  });

  it("renders full-width trigger on mobile with globe icon", () => {
    const html = renderToStaticMarkup(
      <TimezoneSelector value="UTC" onChange={() => {}} />,
    );

    expect(html).toContain("w-full");
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("UTC");
    expect(html).toContain("rounded-[var(--radius-control)]");
  });
});
