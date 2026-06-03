import { describe, expect, it } from "vitest";
import {
  generateCalendarSlug,
  normalizeCalendarSlug,
  validateCalendarSlug,
} from "@/lib/db/slug";

describe("generateCalendarSlug", () => {
  it("generates url-safe slugs at least 16 characters", () => {
    const slug = generateCalendarSlug();
    expect(slug.length).toBeGreaterThanOrEqual(16);
    expect(slug).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe("normalizeCalendarSlug", () => {
  it("trims and lowercases", () => {
    expect(normalizeCalendarSlug("  Eng-Panel  ")).toBe("eng-panel");
  });
});

describe("validateCalendarSlug", () => {
  it("accepts valid custom slugs", () => {
    expect(validateCalendarSlug("eng-panel")).toBeNull();
    expect(validateCalendarSlug("sales2026")).toBeNull();
  });

  it("rejects too short slugs", () => {
    expect(validateCalendarSlug("ab")).toMatch(/3–64/);
  });

  it("rejects invalid characters", () => {
    expect(validateCalendarSlug("eng_panel")).toMatch(/lowercase/);
    expect(validateCalendarSlug("-eng")).toMatch(/lowercase/);
    expect(validateCalendarSlug("eng-")).toMatch(/lowercase/);
  });

  it("rejects reserved slugs", () => {
    expect(validateCalendarSlug("login")).toMatch(/reserved/);
    expect(validateCalendarSlug("book")).toMatch(/reserved/);
  });
});
