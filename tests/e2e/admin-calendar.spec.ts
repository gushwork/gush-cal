import { test, expect } from "@playwright/test";
import { e2e } from "./fixtures";
import { e2eBaseUrl, isE2eServerReachable, serverSkipMessage } from "./server";

const calendarId = e2e.calendarId;

let serverAvailable = false;

test.beforeAll(async () => {
  serverAvailable = await isE2eServerReachable(e2eBaseUrl());
});

test.describe("admin calendar auth guards", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    test.skip(!serverAvailable, serverSkipMessage);
    testInfo.annotations.push({ type: "server", description: e2eBaseUrl() });
  });

  test("settings page redirects unauthenticated users to login", async ({
    page,
  }) => {
    const path = `/calendars/${calendarId}/settings`;
    await page.goto(path);

    await expect(page).toHaveURL(
      `/login?callbackUrl=${encodeURIComponent(path)}`,
    );
  });

  test("members page redirects unauthenticated users to login", async ({
    page,
  }) => {
    const path = `/calendars/${calendarId}/members`;
    await page.goto(path);

    await expect(page).toHaveURL(
      `/login?callbackUrl=${encodeURIComponent(path)}`,
    );
  });

  test("calendar detail layout redirects unauthenticated users to login", async ({
    page,
  }) => {
    const path = `/calendars/${calendarId}`;
    await page.goto(path);

    await expect(page).toHaveURL(
      `/login?callbackUrl=${encodeURIComponent(path)}`,
    );
  });
});

test.describe("admin calendar API auth guards", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    test.skip(!serverAvailable, serverSkipMessage);
    testInfo.annotations.push({ type: "server", description: e2eBaseUrl() });
  });

  for (const path of [
    "/api/calendars",
    `/api/calendars/${calendarId}`,
    `/api/calendars/${calendarId}/settings`,
    `/api/calendars/${calendarId}/members`,
  ]) {
    test(`${path} redirects unauthenticated requests to login`, async ({
      request,
    }) => {
      const response = await request.get(path, { maxRedirects: 0 });

      expect(response.status()).toBeGreaterThanOrEqual(300);
      expect(response.status()).toBeLessThan(400);
      expect(response.headers().location).toContain(
        `/login?callbackUrl=${encodeURIComponent(path)}`,
      );
    });
  }
});
