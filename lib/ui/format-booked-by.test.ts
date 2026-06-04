import { describe, expect, it } from "vitest";
import { formatBookedBy } from "./format-booked-by";

describe("formatBookedBy", () => {
  it("maps scheduler to Scheduler", () => {
    expect(formatBookedBy("scheduler")).toBe("Scheduler");
  });

  it("maps guest to Guest", () => {
    expect(formatBookedBy("guest")).toBe("Guest");
  });

  it("capitalizes unknown values", () => {
    expect(formatBookedBy("admin")).toBe("Admin");
  });
});
