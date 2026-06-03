import { describe, expect, it } from "vitest";
import {
  calendarAccessMessage,
  isGlobalCalendarConfigError,
} from "./calendar-access-message";

describe("calendarAccessMessage", () => {
  it("maps known error codes to actionable messages", () => {
    expect(calendarAccessMessage("DWD_NOT_AUTHORIZED")).toContain(
      "Domain-wide delegation",
    );
    expect(calendarAccessMessage("notFound")).toContain(
      "impersonated user cannot view",
    );
  });
});

describe("isGlobalCalendarConfigError", () => {
  it("detects when all members share the same auth error", () => {
    expect(
      isGlobalCalendarConfigError([
        "DWD_NOT_AUTHORIZED",
        "DWD_NOT_AUTHORIZED",
      ]),
    ).toBe(true);
  });

  it("returns false for per-member visibility errors", () => {
    expect(isGlobalCalendarConfigError(["notFound", "notFound"])).toBe(false);
  });
});
