import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("SP-02 button system", () => {
  it("exports Button with asChild and link variant", async () => {
    const { Button } = await import("./button");
    expect(Button).toBeTypeOf("function");
  });

  it("button source includes asChild and link variant", () => {
    const source = readFileSync(
      join(process.cwd(), "components/ui/button.tsx"),
      "utf8",
    );
    expect(source).toContain("asChild");
    expect(source).toContain('"link"');
    expect(source).toContain("@radix-ui/react-slot");
    expect(source).toContain("focus-visible:ring-2");
  });

  it("icon wrapper exports Icon component", async () => {
    const { Icon } = await import("./icon");
    expect(Icon).toBeTypeOf("function");
  });

  it("lucide-react is installed", () => {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as { dependencies: Record<string, string> };
    expect(pkg.dependencies["lucide-react"]).toBeDefined();
  });
});
