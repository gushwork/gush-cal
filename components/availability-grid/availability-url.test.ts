import { describe, expect, it } from "vitest";
import {
  buildAvailabilitySearchParams,
  parseAvailabilitySearchParams,
  parseDateKey,
} from "./availability-url";

const TZ = "America/New_York";

describe("availability URL params", () => {
  it("parses valid date and view", () => {
    const result = parseAvailabilitySearchParams(
      new URLSearchParams("date=2026-06-11&view=week"),
      TZ,
    );

    expect(result.viewMode).toBe("week");
    expect(result.urlCorrection).toBeNull();
  });

  it("defaults when params are absent", () => {
    const result = parseAvailabilitySearchParams(new URLSearchParams(), TZ);

    expect(result.viewMode).toBe("day");
    expect(result.urlCorrection).toBeNull();
  });

  it("corrects invalid date and view", () => {
    const result = parseAvailabilitySearchParams(
      new URLSearchParams("date=not-a-date&view=month"),
      TZ,
    );

    expect(result.viewMode).toBe("day");
    expect(result.urlCorrection?.get("view")).toBe("day");
    expect(result.urlCorrection?.get("date")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("builds canonical search params", () => {
    const date = parseDateKey("2026-06-11");
    expect(date).not.toBeNull();

    const params = buildAvailabilitySearchParams(date!, "week", TZ);
    expect(params.get("date")).toBe("2026-06-11");
    expect(params.get("view")).toBe("week");
  });

  it("rejects invalid date keys", () => {
    expect(parseDateKey("2026-13-01")).toBeNull();
    expect(parseDateKey("06-11-2026")).toBeNull();
    expect(parseDateKey("2026-06-31")).toBeNull();
  });
});
