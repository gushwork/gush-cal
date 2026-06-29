import { existsSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { e2e } from "./fixtures";
import { e2eBaseUrl, isE2eServerReachable, serverSkipMessage } from "./server";

const storageStatePath = process.env.PLAYWRIGHT_STORAGE_STATE;
const hasAuthFixture =
  !!storageStatePath && existsSync(storageStatePath);

let serverAvailable = false;

test.beforeAll(async () => {
  serverAvailable = await isE2eServerReachable(e2eBaseUrl());
});

test.describe("health", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    test.skip(!serverAvailable, serverSkipMessage);
    testInfo.annotations.push({ type: "server", description: e2eBaseUrl() });
  });

  test("GET /api/health reports database status", async ({ request }) => {
    const response = await request.get("/api/health");

    // DB reachable → 200 {ok:true}; unreachable → 503 {ok:false}. Either is a
    // valid health response; assert the body matches the status consistently.
    expect([200, 503]).toContain(response.status());
    const body = (await response.json()) as { ok?: unknown };
    expect(typeof body.ok).toBe("boolean");
    expect(body.ok).toBe(response.status() === 200);
  });
});

test.describe("DELETE /api/meetings/:id auth gate", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    test.skip(!serverAvailable, serverSkipMessage);
    testInfo.annotations.push({ type: "server", description: e2eBaseUrl() });
  });

  test("redirects unauthenticated cancel to login", async ({ request }) => {
    const path = `/api/meetings/${e2e.meetingId}`;
    const response = await request.delete(path, { maxRedirects: 0 });

    expect(response.status()).toBeGreaterThanOrEqual(300);
    expect(response.status()).toBeLessThan(400);
    expect(response.headers().location).toContain(
      `/login?callbackUrl=${encodeURIComponent(path)}`,
    );
  });
});

test.describe("DELETE /api/meetings/:id not found", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    test.skip(!serverAvailable, serverSkipMessage);
    test.skip(
      !hasAuthFixture,
      "needs PLAYWRIGHT_STORAGE_STATE (see E2E_SEED.md)",
    );
    testInfo.annotations.push({ type: "server", description: e2eBaseUrl() });
  });

  // ponytail: authenticated 404 only — unauth covered above
  test.use({ storageState: storageStatePath! });

  test("returns 404 for unknown meeting id", async ({ request }) => {
    const response = await request.delete(
      `/api/meetings/${e2e.invalidMeetingId}`,
    );

    expect(response.status()).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: "Meeting not found",
    });
  });
});

test.describe("admin meetings page auth gate", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    test.skip(!serverAvailable, serverSkipMessage);
    testInfo.annotations.push({ type: "server", description: e2eBaseUrl() });
  });

  test("redirects unauthenticated users to login", async ({ page }) => {
    const path = `/calendars/${e2e.calendarId}/meetings`;
    await page.goto(path);

    await expect(page).toHaveURL(
      `/login?callbackUrl=${encodeURIComponent(path)}`,
    );
  });
});
