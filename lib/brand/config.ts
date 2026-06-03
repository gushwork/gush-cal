import {
  GUSHWORK_PRESET,
  type BrandConfig,
} from "@/lib/brand/gushwork-preset";

export type { BrandConfig };

export function getBrandConfig(): BrandConfig {
  return {
    appName: process.env.BRAND_APP_NAME?.trim() || GUSHWORK_PRESET.appName,
    logoUrl: process.env.BRAND_LOGO_URL?.trim() || GUSHWORK_PRESET.logoUrl,
    faviconUrl:
      process.env.BRAND_FAVICON_URL?.trim() || GUSHWORK_PRESET.faviconUrl,
    primaryColor:
      process.env.BRAND_PRIMARY_COLOR?.trim() || GUSHWORK_PRESET.primaryColor,
    accentColor:
      process.env.BRAND_ACCENT_COLOR?.trim() || GUSHWORK_PRESET.accentColor,
    fontDisplay: process.env.BRAND_FONT_DISPLAY?.trim() || null,
  };
}
