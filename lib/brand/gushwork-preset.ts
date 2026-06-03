export type BrandConfig = {
  appName: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  accentColor: string;
  fontDisplay: string | null;
};

export const GUSHWORK_PRESET: BrandConfig = {
  appName: "Gush Cal",
  logoUrl: "https://cdn.gushwork.ai/gush_new_logo.png",
  faviconUrl: "https://cdn.gushwork.ai/gush_fav.ico",
  primaryColor: "#0066FF",
  accentColor: "#0047AB",
  fontDisplay: null,
};

/** Mix a hex color toward white (0 = original, 1 = white). */
export function mixWithWhite(hex: string, whiteRatio: number): string {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const mix = (channel: number) =>
    Math.round(channel + (255 - channel) * whiteRatio);
  const toHex = (channel: number) => channel.toString(16).padStart(2, "0");
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}

export function deriveSoftVariants(primary: string, accent: string) {
  return {
    primarySoft: mixWithWhite(primary, 0.9),
    accentSoft: mixWithWhite(accent, 0.92),
  };
}
