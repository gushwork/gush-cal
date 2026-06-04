import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("SP-06 dialog and formatBookedBy", () => {
  it("exports Dialog component", async () => {
    const { Dialog } = await import("./dialog");
    expect(Dialog).toBeTypeOf("function");
  });

  it("Dialog uses radix focus management primitives", () => {
    const source = readFileSync(
      join(process.cwd(), "components/ui/dialog.tsx"),
      "utf8",
    );
    expect(source).toContain("@radix-ui/react-dialog");
    expect(source).toContain("onCloseAutoFocus");
  });
});
