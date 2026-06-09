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
    primarySoft: mixWithWhite(primary, 0.92),
    accentSoft: mixWithWhite(accent, 0.9),
  };
}
