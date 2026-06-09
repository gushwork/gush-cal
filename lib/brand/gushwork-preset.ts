import { deriveSoftVariants, mixWithWhite } from "@/lib/brand/color-utils";
import type { BrandConfig } from "@/lib/brand/types";

export type { BrandConfig };

export const GUSHWORK_PRESET: BrandConfig = {
  appName: "Gush Cal",
  logoUrl: "https://cdn.gushwork.ai/v2/gush_new_logo.svg",
  faviconUrl:
    "https://cdn.prod.website-files.com/65c292289fb0ea1ff3a84bd3/6807f0d918342111b78873bd_gushwork-fav-con-32X32px.svg",
  primaryColor: "#0070FF",
  accentColor: "#0061e0",
  fontDisplay: null,
  poweredBy: "Gushwork AI",
};

export { deriveSoftVariants, mixWithWhite };
