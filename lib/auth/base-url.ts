/** Canonical site URL for Auth.js (OAuth redirects, session cookies). */
export function getAuthBaseUrl(): string | undefined {
  const raw = process.env.AUTH_URL ?? process.env.APP_URL;
  if (!raw) {
    return undefined;
  }
  return raw.replace(/\/$/, "");
}

/**
 * Auth.js uses AUTH_URL for all action URLs. On Fly, the request Host is often
 * the container bind address (0.0.0.0:4000) unless AUTH_URL is set explicitly.
 */
export function applyAuthUrlEnvDefaults(): void {
  if (process.env.AUTH_URL) {
    return;
  }
  const base = getAuthBaseUrl();
  if (base) {
    process.env.AUTH_URL = base;
  }
}
