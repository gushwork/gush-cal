import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("SP-04 AlertBanner and Toast", () => {
  it("exports AlertBanner with semantic variants", async () => {
    const { AlertBanner } = await import("./alert-banner");
    expect(AlertBanner).toBeTypeOf("function");
  });

  it("AlertBanner uses design tokens not raw red backgrounds", () => {
    const source = readFileSync(
      join(process.cwd(), "components/ui/alert-banner.tsx"),
      "utf8",
    );
    expect(source).toContain("gw-red-100");
    expect(source).toContain('role="alert"');
    expect(source).not.toContain("bg-red-50");
  });

  it("exports toast helper backed by sonner", async () => {
    const { toast, useToast } = await import("./toast");
    expect(toast).toBeTypeOf("function");
    expect(useToast).toBeTypeOf("function");
  });

  it("root layout mounts AppToaster", () => {
    const layoutSource = readFileSync(
      join(process.cwd(), "app/layout.tsx"),
      "utf8",
    );
    const toasterSource = readFileSync(
      join(process.cwd(), "components/ui/toaster.tsx"),
      "utf8",
    );
    expect(layoutSource).toContain("AppToaster");
    expect(toasterSource).toContain('position="bottom-right"');
    expect(toasterSource).toContain("sonner");
  });

  it("globals do not override sonner fixed positioning", () => {
    const globalsSource = readFileSync(
      join(process.cwd(), "app/globals.css"),
      "utf8",
    );
    expect(globalsSource).toContain(":not([data-sonner-toaster])");
  });
});
