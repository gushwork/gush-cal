import { describe, expect, it } from "vitest";
import {
  validateAssignmentWeight,
  validateCapOverride,
  validateDurations,
  validateMemberEmail,
} from "./validation";

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

  it("rejects missing or empty email", () => {
    process.env.ALLOWED_DOMAIN = "acme.com";
    expect(validateMemberEmail(undefined as unknown as string)).toMatch(
      /required/,
    );
    expect(validateMemberEmail("")).toMatch(/required/);
  });
});

describe("validateAssignmentWeight", () => {
  it("accepts undefined and in-range integers", () => {
    expect(validateAssignmentWeight(undefined)).toBeNull();
    expect(validateAssignmentWeight(100)).toBeNull();
  });

  it("rejects out-of-range or non-integer weights", () => {
    expect(validateAssignmentWeight(0)).toMatch(/between 1 and 1000/);
    expect(validateAssignmentWeight(1.5)).toMatch(/between 1 and 1000/);
  });
});

describe("validateCapOverride", () => {
  it("accepts null, undefined, and positive integers", () => {
    expect(validateCapOverride(null, "Max per day")).toBeNull();
    expect(validateCapOverride(undefined, "Max per day")).toBeNull();
    expect(validateCapOverride(5, "Max per day")).toBeNull();
  });

  it("rejects zero, negative, and non-integer values", () => {
    expect(validateCapOverride(0, "Max per day")).toMatch(/positive integer/);
    expect(validateCapOverride(-2, "Max per week")).toMatch(/positive integer/);
    expect(validateCapOverride(2.5, "Max per day")).toMatch(/positive integer/);
  });
});
