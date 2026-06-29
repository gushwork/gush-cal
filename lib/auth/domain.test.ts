import { describe, expect, it } from "vitest";
import { getAllowedDomain, isAllowedEmail } from "@/lib/auth/domain";

describe("isAllowedEmail", () => {
  it("accepts emails on the allowed domain", () => {
    expect(isAllowedEmail("recruiter@acme.com", "acme.com")).toBe(true);
  });

  it("rejects emails on other domains", () => {
    expect(isAllowedEmail("user@gmail.com", "acme.com")).toBe(false);
  });

  it("rejects malformed emails", () => {
    expect(isAllowedEmail("not-an-email", "acme.com")).toBe(false);
  });

  it("rejects non-string email without throwing", () => {
    expect(isAllowedEmail(undefined as unknown as string, "acme.com")).toBe(
      false,
    );
  });

  it("normalizes domain with leading @", () => {
    expect(isAllowedEmail("recruiter@acme.com", "@acme.com")).toBe(true);
  });
});

describe("getAllowedDomain", () => {
  it("prefers ALLOWED_DOMAIN over GOOGLE_WORKSPACE_DOMAIN", () => {
    process.env.ALLOWED_DOMAIN = "primary.com";
    process.env.GOOGLE_WORKSPACE_DOMAIN = "secondary.com";
    expect(getAllowedDomain()).toBe("primary.com");
    delete process.env.ALLOWED_DOMAIN;
    delete process.env.GOOGLE_WORKSPACE_DOMAIN;
  });
});
