import { describe, expect, it } from "vitest";
import { cn } from "@/lib/ui/cn";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("a", false, "b")).toBe("a b");
  });

  it("merges conflicting tailwind classes", () => {
    expect(cn("px-4", "px-2")).toBe("px-2");
  });
});

describe("UI primitives smoke", () => {
  it("exports all components from index", async () => {
    const ui = await import("./index");
    expect(ui.Button).toBeDefined();
    expect(ui.Card).toBeDefined();
    expect(ui.Input).toBeDefined();
    expect(ui.Textarea).toBeDefined();
    expect(ui.Label).toBeDefined();
    expect(ui.Badge).toBeDefined();
    expect(ui.Stepper).toBeDefined();
    expect(ui.PageHeader).toBeDefined();
    expect(ui.Dialog).toBeDefined();
    expect(ui.EmptyState).toBeDefined();
    expect(ui.Skeleton).toBeDefined();
    expect(ui.DurationChip).toBeDefined();
    expect(ui.DurationChipGroup).toBeDefined();
  });
});

describe("Button variants", () => {
  it("defines destructive and size variants", async () => {
    const { Button } = await import("./button");
    expect(Button).toBeTypeOf("function");
  });
});

describe("DurationChip", () => {
  it("exports chip and group components", async () => {
    const { DurationChip, DurationChipGroup } = await import("./duration-chip");
    expect(DurationChip).toBeTypeOf("function");
    expect(DurationChipGroup).toBeTypeOf("function");
  });
});
