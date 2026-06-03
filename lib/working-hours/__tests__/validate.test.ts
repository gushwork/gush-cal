import { describe, expect, it } from "vitest";
import {
  validateMemberHoursAndTimezone,
  validateTimezone,
  validateWorkingHours,
} from "@/lib/working-hours/validate";

describe("validateTimezone", () => {
  it("accepts valid IANA timezone", () => {
    expect(validateTimezone("America/New_York")).toBeNull();
  });

  it("rejects invalid timezone", () => {
    expect(validateTimezone("Not/A/Zone")).toMatch(/Invalid timezone/);
  });
});

describe("validateWorkingHours", () => {
  it("rejects overlapping blocks on same day", () => {
    const error = validateWorkingHours([
      { day: 1, start: 540, end: 720 },
      { day: 1, start: 660, end: 900 },
    ]);
    expect(error).toMatch(/Overlapping/);
  });

  it("accepts non-overlapping blocks", () => {
    expect(
      validateWorkingHours([
        { day: 1, start: 540, end: 720 },
        { day: 1, start: 780, end: 1020 },
      ]),
    ).toBeNull();
  });
});

describe("validateMemberHoursAndTimezone", () => {
  it("requires timezone when override present", () => {
    expect(
      validateMemberHoursAndTimezone([{ day: 1, start: 540, end: 1020 }], null),
    ).toMatch(/Member timezone required/);
  });

  it("rejects timezone when using calendar defaults", () => {
    expect(
      validateMemberHoursAndTimezone(null, "America/New_York"),
    ).toMatch(/must be empty/);
  });
});
