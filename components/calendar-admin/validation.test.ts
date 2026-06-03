import { describe, expect, it } from "vitest";
import { validateDurations, validateMemberEmail } from "./validation";

describe("validateDurations", () => {
  it("accepts allowed durations", () => {
    expect(validateDurations([30, 60])).toBeNull();
  });

  it("rejects empty list", () => {
    expect(validateDurations([])).toMatch(/At least one/);
  });

  it("rejects invalid values", () => {
    expect(validateDurations([25])).toMatch(/Invalid durations/);
  });
});

describe("validateMemberEmail", () => {
  it("accepts workspace domain email", () => {
    process.env.ALLOWED_DOMAIN = "acme.com";
    expect(validateMemberEmail("alice@acme.com")).toBeNull();
  });

  it("rejects external email", () => {
    process.env.ALLOWED_DOMAIN = "acme.com";
    expect(validateMemberEmail("alice@gmail.com")).toMatch(/must be on/);
  });
});
