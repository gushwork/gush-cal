import { afterEach, describe, expect, it } from "vitest";
import { getBrandConfig } from "@/lib/brand/config";
import { GUSHWORK_PRESET, deriveSoftVariants } from "@/lib/brand/gushwork-preset";

const ENV_KEYS = [
  "BRAND_APP_NAME",
  "BRAND_LOGO_URL",
  "BRAND_FAVICON_URL",
  "BRAND_PRIMARY_COLOR",
  "BRAND_ACCENT_COLOR",
  "BRAND_FONT_DISPLAY",
] as const;

afterEach(() => {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
});

describe("getBrandConfig", () => {
  it("returns Gushwork defaults when env is unset", () => {
    expect(getBrandConfig()).toEqual(GUSHWORK_PRESET);
  });

  it("reads env overrides", () => {
    process.env.BRAND_APP_NAME = "Acme Scheduling";
    process.env.BRAND_LOGO_URL = "/brand/acme.svg";
    process.env.BRAND_FAVICON_URL = "/acme.ico";
    process.env.BRAND_PRIMARY_COLOR = "#FF0000";
    process.env.BRAND_ACCENT_COLOR = "#AA0000";
    process.env.BRAND_FONT_DISPLAY = "Inter";

    expect(getBrandConfig()).toEqual({
      appName: "Acme Scheduling",
      logoUrl: "/brand/acme.svg",
      faviconUrl: "/acme.ico",
      primaryColor: "#FF0000",
      accentColor: "#AA0000",
      fontDisplay: "Inter",
    });
  });
});

describe("deriveSoftVariants", () => {
  it("lightens primary and accent toward white", () => {
    const { primarySoft, accentSoft } = deriveSoftVariants("#0066FF", "#0047AB");
    expect(primarySoft).toMatch(/^#[0-9a-f]{6}$/i);
    expect(accentSoft).toMatch(/^#[0-9a-f]{6}$/i);
    expect(primarySoft).not.toBe("#0066FF");
  });
});
