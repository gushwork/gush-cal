import { describe, expect, it } from "vitest";
import { parseBookingPath, buildMemberPath, buildTeamPath } from "./paths";

describe("parseBookingPath", () => {
  it("parses calendar slug only", () => {
    expect(parseBookingPath(["acme"])).toEqual({ calendarSlug: "acme" });
  });

  it("parses team alias t", () => {
    expect(parseBookingPath(["acme", "t", "enterprise"])).toEqual({
      calendarSlug: "acme",
      teamSlug: "enterprise",
    });
  });

  it("parses member alias m and p", () => {
    expect(parseBookingPath(["acme", "m", "jane"])).toEqual({
      calendarSlug: "acme",
      memberSlug: "jane",
    });
    expect(parseBookingPath(["acme", "p", "jane"])).toEqual({
      calendarSlug: "acme",
      memberSlug: "jane",
    });
  });

  it("builds canonical paths", () => {
    expect(buildTeamPath("acme", "sales")).toBe("/book/acme/t/sales");
    expect(buildMemberPath("acme", "jane")).toBe("/book/acme/m/jane");
  });
});
