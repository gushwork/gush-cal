import { afterEach, describe, expect, it, vi } from "vitest";
import { buildManageLinks, manageLinksFromManageUrl } from "./links";

describe("manage links", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("builds absolute manage, reschedule and cancel URLs from APP_URL", () => {
    vi.stubEnv("AUTH_URL", "https://cal.example.com/");
    expect(buildManageLinks("tok")).toEqual({
      manageUrl: "https://cal.example.com/manage/tok",
      rescheduleUrl: "https://cal.example.com/manage/tok/reschedule",
      cancelUrl: "https://cal.example.com/manage/tok/cancel",
    });
  });

  it("derives links from a stored manage URL (trailing slash tolerated)", () => {
    expect(manageLinksFromManageUrl("/manage/abc/")).toEqual({
      manageUrl: "/manage/abc",
      rescheduleUrl: "/manage/abc/reschedule",
      cancelUrl: "/manage/abc/cancel",
    });
  });
});
