export const ALLOWED_DURATIONS = [15, 30, 45, 60, 90] as const;

export type AllowedDuration = (typeof ALLOWED_DURATIONS)[number];

/** Default dev server port (see package.json `dev` / `start` scripts). */
export const DEFAULT_APP_PORT = 4000;

export function getDefaultAppUrl(): string {
  const port = process.env.PORT ?? String(DEFAULT_APP_PORT);
  return `http://localhost:${port}`;
}
