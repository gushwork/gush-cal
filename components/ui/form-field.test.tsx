import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("SP-03 form fields", () => {
  it("exports FormField", async () => {
    const { FormField } = await import("./form-field");
    expect(FormField).toBeTypeOf("function");
  });

  it("Input supports aria-invalid from error prop", () => {
    const source = readFileSync(
      join(process.cwd(), "components/ui/input.tsx"),
      "utf8",
    );
    expect(source).toContain("aria-invalid");
    expect(source).toContain("border-destructive");
  });

  it("FormField wires aria-describedby", () => {
    const source = readFileSync(
      join(process.cwd(), "components/ui/form-field.tsx"),
      "utf8",
    );
    expect(source).toContain("aria-describedby");
    expect(source).toContain("aria-invalid");
  });
});
