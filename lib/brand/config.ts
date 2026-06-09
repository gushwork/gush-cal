import { DEFAULT_PRESET } from "@/lib/brand/default-preset";
import type { BrandConfig } from "@/lib/brand/types";

export type { BrandConfig };

export function getBrandConfig(): BrandConfig {
  return {
    appName: process.env.BRAND_APP_NAME?.trim() || DEFAULT_PRESET.appName,
    poweredBy: process.env.BRAND_POWERED_BY?.trim() || DEFAULT_PRESET.poweredBy,
    logoUrl: process.env.BRAND_LOGO_URL?.trim() || DEFAULT_PRESET.logoUrl,
    faviconUrl:
      process.env.BRAND_FAVICON_URL?.trim() || DEFAULT_PRESET.faviconUrl,
    primaryColor:
      process.env.BRAND_PRIMARY_COLOR?.trim() || DEFAULT_PRESET.primaryColor,
    accentColor:
      process.env.BRAND_ACCENT_COLOR?.trim() || DEFAULT_PRESET.accentColor,
    fontDisplay: process.env.BRAND_FONT_DISPLAY?.trim() || null,
  };
}
