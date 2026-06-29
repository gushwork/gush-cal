import { existsSync } from "node:fs";
import { test } from "@playwright/test";
import { e2e } from "./fixtures";
import { e2eBaseUrl, isE2eServerReachable, serverSkipMessage } from "./server";

export { e2e, e2eBaseUrl, serverSkipMessage };

export const seedSkipMessage =
  "E2E skipped: manifest missing seed data. Run `npm run seed:e2e`.";

export const authStatePath = process.env.PLAYWRIGHT_STORAGE_STATE;
export const hasAuthFixture = !!authStatePath && existsSync(authStatePath);
export const authSkipMessage =
  "Authenticated E2E skipped: set PLAYWRIGHT_STORAGE_STATE (see E2E_SEED.md).";

/** Resolve once in a top-level beforeAll, then pass into skipNoServer. */
export async function detectServer(): Promise<boolean> {
  return isE2eServerReachable(e2eBaseUrl());
}

export function skipNoServer(available: boolean): void {
  test.skip(!available, serverSkipMessage);
}

export function skipNoSeed(): void {
  test.skip(!e2e.calendarSlug, seedSkipMessage);
}

export function skipNoAuth(): void {
  test.skip(!hasAuthFixture, authSkipMessage);
}

export function bearer(key: string): { Authorization: string } {
  return { Authorization: `Bearer ${key}` };
}

/** ISO from/to spanning the booking window for slots queries. */
export function bookingWindow(days = 14): { from: string; to: string } {
  const from = new Date().toISOString();
  const to = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  return { from, to };
}

/** Annotate which server a test targeted (visible in reports). */
export function annotateServer(testInfo: {
  annotations: { push: (a: { type: string; description: string }) => void };
}): void {
  testInfo.annotations.push({ type: "server", description: e2eBaseUrl() });
}
