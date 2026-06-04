import { describe, expect, it } from "vitest";
import { validateMinNoticeHours } from "./validate-min-notice-hours";

describe("validateMinNoticeHours", () => {
  it("accepts 0 and 720", () => {
    expect(validateMinNoticeHours(0)).toBeNull();
    expect(validateMinNoticeHours(720)).toBeNull();
  });

  it("rejects non-integers and out of range", () => {
    expect(validateMinNoticeHours(1.5)).toMatch(/whole number/);
    expect(validateMinNoticeHours(-1)).toMatch(/between 0 and 720/);
    expect(validateMinNoticeHours(721)).toMatch(/between 0 and 720/);
  });
});
