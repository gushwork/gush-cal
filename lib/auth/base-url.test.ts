import { afterEach, describe, expect, it } from "vitest";
import { applyAuthUrlEnvDefaults, getAuthBaseUrl } from "./base-url";

const env = process.env;

describe("getAuthBaseUrl", () => {
  afterEach(() => {
    process.env = { ...env };
  });

  it("prefers AUTH_URL over APP_URL", () => {
    process.env.AUTH_URL = "https://auth.example.com/";
    process.env.APP_URL = "https://app.example.com";
    expect(getAuthBaseUrl()).toBe("https://auth.example.com");
  });

  it("falls back to APP_URL and strips trailing slash", () => {
    delete process.env.AUTH_URL;
    process.env.APP_URL = "https://gush-cal.fly.dev/";
    expect(getAuthBaseUrl()).toBe("https://gush-cal.fly.dev");
  });
});

describe("applyAuthUrlEnvDefaults", () => {
  afterEach(() => {
    process.env = { ...env };
  });

  it("sets AUTH_URL from APP_URL when AUTH_URL is missing", () => {
    delete process.env.AUTH_URL;
    process.env.APP_URL = "https://gush-cal.fly.dev";
    applyAuthUrlEnvDefaults();
    expect(process.env.AUTH_URL).toBe("https://gush-cal.fly.dev");
  });

  it("does not override an existing AUTH_URL", () => {
    process.env.AUTH_URL = "https://custom.example.com";
    process.env.APP_URL = "https://gush-cal.fly.dev";
    applyAuthUrlEnvDefaults();
    expect(process.env.AUTH_URL).toBe("https://custom.example.com");
  });
});
