import { afterEach, describe, expect, it, vi } from "vitest";
import { getAdminEmails, isAppAdmin } from "./admin";

describe("App Admin allowlist", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to Punit when ADMIN_EMAILS is unset, case-insensitively", () => {
    vi.stubEnv("ADMIN_EMAILS", "");
    expect(isAppAdmin("Punit.pal@gushwork.ai")).toBe(true);
    expect(isAppAdmin("punit.pal@gushwork.ai ")).toBe(true);
    expect(isAppAdmin("someone@gushwork.ai")).toBe(false);
    expect(isAppAdmin(null)).toBe(false);
    expect(isAppAdmin(undefined)).toBe(false);
  });

  it("uses ADMIN_EMAILS when set", () => {
    vi.stubEnv("ADMIN_EMAILS", "Ops@gushwork.ai, lead@gushwork.ai");
    expect(getAdminEmails()).toEqual(["ops@gushwork.ai", "lead@gushwork.ai"]);
    expect(isAppAdmin("ops@gushwork.ai")).toBe(true);
    expect(isAppAdmin("punit.pal@gushwork.ai")).toBe(false);
  });
});
